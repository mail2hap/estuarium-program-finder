const state = {
  q: "",
  grades: new Set(),
  formats: new Set(),
  pillars: new Set(),
  tags: new Set()
};

const els = {
  q: document.getElementById("q"),
  clearAll: document.getElementById("clearAll"),
  gradeFilters: document.getElementById("gradeFilters"),
  formatFilters: document.getElementById("formatFilters"),
  pillarFilters: document.getElementById("pillarFilters"),
  tagFilters: document.getElementById("tagFilters"),
  cards: document.getElementById("cards"),
  resultsCount: document.getElementById("resultsCount"),
  activeChips: document.getElementById("activeChips")
};

let programs = [];

function uniqSorted(arr){
  return [...new Set(arr)].filter(Boolean).sort((a,b)=>a.localeCompare(b));
}

function makeChip(label, pressed, onClick){
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip";
  btn.textContent = label;
  btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  btn.addEventListener("click", onClick);
  return btn;
}

function renderFilterChips(){
  // Derive options from data
  const gradeOptions = uniqSorted(programs.flatMap(p => p.grades || []));
  const formatOptions = uniqSorted(programs.flatMap(p => p.formats || []));
  const pillarOptions = uniqSorted(programs.map(p => p.pillar));
  const tagOptions = uniqSorted(programs.flatMap(p => p.tags || []));

  els.gradeFilters.innerHTML = "";
  gradeOptions.forEach(g => {
    els.gradeFilters.appendChild(
      makeChip(g, state.grades.has(g), () => toggleSet(state.grades, g))
    );
  });

  els.formatFilters.innerHTML = "";
  formatOptions.forEach(f => {
    els.formatFilters.appendChild(
      makeChip(f, state.formats.has(f), () => toggleSet(state.formats, f))
    );
  });

  els.pillarFilters.innerHTML = "";
  pillarOptions.forEach(p => {
    els.pillarFilters.appendChild(
      makeChip(p, state.pillars.has(p), () => toggleSet(state.pillars, p))
    );
  });

  els.tagFilters.innerHTML = "";
  tagOptions.forEach(t => {
    els.tagFilters.appendChild(
      makeChip(t, state.tags.has(t), () => toggleSet(state.tags, t))
    );
  });
}

function toggleSet(set, value){
  if (set.has(value)) set.delete(value);
  else set.add(value);
  render();
}

function clearAll(){
  state.q = "";
  state.grades.clear();
  state.formats.clear();
  state.pillars.clear();
  state.tags.clear();
  els.q.value = "";
  render();
}

function matchesQuery(p){
  if (!state.q) return true;
  const hay = [
    p.name, p.pillar, p.audience, p.blurb,
    ...(p.grades || []),
    ...(p.formats || []),
    ...(p.tags || [])
  ].join(" ").toLowerCase();
  return hay.includes(state.q.toLowerCase());
}

function matchesSetOrEmpty(itemValues, selectedSet){
  if (selectedSet.size === 0) return true;
  const vals = new Set(itemValues || []);
  for (const s of selectedSet){
    if (vals.has(s)) return true; // OR within category
  }
  return false;
}

function matchesProgram(p){
  if (!matchesQuery(p)) return false;
  if (!matchesSetOrEmpty(p.grades, state.grades)) return false;
  if (!matchesSetOrEmpty(p.formats, state.formats)) return false;
  if (state.pillars.size > 0 && !state.pillars.has(p.pillar)) return false;
  if (!matchesSetOrEmpty(p.tags, state.tags)) return false;
  return true;
}

function renderActiveChips(){
  els.activeChips.innerHTML = "";

  const add = (label, onRemove) => {
    const b = makeChip(label, true, onRemove);
    b.title = "Remove filter";
    els.activeChips.appendChild(b);
  };

  if (state.q) add(`Search: ${state.q}`, () => { state.q=""; els.q.value=""; render(); });
  [...state.grades].forEach(g => add(g, () => { state.grades.delete(g); render(); }));
  [...state.formats].forEach(f => add(f, () => { state.formats.delete(f); render(); }));
  [...state.pillars].forEach(p => add(p, () => { state.pillars.delete(p); render(); }));
  [...state.tags].forEach(t => add(t, () => { state.tags.delete(t); render(); }));
}

function renderCards(list){
  els.cards.innerHTML = "";

  list.forEach(p => {
    const card = document.createElement("article");
    card.className = "card";

    const h = document.createElement("h4");
    h.textContent = p.name;

    const blurb = document.createElement("p");
    blurb.textContent = p.blurb || "";

    const meta = document.createElement("div");
    meta.className = "meta";

    meta.appendChild(pill(`Pillar: ${p.pillar}`, "pillar"));
    (p.grades || []).forEach(g => meta.appendChild(pill(g, "grade")));
    (p.formats || []).forEach(f => meta.appendChild(pill(f, "format")));

    const actions = document.createElement("div");
    actions.className = "actions";

    // Replace these URLs with your real endpoints if desired
    const estimate = document.createElement("a");
    estimate.className = "btn";
    estimate.href = "#estimate";
    estimate.textContent = "Estimate";

    const inquire = document.createElement("a");
    inquire.className = "btn btn-ghost";
    inquire.href = "#inquire";
    inquire.textContent = "Inquire";

    actions.appendChild(estimate);
    actions.appendChild(inquire);

    card.appendChild(h);
    card.appendChild(blurb);
    card.appendChild(meta);
    card.appendChild(actions);

    els.cards.appendChild(card);
  });

  if (list.length === 0){
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = "<h4>No matches</h4><p>Try clearing a filter or using a broader search.</p>";
    els.cards.appendChild(empty);
  }
}

function pill(text, kind){
  const s = document.createElement("span");
  s.className = `pill ${kind}`;
  s.textContent = text;
  return s;
}

function render(){
  renderFilterChips();
  renderActiveChips();

  const filtered = programs.filter(matchesProgram);
  els.resultsCount.textContent = `${filtered.length} program${filtered.length === 1 ? "" : "s"} match`;

  renderCards(filtered);
}

async function init(){
  const res = await fetch("programs.json", { cache: "no-store" });
  programs = await res.json();

  els.q.addEventListener("input", (e) => {
    state.q = e.target.value.trim();
    render();
  });

  els.clearAll.addEventListener("click", clearAll);

  render();
}

init().catch(err => {
  els.resultsCount.textContent = "Failed to load programs.json";
  console.error(err);
});
