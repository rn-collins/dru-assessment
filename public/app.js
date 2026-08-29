/* Cannabis–Healthcare Conversation Questionnaire Sandbox
   Browser-local only. No fetch, XHR, WebSocket, EventSource or beacon appears
   in this file, and the site's CSP sets connect-src 'none' so none could run.
   Downloads use Blob + object URL; imports use FileReader. Neither is a request. */
const KEY = "dru-questionnaire-v2";
const SCHEMA = 2;

const anchors = [
  { value: 0, label: "Disagree" },
  { value: 1, label: "Somewhat disagree" },
  { value: 2, label: "Somewhat agree" },
  { value: 3, label: "Agree" },
  { value: null, label: "Not sure / prefer not to answer" }
];

const items = [
  { id: "perceived_interaction_knowledge", construct: "Perceived interaction knowledge",
    text: "I understand that some cannabis products may interact with some prescription or over-the-counter medicines." },
  { id: "perceived_disclosure_rationale", construct: "Perceived disclosure rationale",
    text: "I understand why information about cannabis products, amount, route, frequency, and timing may be relevant to a healthcare conversation." },
  { id: "discussion_comfort", construct: "Discussion comfort",
    text: "I would feel comfortable discussing my cannabis use with a healthcare professional." },
  { id: "anticipated_clinician_response", construct: "Anticipated clinician response",
    text: "I expect a healthcare professional to respond respectfully if I discuss cannabis use." },
  { id: "conversation_preparedness", construct: "Conversation preparedness",
    text: "I feel prepared to describe the cannabis products, amount, route, frequency, and timing relevant to my care." },
  { id: "interaction_discussion_intention", construct: "Discussion intention",
    text: "When relevant, I intend to ask a healthcare professional about possible cannabis–medication interactions." }
];

const $ = s => document.querySelector(s);
const labelFor = v => anchors.find(x => x.value === v)?.label || "Missing";

/* ---------- validation (shared by storage load and file import) ---------- */
function validateRows(raw) {
  if (!Array.isArray(raw)) return { rows: [], dropped: 0 };
  const seen = new Set(), rows = [];
  for (const x of raw) {
    if (!x || x.schema !== SCHEMA || !/^[A-Z0-9]{8}$/.test(x.code) ||
        !["pre", "post"].includes(x.phase) ||
        !Number.isFinite(Date.parse(x.savedAt)) || !x.answers) continue;
    const key = x.code + ":" + x.phase;
    if (seen.has(key)) continue;
    const answers = {};
    let ok = true;
    for (const item of items) {
      const v = x.answers[item.id];
      if (v !== null && (!Number.isInteger(v) || v < 0 || v > 3)) { ok = false; break; }
      answers[item.id] = v === undefined ? null : v;
    }
    if (ok) { seen.add(key); rows.push({ schema: SCHEMA, code: x.code, phase: x.phase, savedAt: x.savedAt, answers }); }
  }
  return { rows, dropped: raw.length - rows.length };
}

function safeLoad() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return { rows: [], recovered: true }; }
  const { rows, dropped } = validateRows(raw);
  return { rows, recovered: dropped > 0 };
}

let loaded = safeLoad();
let rows = loaded.rows;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); return true; }
  catch {
    status("This browser could not save local data. Export or clear space and try again.");
    return false;
  }
}
function status(msg) { $("#status").textContent = msg; }

function readCode() { return $("#code").value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8); }
function generate() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, x => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[x % 32]).join("");
}

/* ---------- questionnaire ---------- */
function renderItems() {
  const root = $("#items");
  for (const item of items) {
    const f = document.createElement("fieldset");
    f.className = "item";
    const l = document.createElement("legend");
    l.textContent = item.text;
    f.append(l);
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = "Standalone indicator: " + item.construct;
    f.append(meta);
    const a = document.createElement("div");
    a.className = "answers";
    for (const opt of anchors) {
      const lab = document.createElement("label"), input = document.createElement("input");
      input.type = "radio";
      input.name = item.id;
      input.value = opt.value === null ? "missing" : String(opt.value);
      input.required = true;
      lab.append(input, document.createTextNode(" " + opt.label));
      a.append(lab);
    }
    f.append(a);
    root.append(f);
  }
}

/* ---------- records ---------- */
function render() {
  const root = $("#records");
  root.replaceChildren();
  if (!rows.length) {
    root.textContent = "No valid local records.";
    renderPairs();
    return;
  }
  const sorted = rows.slice().sort((a, b) => a.code.localeCompare(b.code) || a.phase.localeCompare(b.phase));
  for (const r of sorted) {
    const article = document.createElement("article");
    article.className = "record";
    const h = document.createElement("h3");
    h.textContent = r.code + " · " + r.phase.toUpperCase();
    const time = document.createElement("time");
    time.dateTime = r.savedAt;
    time.textContent = new Date(r.savedAt).toLocaleString();
    const dl = document.createElement("dl");
    for (const item of items) {
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = item.construct;
      dd.textContent = labelFor(r.answers[item.id]);
      dl.append(dt, dd);
    }
    const del = document.createElement("button");
    del.type = "button";
    del.className = "quiet";
    del.textContent = "Delete this record";
    del.setAttribute("aria-label", `Delete record ${r.code} ${r.phase.toUpperCase()}`);
    del.onclick = () => {
      rows = rows.filter(x => !(x.code === r.code && x.phase === r.phase));
      save(); render();
      status("Record deleted.");
    };
    article.append(h, time, dl, del);
    root.append(article);
  }
  renderPairs();
}

