/* Program Finder
   - Loads data.json
   - Provides grade + format filters and search
   - Default view is school programs only
*/

const state = {
  data: null,
  selectedGrades: new Set(),
  selectedFormats: new Set(),
  includeCommunity: false,
  search: ""
};

const GRADE_PRESETS = [
  { id: "PreK", label: "PreK", range: [-1, -1] },
  { id: "K–1", label: "K–1", range: [0, 1] },
  { id: "2–5", label: "2–5", range: [2, 5] },
  { id: "6–8", label: "6–8", range: [6, 8] },
  { id: "8–10", label: "8–10", range: [8, 10] },
  { id: "10–12", label: "10–12", range: [10, 12] },
];

const FORMAT_PRESETS = [
  { id: "10-week", label: "10-week" },
  { id: "4-week", label: "4-week" },
  { id: "5-day camp", label: "5-day camp" },
  { id: "1-day field trip", label: "1-day field trip" }
];

function el(id){ return document.getElementById(id); }

function parseGradeIntervals(gradesText){
  const s = (gradesText || "").toString().trim();
  if(!s) return [];
  const lower = s.toLowerCase();

  if(lower.includes("all ages")) return [[-1, 99]];
  if(lower === "adult") return [[18, 99]];
  if(lower === "13+") return [[13, 99]];
  if(lower === "prek") return [[-1, -1]];

  // Split by comma
  const parts = s.split(",").map(p => p.trim()).filter(Boolean);
  const intervals = [];

  for(const p of parts){
    const pl = p.toLowerCase();
    if(pl === "prek"){ intervals.push([-1,-1]); continue; }
    // PreK–1
    const mPrek = p.match(/prek\s*[–-]\s*(\d{1,2})/i);
    if(mPrek){
      intervals.push([-1, parseInt(mPrek[1],10)]);
      continue;
    }
    // K–1
    const mK = p.match(/\bk\s*[–-]\s*(\d{1,2})/i);
    if(mK){
      intervals.push([0, parseInt(mK[1],10)]);
      continue;
    }
    // 2–5 etc
    const mRange = p.match(/(\d{1,2})\s*[–-]\s*(\d{1,2})/);
    if(mRange){
      intervals.push([parseInt(mRange[1],10), parseInt(mRange[2],10)]);
      continue;
    }
    // Single number
    const mSingle = p.match(/^\d{1,2}$/);
    if(mSingle){
      const g = parseInt(p,10);
      intervals.push([g,g]);
      continue;
    }
  }
  return intervals;
}

function intersects(intervals, targetRange){
  for(const [a,b] of intervals){
    const [x,y] = targetRange;
    if(Math.max(a,x) <= Math.min(b,y)) return true;
  }
  return false;
}

function buildChips(container, presets, selectedSet){
  container.innerHTML = "";
  for(const p of presets){
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.type = "button";
    btn.textContent = p.label;
    btn.setAttribute("aria-pressed", selectedSet.has(p.id) ? "true" : "false");
    btn.addEventListener("click", () => {
      if(selectedSet.has(p.id)) selectedSet.delete(p.id);
      else selectedSet.add(p.id);
      render();
    });
    container.appendChild(btn);
  }
}

function programMatchesFilters(prog){
  // Category gate
  if(!state.includeCommunity && prog.category !== "School") return false;

  // Search
  if(state.search){
    const term = state.search.toLowerCase();
    if(!prog.name.toLowerCase().includes(term)) return false;
  }

  // Formats
  if(state.selectedFormats.size > 0){
    for(const f of state.selectedFormats){
      if(!prog.formats || !prog.formats[f]) return false;
    }
  }

  // Grades
  if(state.selectedGrades.size > 0){
    const intervals = parseGradeIntervals(prog.grades);
    // Any selected grade chip can match
    let ok = false;
    for(const chipId of state.selectedGrades){
      const preset = GRADE_PRESETS.find(g => g.id === chipId);
      if(!preset) continue;
      if(intersects(intervals, preset.range)) { ok = true; break; }
    }
    if(!ok) return false;
  }

  return true;
}

function formatTags(prog){
  const tags = [];
  if(prog.grades) tags.push({text:`Grades: ${prog.grades}`, cls:"tag tag--grade"});
  const fmt = [];
  for(const p of FORMAT_PRESETS){
    if(prog.formats && prog.formats[p.id]) fmt.push(p.label);
  }
  if(fmt.length){
    for(const x of fmt) tags.push({text:x, cls:"tag tag--format"});
  } else {
    // Some non-X formats (like Monthly)
    const notes = prog.notes ? Object.values(prog.notes).filter(Boolean) : [];
    if(notes.length){
      tags.push({text:`Format: ${notes.join(", ")}`, cls:"tag tag--format"});
    }
  }
  return tags;
}

function renderResults(list){
  const resultsEl = el("results");
  resultsEl.innerHTML = "";

  if(list.length === 0){
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `<div class="card__title">No matches</div>
      <div class="details">Try clearing filters or selecting a broader grade band.</div>`;
    resultsEl.appendChild(empty);
    return;
  }

  for(const prog of list){
    const card = document.createElement("div");
    card.className = "card";

    const tags = formatTags(prog).map(t => `<span class="${t.cls}">${t.text}</span>`).join("");

    card.innerHTML = `
      <div class="card__top">
        <div>
          <h3 class="card__title">${prog.name}</h3>
          <div class="tag-row">${tags}</div>
        </div>
        <div class="card__actions">
          <a href="${state.data.ctaEstimateUrl}">Get estimate</a>
          <a href="${state.data.ctaInquiryUrl}">Request booking</a>
        </div>
      </div>
      <div class="details">
        ${prog.category === "School" ? "School program." : "Community or adult program."}
      </div>
    `;
    resultsEl.appendChild(card);
  }
}

function render(){
  buildChips(el("gradeChips"), GRADE_PRESETS, state.selectedGrades);
  buildChips(el("formatChips"), FORMAT_PRESETS, state.selectedFormats);

  el("toggleCommunity").checked = state.includeCommunity;
  el("searchBox").value = state.search;

  const filtered = state.data.programs.filter(programMatchesFilters);

  el("summary").textContent =
    `${filtered.length} program${filtered.length === 1 ? "" : "s"} shown` +
    (state.selectedGrades.size ? ` | Grades filter: ${Array.from(state.selectedGrades).join(", ")}` : "") +
    (state.selectedFormats.size ? ` | Format filter: ${Array.from(state.selectedFormats).join(", ")}` : "");

  renderResults(filtered);
}

async function init(){
  const res = await fetch("data.json");
  state.data = await res.json();

  el("orgName").textContent = state.data.orgName || "Puget Sound Estuarium";
  el("pageTitle").textContent = state.data.pageTitle || "K–12 Program Finder";

  el("ctaEstimate").href = state.data.ctaEstimateUrl || "#estimate";
  el("ctaInquiry").href = state.data.ctaInquiryUrl || "#inquire";

  el("toggleCommunity").addEventListener("change", (e) => {
    state.includeCommunity = !!e.target.checked;
    render();
  });

  el("searchBox").addEventListener("input", (e) => {
    state.search = e.target.value || "";
    render();
  });

  el("clearBtn").addEventListener("click", () => {
    state.selectedGrades.clear();
    state.selectedFormats.clear();
    state.search = "";
    state.includeCommunity = false;
    render();
  });

  render();
}

init();
