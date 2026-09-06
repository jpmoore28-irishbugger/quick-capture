(() => {
  "use strict";

  const STORAGE_KEY = "quick-capture:items";

  /** @type {{id:string,text:string,tags:string[],done:boolean,createdAt:number}[]} */
  let items = load();
  let view = "today"; // 'today' | 'all'
  let activeTag = null;
  let focusedId = null;

  const form = document.getElementById("capture-form");
  const input = document.getElementById("capture-input");
  const list = document.getElementById("item-list");
  const tagBar = document.getElementById("tag-bar");
  const emptyState = document.getElementById("empty-state");
  const viewBtns = document.querySelectorAll(".view-btn");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable; fail silently */
    }
  }

  function extractTags(text) {
    const matches = text.match(/#[\w-]+/g) || [];
    return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
  }

  function isToday(ts) {
    const d = new Date(ts);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function renderText(text) {
    return escapeHtml(text).replace(/#([\w-]+)/g, '<span class="tag">#$1</span>');
  }

  function addItem(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      text: trimmed,
      tags: extractTags(trimmed),
      done: false,
      createdAt: Date.now(),
    };
    items.unshift(item);
    save();
    render();
  }

  function toggleDone(id) {
    const item = items.find((i) => i.id === id);
    if (item) {
      item.done = !item.done;
      save();
      render();
    }
  }

  function deleteItem(id) {
    items = items.filter((i) => i.id !== id);
    save();
    render();
  }

  function editItem(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return; // ignore empty edits rather than deleting the item
    const item = items.find((i) => i.id === id);
    if (item) {
      item.text = trimmed;
      item.tags = extractTags(trimmed);
      save();
    }
    render();
  }

  function moveItem(draggedId, targetId, placeBefore) {
    if (draggedId === targetId) return;
    const draggedIdx = items.findIndex((i) => i.id === draggedId);
    if (draggedIdx === -1) return;
    const [dragged] = items.splice(draggedIdx, 1);
    let targetIdx = items.findIndex((i) => i.id === targetId);
    if (targetIdx === -1) {
      items.splice(draggedIdx, 0, dragged); // target vanished; put it back
      return;
    }
    items.splice(placeBefore ? targetIdx : targetIdx + 1, 0, dragged);
    save();
    render();
  }

  function visibleItems() {
    let out = items;
    if (view === "today") out = out.filter((i) => isToday(i.createdAt) || !i.done);
    if (activeTag) out = out.filter((i) => i.tags.includes(activeTag));
    return out;
  }

  function allTags() {
    const set = new Set();
    items.forEach((i) => i.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }

  function renderTagBar() {
    const tags = allTags();
    tagBar.innerHTML = "";
    tags.forEach((tag) => {
      const chip = document.createElement("button");
      chip.className = "tag-chip" + (activeTag === tag ? " active" : "");
      chip.textContent = "#" + tag;
      chip.addEventListener("click", () => {
        activeTag = activeTag === tag ? null : tag;
        render();
      });
      tagBar.appendChild(chip);
    });
  }

  function render() {
    renderTagBar();
    const visible = visibleItems();
    list.innerHTML = "";

    if (visible.length === 0) {
      emptyState.hidden = false;
      emptyState.textContent =
        view === "today" && items.length > 0
          ? "All caught up for today."
          : "Nothing here yet. Type above and hit Enter.";
    } else {
      emptyState.hidden = true;
    }

    visible.forEach((item) => {
      const li = document.createElement("li");
      li.className = "item" + (item.done ? " done" : "") + (item.id === focusedId ? " focused" : "");
      li.dataset.id = item.id;
      li.tabIndex = 0;
      li.draggable = true;

      li.innerHTML = `
        <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
        <div class="check"></div>
        <div class="body">
          <div class="text">${renderText(item.text)}</div>
          <div class="meta">${fmtTime(item.createdAt)}</div>
        </div>
        <button class="del" title="Delete" aria-label="Delete">×</button>
      `;

      li.addEventListener("click", (e) => {
        if (e.target.closest(".del") || e.target.closest(".drag-handle")) return;
        if (li.querySelector(".edit-input")) return; // mid-edit
        toggleDone(item.id);
      });
      li.querySelector(".del").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteItem(item.id);
      });
      li.querySelector(".text").addEventListener("dblclick", (e) => {
        e.stopPropagation();
        beginEdit(li, item);
      });
      li.addEventListener("focus", () => {
        focusedId = item.id;
      });

      // --- drag to reorder ---
      li.addEventListener("dragstart", (e) => {
        if (!e.target.closest(".drag-handle")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.id);
        li.classList.add("dragging");
      });
      li.addEventListener("dragend", () => {
        li.classList.remove("dragging");
        list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
      });
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        li.classList.add("drag-over");
      });
      li.addEventListener("dragleave", () => {
        li.classList.remove("drag-over");
      });
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        li.classList.remove("drag-over");
        const draggedId = e.dataTransfer.getData("text/plain");
        const rect = li.getBoundingClientRect();
        const placeBefore = e.clientY < rect.top + rect.height / 2;
        moveItem(draggedId, item.id, placeBefore);
      });

      list.appendChild(li);
    });
  }

  function beginEdit(li, item) {
    const textEl = li.querySelector(".text");
    if (!textEl) return;
    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "edit-input";
    editInput.value = item.text;
    textEl.replaceWith(editInput);
    editInput.focus();
    editInput.select();

    let done = false;
    const finish = (shouldSave) => {
      if (done) return;
      done = true;
      if (shouldSave) editItem(item.id, editInput.value);
      else render();
    };

    editInput.addEventListener("click", (e) => e.stopPropagation());
    editInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });
    editInput.addEventListener("blur", () => finish(true));
  }

  // --- form submit ---
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addItem(input.value);
    input.value = "";
  });

  // Explicit Enter handling (belt-and-suspenders): some environments don't
  // reliably fire native implicit form submission on Enter within a text
  // input, so drive it directly via requestSubmit to guarantee one clean
  // submit event (avoids double-handling and IME composition issues).
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    }
  });

  // --- export / import ---
  exportBtn.addEventListener("click", () => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `quick-capture-${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("expected a JSON array of items");

      const imported = parsed
        .filter((x) => x && typeof x.text === "string" && x.text.trim())
        .map((x) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          text: x.text,
          tags: Array.isArray(x.tags) ? x.tags : extractTags(x.text),
          done: !!x.done,
          createdAt: typeof x.createdAt === "number" ? x.createdAt : Date.now(),
        }));

      if (imported.length === 0) {
        alert("No valid items found in that file.");
        return;
      }
      items = imported.concat(items);
      save();
      render();
    } catch (err) {
      alert("Could not import that file: " + err.message);
    } finally {
      importFile.value = "";
    }
  });

  // --- view switching ---
  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      view = btn.dataset.view;
      render();
    });
  });

  // --- keyboard shortcuts ---
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA";

    if (e.key === "/" && !inInput) {
      e.preventDefault();
      input.focus();
      return;
    }

    if (e.key === "Escape" && document.activeElement === input) {
      input.blur();
      return;
    }

    if (inInput) return;

    const visible = visibleItems();
    const idx = visible.findIndex((i) => i.id === focusedId);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = visible[Math.min(idx + 1, visible.length - 1)] || visible[0];
      if (next) {
        focusedId = next.id;
        render();
        list.querySelector(`[data-id="${next.id}"]`)?.focus();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = visible[Math.max(idx - 1, 0)] || visible[0];
      if (prev) {
        focusedId = prev.id;
        render();
        list.querySelector(`[data-id="${prev.id}"]`)?.focus();
      }
    } else if (e.key === "Enter" && focusedId) {
      e.preventDefault();
      toggleDone(focusedId);
    } else if (e.key === "e" && focusedId) {
      e.preventDefault();
      const item = items.find((i) => i.id === focusedId);
      const li = list.querySelector(`[data-id="${focusedId}"]`);
      if (item && li) beginEdit(li, item);
    } else if (e.key === "Backspace" && focusedId) {
      e.preventDefault();
      const currentIdx = idx;
      deleteItem(focusedId);
      const newVisible = visibleItems();
      const nextFocus = newVisible[Math.min(currentIdx, newVisible.length - 1)];
      focusedId = nextFocus ? nextFocus.id : null;
      render();
      if (nextFocus) list.querySelector(`[data-id="${nextFocus.id}"]`)?.focus();
    }
  });

  render();
})();