/* ---------- paired transitions: labels only, never a score ---------- */
function pairIndex() {
  const byCode = new Map();
  for (const r of rows) {
    if (!byCode.has(r.code)) byCode.set(r.code, {});
    byCode.get(r.code)[r.phase] = r;
  }
  const paired = [], unpaired = [];
  for (const [code, o] of [...byCode.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (o.pre && o.post) paired.push({ code, pre: o.pre, post: o.post });
    else unpaired.push({ code, phase: o.pre ? "pre" : "post" });
  }
  return { paired, unpaired, codes: byCode.size };
}

function dayGap(a, b) {
  const d = Math.abs(Date.parse(b) - Date.parse(a)) / 86400000;
  if (d < 1) return "under a day apart";
  const n = Math.round(d);
  return n === 1 ? "1 day apart" : n + " days apart";
}

function renderPairs() {
  const root = $("#pairs");
  root.replaceChildren();
  const { paired, unpaired, codes } = pairIndex();

  const summary = document.createElement("p");
  summary.className = "small muted";
  summary.textContent =
    `${rows.length} valid record${rows.length === 1 ? "" : "s"} under ${codes} code${codes === 1 ? "" : "s"}: ` +
    `${paired.length} exact pre/post pair${paired.length === 1 ? "" : "s"}, ` +
    `${unpaired.length} code${unpaired.length === 1 ? "" : "s"} with only one phase recorded.`;
  root.append(summary);

  if (!paired.length) {
    const p = document.createElement("p");
    p.textContent = "No exact pairs yet. A pair needs one PRE and one POST saved under the same code.";
    root.append(p);
  }

  for (const pair of paired) {
    const block = document.createElement("div");
    block.className = "pairblock";

    const h = document.createElement("h3");
    h.className = "pairhead";
    h.textContent = pair.code;
    block.append(h);

    const when = document.createElement("p");
    when.className = "tally";
    when.textContent = `PRE ${new Date(pair.pre.savedAt).toLocaleDateString()} · ` +
                       `POST ${new Date(pair.post.savedAt).toLocaleDateString()} · ` +
                       dayGap(pair.pre.savedAt, pair.post.savedAt);
    block.append(when);

    let changed = 0, same = 0, missing = 0;
    const wrap = document.createElement("div");
    wrap.className = "tablewrap";
    const table = document.createElement("table");
    table.className = "pairs";
    const caption = document.createElement("caption");
    caption.textContent = "Recorded labels for one code, side by side. No total, no change score, no effect estimate.";
    table.append(caption);

    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    for (const t of ["Item", "Pre", "Post", "Transition"]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = t;
      hr.append(th);
    }
    thead.append(hr);
    table.append(thead);

    const tbody = document.createElement("tbody");
    for (const item of items) {
      const a = pair.pre.answers[item.id], b = pair.post.answers[item.id];
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = item.construct;
      const td1 = document.createElement("td"); td1.textContent = labelFor(a);
      const td2 = document.createElement("td"); td2.textContent = labelFor(b);
      const td3 = document.createElement("td");
      if (a === null || b === null) { td3.textContent = "Not comparable — a response is missing"; td3.className = "same"; missing++; }
      else if (a === b) { td3.textContent = "Same label recorded twice"; td3.className = "same"; same++; }
      else { td3.textContent = `${labelFor(a)} → ${labelFor(b)}`; td3.className = "arrow"; changed++; }
      tr.append(th, td1, td2, td3);
      tbody.append(tr);
    }
    table.append(tbody);
    wrap.append(table);
    block.append(wrap);

    const tally = document.createElement("p");
    tally.className = "tally";
    const mk = (t, v) => { const s = document.createElement("span"); const b = document.createElement("b"); b.textContent = v; s.append(b, document.createTextNode(" " + t)); return s; };
    tally.append(mk("items", String(items.length)),
                 mk(changed === 1 ? "label differs" : "labels differ", String(changed)),
                 mk(same === 1 ? "label repeated" : "labels repeated", String(same)),
                 mk("not comparable", String(missing)));
    block.append(tally);

    const note = document.createElement("p");
    note.className = "small muted";
    note.textContent = "A count of items whose label differs is not a measure of size or direction of anything. " +
      "Response shift, testing effects, social desirability and regression to the mean all produce exactly this pattern with no intervention at all.";
    block.append(note);
    root.append(block);
  }

  if (unpaired.length) {
    const h = document.createElement("h3");
    h.className = "pairhead";
    h.textContent = "Codes with only one phase";
    root.append(h);
    const p = document.createElement("p");
    p.className = "small muted";
    p.textContent = "Shown because attrition is data. Codes that start and never return are usually not a random subset, " +
      "and a design that hides them looks tidier than it is.";
    root.append(p);
    const ul = document.createElement("ul");
    ul.className = "small";
    for (const u of unpaired) {
      const li = document.createElement("li");
      li.textContent = `${u.code} — ${u.phase.toUpperCase()} only`;
      ul.append(li);
    }
    root.append(ul);
  }
}

/* ---------- events ---------- */
$("#generate").onclick = () => { $("#code").value = generate(); $("#code").focus(); };

$("#survey").onsubmit = e => {
  e.preventDefault();
  $("#error").textContent = "";
  if (!$("#ack").checked) {
    $("#error").textContent = "Acknowledge local storage before saving.";
    $("#ack").focus();
    return;
  }
  const c = readCode(), phase = document.querySelector("[name=phase]:checked").value;
  if (!/^[A-Z0-9]{8}$/.test(c)) {
    $("#error").textContent = "Enter exactly eight letters or numbers.";
    $("#code").focus();
    return;
  }
  loaded = safeLoad();
  rows = loaded.rows;
  if (rows.some(x => x.code === c && x.phase === phase)) {
    $("#error").textContent = "That code and phase already exist. Saving would overwrite the earlier answer, so it is refused.";
    return;
  }
  const answers = {}, data = new FormData(e.target);
  for (const item of items) {
    const v = data.get(item.id);
    answers[item.id] = v === "missing" ? null : Number(v);
  }
  rows.push({ schema: SCHEMA, code: c, phase, savedAt: new Date().toISOString(), answers });
  if (save()) {
    e.target.reset();
    render();
    status(`Local record saved under ${c} (${phase.toUpperCase()}).`);
  }
};

function exportPayload() {
  return {
    exportSchema: "dru-questionnaire-export-v2",
    exportedAt: new Date().toISOString(),
    instrument: {
      id: "cannabis-healthcare-conversation-sandbox",
      version: "2.1",
      status: "unvalidated demonstration",
      items,
      responseOptions: anchors
    },
    records: rows,
    interpretation: {
      noCompositeScore: true,
      ordinal: true,
      pairedChangesDescriptiveOnly: true,
      notEffectEstimate: true,
      pseudonymousNotAnonymous: true,
      uncontrolledThreats: ["response shift", "testing effect", "social desirability", "regression to the mean", "attrition", "unrecorded exposure"]
    }
  };
}

function saveFile(name, type, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$("#export").onclick = () => {
  saveFile("questionnaire-records.json", "application/json", JSON.stringify(exportPayload(), null, 2));
  status("JSON file created in this browser. Nothing was uploaded.");
};

$("#exportCsv").onclick = () => {
  const q = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const out = [["code", "phase", "saved_at", "item_id", "construct", "response_label", "response_ordinal_do_not_average"].map(q).join(",")];
  for (const r of rows.slice().sort((a, b) => a.code.localeCompare(b.code) || a.phase.localeCompare(b.phase))) {
    for (const item of items) {
      const v = r.answers[item.id];
      out.push([r.code, r.phase, r.savedAt, item.id, item.construct, labelFor(v), v === null ? "" : v].map(q).join(","));
    }
  }
  out.push("");
  out.push([q("Ordered labels. Do not sum, average or difference the ordinal column; it has order but no known spacing.")].join(","));
  saveFile("questionnaire-records.csv", "text/csv", out.join("\n"));
  status("CSV file created in this browser. Nothing was uploaded.");
};

$("#print").onclick = () => window.print();

$("#import").onchange = e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => status("That file could not be read.");
  reader.onload = () => {
    let parsed;
    try { parsed = JSON.parse(String(reader.result)); }
    catch { status("That file is not valid JSON. Nothing was imported."); e.target.value = ""; return; }
    const candidate = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.records) ? parsed.records : null);
    if (!candidate) { status("No records array found in that file. Nothing was imported."); e.target.value = ""; return; }
    if (candidate.length > 500) { status("That file holds more than 500 rows and was refused."); e.target.value = ""; return; }
    const { rows: incoming, dropped } = validateRows(candidate);
    let added = 0, skipped = 0;
    for (const r of incoming) {
      if (rows.some(x => x.code === r.code && x.phase === r.phase)) { skipped++; continue; }
      rows.push(r); added++;
    }
    save(); render();
    status(`Imported ${added} record${added === 1 ? "" : "s"}. ` +
           `${skipped} already present and left untouched. ` +
           `${dropped} row${dropped === 1 ? "" : "s"} failed validation and ${dropped === 1 ? "was" : "were"} discarded.`);
    e.target.value = "";
  };
  reader.readAsText(file);
};

$("#clear").onclick = () => {
  if (confirm("Delete all local questionnaire records? This cannot be undone and does not touch files you already exported.")) {
    rows = [];
    localStorage.removeItem(KEY);
    render();
    status("All local records deleted.");
  }
};

window.addEventListener("storage", () => {
  loaded = safeLoad();
  rows = loaded.rows;
  render();
});

renderItems();
render();
if (loaded.recovered) status("Invalid or duplicate stored rows were quarantined and excluded.");
