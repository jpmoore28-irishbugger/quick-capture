(() => {
  "use strict";

  const ENTRIES_KEY = "drink-tracker:entries";
  const LIMIT_KEY = "drink-tracker:weeklyLimit";
  const DEFAULT_LIMIT = 7;

  /** @type {{id:string, ts:number}[]} */
  let entries = loadEntries();
  let weeklyLimit = loadLimit();
  let view = "week"; // 'week' | 'all'
  let editingLimit = false;

  const limitBadge = document.getElementById("limit-badge");
  const weekCountEl = document.getElementById("week-count");
  const weekLimitEl = document.getElementById("week-limit");
  const progressFill = document.getElementById("progress-fill");
  const progressBar = progressFill.parentElement;
  const progressMessage = document.getElementById("progress-message");
  const logBtn = document.getElementById("log-btn");
  const undoBtn = document.getElementById("undo-btn");
  const viewBtns = document.querySelectorAll(".view-btn");
  const logList = document.getElementById("log-list");
  const emptyState = document.getElementById("empty-state");
  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importFile = document.getElementById("import-file");

  function loadEntries() {
    try {
      const raw = localStorage.getItem(ENTRIES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    } catch {
      /* storage unavailable; fail silently */
    }
  }

  function loadLimit() {
    try {
      const raw = localStorage.getItem(LIMIT_KEY);
      const n = raw ? parseInt(raw, 10) : DEFAULT_LIMIT;
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_LIMIT;
    } catch {
      return DEFAULT_LIMIT;
    }
  }

  function saveLimit() {
    try {
      localStorage.setItem(LIMIT_KEY, String(weeklyLimit));
    } catch {
      /* storage unavailable; fail silently */
    }
  }

  // --- week math (weeks start Monday) ---
  function startOfWeek(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 = Sun ... 6 = Sat
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }

  function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function currentWeekEntries() {
    const start = startOfWeek(Date.now());
    const end = start + 7 * 24 * 60 * 60 * 1000;
    return entries.filter((e) => e.ts >= start && e.ts < end);
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function fmtDay(ts) {
    const day = startOfDay(ts);
    const today = startOfDay(Date.now());
    const yesterday = today - 24 * 60 * 60 * 1000;
    if (day === today) return "Today";
    if (day === yesterday) return "Yesterday";
    return new Date(ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  }

  function fmtWeekRange(startTs) {
    const start = new Date(startTs);
    const end = new Date(startTs + 6 * 24 * 60 * 60 * 1000);
    const opts = { month: "short", day: "numeric" };
    return `Week of ${start.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], opts)}`;
  }

  // --- actions ---
  function logDrink() {
    entries.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), ts: Date.now() });
    saveEntries();
    render();
  }

  function undoLast() {
    if (entries.length === 0) return;
    let latestIdx = 0;
    entries.forEach((e, i) => { if (e.ts > entries[latestIdx].ts) latestIdx = i; });
    entries.splice(latestIdx, 1);
    saveEntries();
    render();
  }

  function deleteEntry(id) {
    entries = entries.filter((e) => e.id !== id);
    saveEntries();
    render();
  }

  function setLimit(n) {
    if (Number.isFinite(n) && n > 0) {
      weeklyLimit = Math.round(n);
      saveLimit();
    }
    render();
  }

  // --- rendering ---
  function renderProgress() {
    const weekEntries = currentWeekEntries();
    const count = weekEntries.length;
    const ratio = count / weeklyLimit;

    weekCountEl.textContent = String(count);
    weekLimitEl.textContent = String(weeklyLimit);
    if (!editingLimit) {
      limitBadge.innerHTML = `Limit: <span id="limit-value">${weeklyLimit}</span>/wk`;
    }

    progressFill.style.width = `${Math.min(100, ratio * 100)}%`;
    progressFill.classList.remove("warn", "over");
    progressBar.classList.remove("warn", "over");
    progressMessage.classList.remove("warn", "over");

    let cls = "";
    if (ratio >= 1) cls = "over";
    else if (ratio >= 0.7) cls = "warn";
    if (cls) {
      progressFill.classList.add(cls);
      progressBar.classList.add(cls);
      progressMessage.classList.add(cls);
    }

    if (count >= weeklyLimit) {
      const over = count - weeklyLimit;
      progressMessage.textContent = over > 0
        ? `${over} over your limit this week`
        : "At your limit for this week";
    } else {
      const left = weeklyLimit - count;
      progressMessage.textContent = `${left} left this week`;
    }

    undoBtn.disabled = entries.length === 0;
  }

  function renderList() {
    logList.innerHTML = "";
    const source = view === "week" ? currentWeekEntries() : entries;
    const sorted = [...source].sort((a, b) => b.ts - a.ts);

    if (sorted.length === 0) {
      emptyState.hidden = false;
      logList.hidden = true;
      return;
    }
    emptyState.hidden = true;
    logList.hidden = false;

    if (view === "week") {
      renderGroupedByDay(sorted);
    } else {
      renderGroupedByWeek(sorted);
    }
  }

  function renderGroupedByDay(sorted) {
    const groups = new Map(); // dayStart -> entries[]
    sorted.forEach((e) => {
      const key = startOfDay(e.ts);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });

    [...groups.keys()].sort((a, b) => b - a).forEach((dayKey) => {
      const dayEntries = groups.get(dayKey);
      const group = document.createElement("div");
      group.className = "day-group";
      group.innerHTML = `<div class="group-header"><span>${fmtDay(dayKey)}</span><span class="group-count">${dayEntries.length}</span></div>`;
      dayEntries.forEach((e) => group.appendChild(renderEntry(e)));
      logList.appendChild(group);
    });
  }

  function renderGroupedByWeek(sorted) {
    const groups = new Map(); // weekStart -> entries[]
    sorted.forEach((e) => {
      const key = startOfWeek(e.ts);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });

    [...groups.keys()].sort((a, b) => b - a).forEach((weekKey) => {
      const weekEntries = groups.get(weekKey);
      const group = document.createElement("div");
      group.className = "week-group";
      group.innerHTML = `<div class="group-header"><span>${fmtWeekRange(weekKey)}</span><span class="group-count">${weekEntries.length}/${weeklyLimit}</span></div>`;
      weekEntries.forEach((e) => group.appendChild(renderEntry(e)));
      logList.appendChild(group);
    });
  }

  function renderEntry(entry) {
    const row = document.createElement("div");
    row.className = "entry";
    row.innerHTML = `
      <span class="entry-time">${fmtDay(entry.ts)} · ${fmtTime(entry.ts)}</span>
      <button class="del" title="Delete" aria-label="Delete">×</button>
    `;
    row.querySelector(".del").addEventListener("click", () => deleteEntry(entry.id));
    return row;
  }

  function render() {
    renderProgress();
    renderList();
  }

  // --- limit editing ---
  limitBadge.addEventListener("click", () => {
    if (editingLimit) return;
    editingLimit = true;
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.value = String(weeklyLimit);
    limitBadge.textContent = "";
    limitBadge.append("Limit: ", input, "/wk");
    input.focus();
    input.select();

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      editingLimit = false;
      setLimit(parseInt(input.value, 10));
    };
    input.addEventListener("click", (e) => e.stopPropagation());
    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); finish(); }
      else if (e.key === "Escape") {
        e.preventDefault();
        done = true;
        editingLimit = false;
        render();
      }
    });
    input.addEventListener("blur", finish);
  });

  // --- buttons ---
  logBtn.addEventListener("click", logDrink);
  undoBtn.addEventListener("click", undoLast);

  viewBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      viewBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      view = btn.dataset.view;
      render();
    });
  });

  // --- export / import ---
  exportBtn.addEventListener("click", () => {
    const data = JSON.stringify({ weeklyLimit, entries }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `drink-tracker-${date}.json`;
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
      const importedEntries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(importedEntries)) throw new Error("expected a JSON array of entries");

      const valid = importedEntries
        .filter((x) => x && typeof x.ts === "number")
        .map((x) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          ts: x.ts,
        }));

      if (valid.length === 0) {
        alert("No valid entries found in that file.");
        return;
      }
      entries = entries.concat(valid);
      if (!Array.isArray(parsed) && Number.isFinite(parsed.weeklyLimit) && parsed.weeklyLimit > 0) {
        weeklyLimit = Math.round(parsed.weeklyLimit);
        saveLimit();
      }
      saveEntries();
      render();
    } catch (err) {
      alert("Could not import that file: " + err.message);
    } finally {
      importFile.value = "";
    }
  });

  // --- keyboard shortcuts ---
  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA";
    if (inInput) return;

    if (e.key === "d") {
      e.preventDefault();
      logDrink();
    } else if (e.key === "u") {
      e.preventDefault();
      undoLast();
    }
  });

  render();
})();
