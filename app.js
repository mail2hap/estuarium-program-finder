const els = {
  gradeChips: document.getElementById("gradeChips"),
  formatChips: document.getElementById("formatChips"),
  toggleCommunity: document.getElementById("toggleCommunity"),
  searchBox: document.getElementById("searchBox"),
  clearBtn: document.getElementById("clearBtn"),
  summary: document.getElementById("summary"),
  results: document.getElementById("results"),
};

const state = {
  grade: null,
  format: null,
  includeCommunity: false,
  q: "",
};

let rawPrograms = [];

const GRADE_ORDER = ["PreK-K","K-2","3-5","6-8","8-10","9-12","10-12","Adult","All Ages","13+"];

function asArray(v){
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return [v].filter(Boolean);
}

function pick(obj, keys){
  for (const k of keys){
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function normalizeProgram(p){
  const name = pick(p, ["name","programName","title"]) || "Untitled program";
  const blurb = pick(p, ["blurb","summary","description","shortDescription"]) || "";
  const grades = asArray(pick(p, ["grades","gradeBands","gradeBand","grade_band"]));
  const formats = asArray(pick(p, ["formats","format","deliveryFormats","delivery"]));
  const type = (pick(p, ["type","audience","audienceType","category"]) || "").toString();

  // Decide if program is “community/adult” in a flexible way
  const isCommunity = (
    /adult|community|public|member/i.test(type) ||
    grades.some(g => /adult|all ages|13\+/i.test(String(g)))
  );

  return {
    id: pick(p, ["id","slug"]) || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    blurb,
    grades: grades.map(String),
    formats: formats.map(String),
    type: type || (isCommunity ? "Community/Adult" : "K–12"),
    isCommunity,
    // Optional URLs if you have them in data.json
    estimateUrl: pick(p, ["estimateUrl","estimate_url"]),
    inquiryUrl: pick(p, ["inquiryUrl","inquiry_url"]),
  };
}

function uniqSorted(arr){
  const set = new Set(arr.filter(Boolean));
  const out = [...set];
  out.sort((a,b) => {
    const ai = GRADE_ORDER.indexOf(a);
    const bi = GRADE_ORDER.indexOf(b);
    if (ai !== -1 || bi !== -1){
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }
    return a.localeCompare(b);
  });
  return out;
}

function chip(label, pressed, onClick){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.textContent = label;
  b.setAttribute("aria-pressed", pressed ? "true" : "false");
  b.addEventListener("click", onClick);
  return b;
}

function renderFilters(programs){
  const grades = uniqSorted(programs.flatMap(p => p.grades));
  const formats = uniqSorted(programs.flatMap(p => p.formats));

  els.gradeChips.innerHTML = "";
  grades.forEach(g => {
    els.gradeChips.appendChild(
      chip(g, state.grade === g, () => {
        state.grade = (state.grade === g) ? null : g;
        render();
      })
    );
  });

  els.formatChips.innerHTML = "";
  formats.forEach(f => {
    els.formatChips.appendChild(
      chip(f, state.format === f, () => {
        state.format = (state.format === f) ? null : f;
        render();
      })
    );
  });
}

function matchesQuery(p){
  if (!state.q) return true;
  const hay = [p.name, p.blurb, p.type, ...p.grades, ...p.formats].join(" ").toLowerCase();
  return hay.includes(state.q.toLowerCase());
}

function filterPrograms(programs){
  return programs.filter(p => {
    if (!state.includeCommunity && p.isCommunity) return false;
    if (state.grade && !p.grades.includes(state.grade)) return false;
    if (state.format && !p.formats.includes(state.format)) return false;
    if (!matchesQuery(p)) return false;
    return true;
  });
}

function card(p){
  const aEstimate = (p.estimateUrl || "#estimate");
  const aInquiry = (p.inquiryUrl || "#inquire");

  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    <h3>${escapeHtml(p.name)}</h3>
    <p>${escapeHtml(p.blurb || "")}</p>
    <div class="meta">
      ${(p.type ? `<span class="pill pill--type">${escapeHtml(p.type)}</span>` : "")}
      ${p.grades.map(g => `<span class="pill pill--grade">${escapeHtml(g)}</span>`).join("")}
      ${p.formats.map(f => `<span class="pill pill--format">${escapeHtml(f)}</span>`).join("")}
    </div>
    <div class="actions">
      <a class="btn btn--primary" href="${escapeAttr(aEstimate)}">Get an Estimate</a>
      <a class="btn btn--ghost" href="${escapeAttr(aInquiry)}">Request Booking</a>
    </div>
  `;
  return el;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function escapeAttr(s){ return escapeHtml(s); }

function render(){
  // Use full set for filters, but optionally restrict if community is off
  const universe = state.includeCommunity ? rawPrograms : rawPrograms.filter(p => !p.isCommunity);
  renderFilters(universe);

  const list = filterPrograms(rawPrograms);

  const parts = [];
  if (state.grade) parts.push(`Grade: ${state.grade}`);
  if (state.format) parts.push(`Format: ${state.format}`);
  if (state.q) parts.push(`Search: "${state.q}"`);
  if (state.includeCommunity) parts.push(`Including community/adult`);

  els.summary.textContent = `${list.length} match${list.length === 1 ? "" : "es"}${parts.length ? " • " + parts.join(" • ") : ""}`;

  els.results.innerHTML = "";
  if (list.length === 0){
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `<h3>No matches</h3><p>Try clearing a filter or using a broader search.</p>`;
    els.results.appendChild(empty);
    return;
  }

  list.forEach(p => els.results.appendChild(card(p)));
}

function clearAll(){
  state.grade = null;
  state.format = null;
  state.q = "";
  state.includeCommunity = false;

  els.searchBox.value = "";
  els.toggleCommunity.checked = false;

  render();
}

async function init(){
  const res = await fetch("data.json", { cache: "no-store" });
  const data = await res.json();

  const list = Array.isArray(data) ? data : (data.programs || []);
  rawPrograms = list.map(normalizeProgram);

  // Controls
  els.toggleCommunity.addEventListener("change", (e) => {
    state.includeCommunity = !!e.target.checked;
    render();
  });

  els.searchBox.addEventListener("input", (e) => {
    state.q = e.target.value.trim();
    render();
  });

  els.clearBtn.addEventListener("click", clearAll);

  render();
}

init().catch(err => {
  els.summary.textContent = "Failed to load data.json";
  console.error(err);
});
