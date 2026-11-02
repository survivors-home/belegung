"use strict";
/* ---------- Konstanten ---------- */
const YEAR = 2027;
const THEMES = {
  "Angehörige":["#3D01A4",0],"Beruf & Soziales":["#B7E710",1],"Bewegung":["#039DCE",0],"Ernährung":["#66B032",0],
  "Film & Foto":["#0247FE",0],"Forschung & Wissen":["#006707",0],"Geist & Seele":["#F31600",0],"Kreativität":["#FB9902",0],
  "Kunst & Kultur":["#A7194B",0],"Leben & Erfahrung":["#FFE200",1],"Musik":["#FF7298",0],"Themenoffen":["#A6489B",0],
  "Unterhaltung":["#FABC02",1],"Sonstige":["#8A8590",0]
};
const ROOMS = ["Workshopraum","Atelier","Wohnzimmer","Küche/Esszimmer","Innenhof","unterwegs","Wohnzimmer + Küche/Esszimmer","Workshopraum + Küche/Esszimmer","Workshopraum + Atelier","Gesamtes EG","DG (Notfall)","online"];
const EG = ["Workshopraum","Atelier","Wohnzimmer","Küche/Esszimmer","Innenhof"];
const LANES = ["Workshopraum","Atelier","Wohnzimmer","Küche/Esszimmer","Innenhof","unterwegs","DG (Notfall)","online","Raum offen"];
const STATUS = ["Idee","Option","angefragt","zugesagt","fix","in WP angelegt","veröffentlicht","abgesagt"];
const KINDS = {va:"Veranstaltung",vermietung:"vermietet oder nicht öffentlich",notiz:"Notiz (kein Termin)"};
const FORMS = ["Beratung","Gemeinsam aktiv","Mitmach-Kurs","Impuls & Austausch","Workshop","Beisammensein","Selbsthilfetreffen","Expertenrunde","Vortrag","Event"];
const WD = ["So","Mo","Di","Mi","Do","Fr","Sa"];
const WDL = ["sonntags","montags","dienstags","mittwochs","donnerstags","freitags","samstags"];
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
/* Schulferien Berlin: Standard, in den Einstellungen (Kalender) änderbar */
const DEF_FERIEN = [["2026-10-19","2026-10-31","Herbstferien"],["2026-12-23","2027-01-02","Weihnachtsferien"],["2027-02-01","2027-02-06","Winterferien"],["2027-03-22","2027-04-02","Osterferien"],
  ["2027-05-07","2027-05-07","unterrichtsfrei"],["2027-05-18","2027-05-19","unterrichtsfrei"],["2027-07-01","2027-08-14","Sommerferien"],
  ["2027-10-11","2027-10-23","Herbstferien"],["2027-12-22","2027-12-31","Weihnachtsferien"]];
let FERIEN = DEF_FERIEN, FEIER = {}; /* FEIER: Feiertage Berlin automatisch je Jahr + Zusätze aus den Einstellungen (applySettings) */
const DAY0 = 8*60, DAYSPAN = 13*60; // Zeitachse 8–21 Uhr
let OPEN_FROM = "10:00", OPEN_TO = "21:00"; // Kernöffnungszeit (Sebastian): 10–21 Uhr für die automatische Terminvergabe (Ende inkl. Nachlauf)
let OPEN_TXT = "Außerhalb der Kernöffnungszeit ("+OPEN_FROM+"–"+OPEN_TO+" Uhr inkl. Nachlauf)";
/* Einstellungen (meta/settings, Reiter Einstellungen): ohne Wert gilt der Standard. Werte werden in applySettings() in die Variablen übernommen. */
let CI_MIN = 30, HYB_SETUP = 300, ON_DAYS = 56, WARN_DAYS = 70;
const SET_DEF = {ci:30, openFrom:"10:00", openTo:"21:00", umbau:120, hybSetup:5, onlineWeeks:8, warnWeeks:10, nachfass:10, wsMaxH:36, altStep:30,
  invLoc:"SURVIVORS HOME Foundation, Hildegardstr. 31, 10715 Berlin", sebMail:"sebastian.roeder@survivors-home.de", noteMail:"veranstaltung@survivors-home.de",
  belegUrl:"https://belegung.survivors-home.de/", teamUrl:"https://belegung.survivors-home.de/team/", cleanUrl:"https://belegung.survivors-home.de/reinigung/"};
const setv = k => { const v = (S.settings || {})[k]; return v === undefined || v === null || v === "" ? SET_DEF[k] : v; };
/* Ostersonntag (gregorianisch) und gesetzliche Feiertage Berlin */
function easter(y){ const a = y%19, b = Math.floor(y/100), c = y%100, d = Math.floor(b/4), e = b%4, f = Math.floor((b+8)/25), g = Math.floor((b-f+1)/3), h = (19*a+b-d-g+15)%30, i = Math.floor(c/4), k = c%4, l = (32+2*e+2*i-h-k)%7, m = Math.floor((a+11*h+22*l)/451), n = h+l-7*m+114;
  return y + "-" + pad(Math.floor(n/31)) + "-" + pad(n%31 + 1); }
function feierBerlin(y){ const o = D(easter(y)), r = {};
  [[y+"-01-01","Neujahr"],[y+"-03-08","Frauentag"],[S_(o-2),"Karfreitag"],[S_(o+1),"Ostermontag"],[y+"-05-01","1. Mai"],[S_(o+39),"Christi Himmelfahrt"],[S_(o+50),"Pfingstmontag"],[y+"-10-03","Tag der Deutschen Einheit"],[y+"-12-25","1. Weihnachtstag"],[y+"-12-26","2. Weihnachtstag"]].forEach(([d, n]) => r[d] = n);
  return r; }
const FEIER_YEARS = () => [YEAR-1, YEAR, YEAR+1];
function applySettings(){
  const st = S.settings || {};
  CI_MIN = +setv("ci"); OPEN_FROM = setv("openFrom"); OPEN_TO = setv("openTo"); OPEN_TXT = "Außerhalb der Kernöffnungszeit ("+OPEN_FROM+"–"+OPEN_TO+" Uhr inkl. Nachlauf)";
  UMBAU_MIN = +setv("umbau"); HYB_SETUP = +setv("hybSetup") * 60; ON_DAYS = +setv("onlineWeeks") * 7; WARN_DAYS = +setv("warnWeeks") * 7;
  NACHFASS_TAGE = +setv("nachfass"); WS_MAX_H = +setv("wsMaxH"); ALT_STEP = +setv("altStep");
  INV_LOC = setv("invLoc"); SEB_MAIL = setv("sebMail"); NOTE_MAIL = setv("noteMail"); BELEG_URL = setv("belegUrl"); TEAM_URL = setv("teamUrl"); CLEAN_URL = setv("cleanUrl");
  FERIEN = Array.isArray(st.ferien) ? st.ferien.filter(f => Array.isArray(f) && f[0] && f[1]) : DEF_FERIEN;
  FEIER = {}; FEIER_YEARS().forEach(y => Object.assign(FEIER, feierBerlin(y)));
  (Array.isArray(st.feierExtra) ? st.feierExtra : []).forEach(f => { if (Array.isArray(f) && f[0]) FEIER[f[0]] = f[1] || "Feiertag"; });
}

/* ---------- Zustand ---------- */
const S = {series:{}, referents:{}, events:{}, absences:{}, weeks:{}, accepted:{}, rounds:{}, msgs:{}, settings:{}, stays:{}, fairs:{}, loaded:false};
const UI = {lPast:false, serFilter:"alle", view:"jahr", week:null, month:"alle", status:"alle", onlyIssues:false, q:"", drawer:null};
try { UI.sender = localStorage.getItem("shp-sender") || ""; } catch(e){ UI.sender = ""; }
let db = null, downloads = null, ISS = new Map();
/* Offline-Version (eigene HTML-Datei ohne Claude): gleicher Code, Daten lokal; Quelltext/Styles für das Erzeugen der Offline-Datei merken */
const OFFLINE = !!window.__SHP_OFFLINE, OFF = {dirty:0, src:""}, TEAM = !!window.__SHP_TEAM; /* TEAM: Team-Seite auf GitHub (nur mobile Leseansicht, Daten eingebettet) */
const SHP_SRC = (document.currentScript && document.currentScript.textContent) || "";
const SHP_CSS = ([...document.querySelectorAll("style")].map(x => x.textContent).find(t => t.includes("Planertisch"))) || "";
const SHP_HEAD = (() => { const h = document.querySelector("header.top"); return h ? h.outerHTML : ""; })();

/* ---------- Hilfsfunktionen ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const D = s => Date.UTC(+s.slice(0,4), +s.slice(5,7)-1, +s.slice(8,10)) / 864e5;
const S_ = n => new Date(n*864e5).toISOString().slice(0,10);
const wdOf = s => new Date(D(s)*864e5).getUTCDay();
const t2m = t => t ? (+t.slice(0,2))*60 + (+t.slice(3,5)) : null;
const m2t = m => pad(Math.floor(m/60)) + ":" + pad(Math.round(m%60));
const fmt = s => s ? s.slice(8,10)+"."+s.slice(5,7)+"." : "";
const fmtY = s => s ? fmt(s)+s.slice(0,4) : "";
/* Status-Stufen und Fristen: Vorwarnung (Standard 10 Wochen vorher) mind. „fix“, Online-Frist (Standard 8 Wochen vorher) „veröffentlicht“ – WARN_DAYS/ON_DAYS aus den Einstellungen */
const ST_CLS = {"Idee":"idee","Option":"opt","angefragt":"anf","zugesagt":"zug","fix":"fix","in WP angelegt":"wp","veröffentlicht":"pub","abgesagt":"abg"};
const stCls = e => "st-" + (ST_CLS[e.status] || "opt");
const stMark = e => e.status === "veröffentlicht" ? `<span class="smk">✓ online</span>` : e.status === "in WP angelegt" ? `<span class="smk">WP</span>` : "";
function deadlineOf(e){
  if (!e || e.kind !== "va" || e.status === "abgesagt" || !e.date) return null;
  const today = todayStr(); if (e.date < today) return null;
  const f8 = S_(D(e.date) - ON_DAYS), f10 = S_(D(e.date) - WARN_DAYS);
  if (e.status !== "veröffentlicht" && today > f8) return {l:"err", f8, short:"überfällig", t:"Online-Frist verpasst: seit " + fmtY(f8) + " müsste der Termin veröffentlicht sein (Status: " + e.status + ")"};
  if (today >= f10 && STATUS.indexOf(e.status) < STATUS.indexOf("fix")){ const wk = Math.max(0, Math.ceil((D(f8) - D(today)) / 7));
    return {l:"warn", f8, short: wk + " Wo.", t:"Vorwarnung: bis " + fmtY(f8) + " veröffentlichen – Status „" + e.status + "“ ist noch unter „fix“"}; }
  return null;
}
/* Tageszustand für das Jahresüberblick: er = Frist verpasst, wn = Vorwarnung, ok = alle veröffentlicht, op = Veranstaltungen offen, "" = keine Veranstaltung (leer, nur Vermietung/Notiz/abgesagt) */
function dayState(evs){
  const va = evs.filter(e => e.kind === "va" && e.status !== "abgesagt"); if (!va.length) return "";
  const ds = va.map(deadlineOf);
  if (ds.some(x => x && x.l === "err")) return "er"; if (ds.some(x => x && x.l === "warn")) return "wn";
  return va.every(e => e.status === "veröffentlicht") ? "ok" : "op";
}
/* Übernachtungsgäste im Dachgeschoss und Messen in Berlin (v121, DB-Dokument meta/stays {items, fairs}).
   Eine Einheit im DG; Bezug standardmäßig 13:00, Auszug 10:00; Status vorgemerkt/gebucht; 1–4 Personen. Nicht auf der öffentlichen Seite. */
const STAY_ROOM = "DG (Notfall)", STAY_ST = ["vorgemerkt","gebucht"];
/* Bett-Symbol: Übernachtung auf einen Blick von einer Veranstaltung unterscheidbar (Sebastian 02.11.2026) */
const BED = `<svg class="bed" viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><rect x="2" y="5" width="2.2" height="14" rx=".6"/><rect x="2" y="14" width="20" height="2.2"/><rect x="19.8" y="12" width="2.2" height="7" rx=".6"/><circle cx="7.6" cy="10.6" r="2.4"/><path d="M11 8.8h7a3.2 3.2 0 0 1 3.2 3.2v1H11z"/></g></svg>`;
let STAY_IN = "13:00", STAY_OUT = "10:00";
const stayList = () => Object.values(S.stays || {}).filter(x => x && x.from && x.to).sort((a,b) => (a.from + (a.fromT||"")).localeCompare(b.from + (b.fromT||"")));
const stayAbs = x => [D(x.from)*1440 + t2m(x.fromT || STAY_IN), D(x.to)*1440 + t2m(x.toT || STAY_OUT)];
/* Belegung des DG am Tag d in Minuten ab 0 Uhr: [{x, s, e}] */
function staysOn(d){ const d0 = D(d)*1440; return stayList().map(x => { const [a, b] = stayAbs(x), s = Math.max(a, d0) - d0, e = Math.min(b, d0 + 1440) - d0; return e > s ? {x, s, e} : null; }).filter(Boolean); }
const stayClash = x => { const [a, b] = stayAbs(x); return stayList().filter(y => y.id !== x.id && (() => { const [c, e] = stayAbs(y); return a < e && c < b; })()); };
const stayNights = x => Math.max(0, Math.round(D(x.to) - D(x.from)));
const stayPer = x => WD[wdOf(x.from)] + " " + fmt(x.from) + " " + (x.fromT || STAY_IN) + " – " + WD[wdOf(x.to)] + " " + fmtY(x.to) + " " + (x.toT || STAY_OUT);
const stayPers = x => { const n = Math.min(4, Math.max(1, +x.persons || 1)); return n + (n === 1 ? " Person" : " Personen"); };
/* Wochenansicht endet samstags: bleibt der Gast über Nacht, Hinweis auf die Abreise (Sebastian 02.11.2026) */
const stayOutSat = (q, d) => wdOf(d) === 6 && q.e >= 1440 && q.x.to > d ? "Abreise " + (q.x.to === S_(D(d) + 1) ? "Sonntag" : WD[wdOf(q.x.to)] + " " + fmt(q.x.to)) + " " + (q.x.toT || STAY_OUT) : "";
const stayName = x => (x.name || "").trim() || "Gast";
const stayTip = x => "Übernachtung (" + (x.status || "vorgemerkt") + "): " + stayName(x) + " · " + stayPers(x) + " · " + stayPer(x) + (x.note ? " · " + x.note : "");
const fairList = () => Object.values(S.fairs || {}).filter(f => f && f.from).sort((a,b) => a.from.localeCompare(b.from));
const fairsOn = d => fairList().filter(f => f.from <= d && d <= (f.to || f.from));
const fairPer = f => fmt(f.from) + (f.to && f.to !== f.from ? "–" + fmtY(f.to) : (f.from ? f.from.slice(0,4) : ""));
const todayStr = () => { if (window.__FAKE_TODAY) return window.__FAKE_TODAY; const d = new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); };
function firstThu(y){ const j4 = D(y+"-01-04"); return j4 - ((new Date(j4*864e5).getUTCDay()+6)%7) + 3; }
function isoWeek(s){ const n = D(s); const th = n - ((new Date(n*864e5).getUTCDay()+6)%7) + 3; const y = new Date(th*864e5).getUTCFullYear(); return [y, 1 + Math.round((th-firstThu(y))/7)]; }
const weekKey = s => { const [y,w] = isoWeek(s); return y+"-W"+pad(w); };
const mondayOf = (y,w) => S_(firstThu(y) - 3 + (w-1)*7);
const ferienOn = s => (FERIEN.find(f => f[0] <= s && s <= f[1]) || [])[2] || "";
const weekStatus = s => S.weeks[weekKey(s)] || "belebt";
function lastSun(y,m){ let n = D(y+"-"+pad(m)+"-01") + 31; n = D(S_(n).slice(0,8)+"01") - 1; while (new Date(n*864e5).getUTCDay() !== 0) n--; return S_(n); }
function sunset(s){
  const y = +s.slice(0,4), doy = D(s) - D(y+"-01-01") + 1, lat = 52.52*Math.PI/180, lng = 13.405;
  const g = 2*Math.PI/365*(doy-1);
  const eq = 229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dc = 0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const ha = Math.acos(Math.cos(90.833*Math.PI/180)/(Math.cos(lat)*Math.cos(dc)) - Math.tan(lat)*Math.tan(dc))*180/Math.PI;
  const dst = s >= lastSun(y,3) && s < lastSun(y,10);
  return 720 - 4*(lng - ha) - eq + (dst ? 120 : 60);
}
const theme = e => THEMES[e.theme] || THEMES["Sonstige"];
const evName = e => e.title || (S.series[e.seriesId]||{}).name || "Ohne Titel";
const serName = e => ((S.series[e.seriesId]||{}).name || "") + " " + (e.title||"");
const isBeratung = e => ((S.series[e.seriesId]||{}).form || e.form) === "Beratung";
/* Parallelbetrieb im EG – 4 Stufen: 1 keine Einschränkung · 2 nur Einzelberatungen parallel · 3 kein anderes Programm · 4 absolute Ruhe */
const EGL = [[1,"keine Einschränkung"],[2,"nur Einzelberatungen parallel zulässig"],[3,"kein anderes Programm im EG"],[4,"absolute Ruhe im EG"]];
const EGL_HELP = "Stufe 1: andere Veranstaltungen im EG erlaubt (nur Raumkonflikte zählen). Stufe 2: parallel nur Einzelberatungen (Veranstaltungsform „Beratung“). Stufe 3: kein anderes Programm im EG; Ankunft anderer Gäste nur als Hinweis. Stufe 4: zusätzlich kein Aufbau, Check-in, Nachlauf oder Abbau anderer Veranstaltungen im EG. Verstöße sind Fehler.";
const serLevel = s => +(s && s.egLevel) || (s && s.exclStrict ? 4 : s && s.excl ? 3 : 1);
const egLevel = e => { if (+e.egLevel) return +e.egLevel; const s = S.series[e.seriesId]; return s ? serLevel(s) : (e.excl ? 3 : 1); };
const eglName = l => (EGL.find(x => x[0] === l) || EGL[0])[1];
const evList = () => Object.values(S.events).filter(e => e && e.date);
/* Referenten nach Vorname sortieren, akademische Titel ignorieren */
const sortName = n => String(n||"").replace(/^(?:(?:Prof|Dr|PD|Dipl\.?-?\w*|med|rer\.?\s?nat|phil|habil|h\.\s?c)\.?\s+)+/i, "").trim();
const byRefName = (a,b) => sortName(a.name).localeCompare(sortName(b.name),"de") || a.name.localeCompare(b.name,"de");
const sortEv = (a,b) => (a.date+(a.start||"99")).localeCompare(b.date+(b.start||"99"));
/* Dauer-Feldpaar: Minuten und hh:mm, gegenseitig verknüpft */
const fmtHM = v => v === "" || v == null || isNaN(+v) ? "" : Math.floor(+v/60) + ":" + pad(Math.round(+v % 60));
function parseHM(t){ t = String(t||"").trim().replace(",", ":").replace(".", ":"); if (t === "") return ""; const m = t.match(/^(\d{1,2})(?::(\d{1,2}))?$/); if (!m) return null; const mm = +(m[2]||0); return mm > 59 ? null : (+m[1])*60 + mm; }
function durPair(attrs, v, label){
  const val = v == null ? "" : v;
  return `<span class="dpair" role="group" aria-label="${esc(label||"Dauer")}"><input type="number" min="0" ${attrs} value="${esc(val)}" aria-label="${esc((label||"Dauer")+" in Minuten")}"><span class="du">Min</span><span class="deq">=</span><input type="text" class="dhm" inputmode="numeric" placeholder="h:mm" value="${esc(fmtHM(val))}" aria-label="${esc((label||"Dauer")+" in Stunden und Minuten")}"><span class="du">h</span></span>`;
}
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 2600); }

/* ---------- Regelprüfung ---------- */
function span(e){
  if (e.kind === "notiz") return null;
  if (e.allDay) return {s:9*60, e:21*60};
  if (!e.start) return null;
  const s = t2m(e.start); return {s, e:s + (+e.dur||60)};
}
const splitRooms = r => r === "Gesamtes EG" ? EG.slice() : (r && r !== "online" && r !== "unterwegs" ? r.split(" + ") : []);
const roomsOf = e => splitRooms(e.room);
/* Abschlussphase in anderem Raum (z. B. Walk and Talk: Abschluss am Esstisch) */
const endPh = e => { const ser = S.series[e.seriesId] || {}; const r = e.endRoom || ser.endRoom, m = +(e.endMin || ser.endMin) || 0; return r && m > 0 ? {room:r, min:m} : null; };
/* Belegungsintervalle je Raum: [von, bis, Raum] inkl. Aufbau (Hybrid) und Abbau */
function occ(e){
  const sp = span(e); if (!sp) return [];
  const pre = Math.max(setupOf(e), arrives(e) ? CI_MIN : 0), from = sp.s - pre, to = sp.e + afterOf(e) + teardownOf(e), ph = endPh(e), out = [];
  const mainEnd = ph ? Math.max(sp.s, sp.e - ph.min) : to;
  roomsOf(e).forEach(r => out.push([from, mainEnd, r, sp.s, ph ? mainEnd : sp.e, false]));
  if (ph) splitRooms(ph.room).forEach(r => out.push([sp.e - ph.min, to, r, sp.e - ph.min, sp.e, true]));
  return out;
}
/* Gemeinsamer Abschluss: zwei Reihen enden bewusst zusammen im selben Raum (z. B. Ernährungs-Coaching + Walk and Talk) */
const shareEnd = (a, b) => a.date === b.date && a.seriesId && b.seriesId && a.seriesId !== b.seriesId && (serOf(a).shareEnd === b.seriesId || serOf(b).shareEnd === a.seriesId);
/* Andocken (Regeln der Reihen): Backen endet direkt vor dem Caféhaus, Frag den Doc beginnt direkt nach dem Caféhaus – Check-in/Nachlauf dürfen sich überlagern */
const DOCK = [["backen-mit-gerda","cafehaus"],["cafehaus","frag-den-doc"]];
const dockOK = (a, b) => { if (a.date !== b.date || !a.start || !b.start) return false; const [p, n] = t2m(a.start) <= t2m(b.start) ? [a, b] : [b, a];
  return DOCK.some(([x, y]) => p.seriesId === x && n.seriesId === y) && t2m(n.start) >= t2m(p.start) + (+p.dur||0); };
/* Lungenkrebs: Nachlauf einer vorherigen Veranstaltung darf sich mit dem Start der Selbsthilfegruppe überschneiden (Sebastian, 26.10.2026) */
const LK = "selbsthilfe-lungenkrebs";
const nachlaufLK = (a, b, x, y) => { const [p, n, xp] = a.seriesId === LK && b.seriesId !== LK ? [b, a, y] : b.seriesId === LK && a.seriesId !== LK ? [a, b, x] : [null, null, null]; if (!p || !p.start || !n.start || p.date !== n.date) return false;
  const pe = t2m(p.start) + (+p.dur||0); if (pe > t2m(n.start)) return false; const lo = Math.max(x[0], y[0]), hi = Math.min(x[1], y[1]); return lo >= pe && hi <= pe + afterOf(p); };
const sharePartner = e => { if (!endPh(e)) return null; return evList().find(o => o.id !== e.id && o.status !== "abgesagt" && shareEnd(e, o) && endPh(o) && endPh(o).room === endPh(e).room) || null; };
/* Möblierung Workshopraum: Umbau, wenn sich die Möblierung zwischen zwei aufeinanderfolgenden Nutzungen ändert (kein automatischer Rückbau) */
let UMBAU_MIN = 120; /* Mindest-Umbauzeit Workshopraum bei Möblierungswechsel (Min), Einstellungen */
const FURN = ["leer","Stuhlkreis","Stuhlreihen","Tische mit Stühlen"], FURN_SYM = {"leer":"□","Stuhlkreis":"○","Stuhlreihen":"≡","Tische mit Stühlen":"⊞"};
const usesWSR = e => e.kind !== "notiz" && e.status !== "abgesagt" && !!e.date && roomsOf(e).includes("Workshopraum");
const furnOf = e => usesWSR(e) ? (e.furn || serOf(e).furn || "") : "";
/* Liefert Map eventId -> {from, to} für jeden Termin, vor dem umgebaut werden muss */
function umbauMap(list){
  const seq = (list || evList()).filter(usesWSR).sort(sortEv), out = new Map(); let last = null;
  for (const e of seq){ const f = furnOf(e); if (!f) continue; if (last && last.f !== f) out.set(e.id, {from:last.f, to:f, prev:last.e}); last = {f, e}; }
  return out;
}
const allRooms = e => [...new Set(occ(e).map(x => x[2]).concat(roomsOf(e)))];
/* Ankunft/Check-in: CI_MIN (Einstellungen, Standard 30) Min vor Beginn sind Küche und Flur durch eintreffende Gäste belegt */
/* Check-in je Reihe: "vorher" (30 Min vor Beginn, Standard), "durchgehend" (30 Min vorher und während der ganzen Veranstaltung, Standard bei Beratungen), "keiner" */
const checkinOf = e => { const c = e.checkin || (S.series[e.seriesId] || {}).checkin; return c || (isBeratung(e) ? "durchgehend" : "vorher"); };
const arrives = e => e.kind !== "notiz" && e.start && !e.allDay && e.room !== "online" && checkinOf(e) !== "keiner";
const serOf = e => S.series[e.seriesId] || {};
/* Ganztägige Termine (9–21 Uhr) haben keinen Aufbau, Nachlauf oder Abbau außerhalb des Tages */
const teardownOf = e => e.allDay ? 0 : e.teardown != null && e.teardown !== "" ? +e.teardown || 0 : (+serOf(e).teardown || 0);
/* Nachlauf: Gäste bleiben nach offiziellem Ende noch im Raum */
const afterOf = e => e.allDay ? 0 : +(e.after != null && e.after !== "" ? e.after : serOf(e).after) || 0;
/* Aufbau vor Beginn: eigener Wert je Termin/Reihe, sonst bei Hybrid HYB_SETUP (Einstellungen, Standard 5 h) */
const setupOf = e => { if (e.allDay) return 0; const v = e.setup != null && e.setup !== "" ? +e.setup : (serOf(e).setup != null && serOf(e).setup !== "" ? +serOf(e).setup : null); return v != null && !isNaN(v) ? v : (e.hybrid ? HYB_SETUP : 0); };
/* Sperrtag: ganzer Tag ohne Veranstaltung (Abwesenheiten → Sperrtage; alte Notiz-Termine mit blockDay zählen weiter) */
const sperrOn = d => { const a = Object.values(S.absences).find(x => x.block && x.from <= d && d <= (x.to || x.from)); if (a) return a.note || "keine Veranstaltung"; const n = Object.values(S.events).find(e => e.date === d && e.kind === "notiz" && e.blockDay && e.status !== "abgesagt"); return n ? evName(n) : ""; };
const outdoorOf = e => e.outdoor === "ja" || e.outdoor === true ? true : e.outdoor === "nein" ? false : !!serOf(e).outdoor;
/* Draußen-Saison je Reihe (MM-TT), Raum außerhalb der Saison, Ausweichraum bei Schlechtwetter */
const OUTROOMS = ["Innenhof","unterwegs"];
/* alte Raumnamen (bis 10/2026) auf neue abbilden */
const ROOM_OLD = {"Innenhof/draußen":"Innenhof","draußen unterwegs":"unterwegs"};
const normRooms = o => { for (const k of ["room","roomOff","backupRoom","endRoom"]) if (o && typeof o[k] === "string") o[k] = o[k].split(" + ").map(r => ROOM_OLD[r] || r).join(" + "); return o; };
/* Saison nur, wenn in der Reihe gesetzt; ohne Angabe gilt für den Innenhof 15.03.–15.10. */
const seasonOf = e => { const s = serOf(e); if (!s.seasonFrom && !s.seasonTo && e.room !== "Innenhof") return null; return {from: s.seasonFrom || "03-15", to: s.seasonTo || "10-15", off: s.roomOff || ""}; };
const inSeason = (date, se) => { if (!se) return true; const md = date.slice(5); return md >= se.from && md <= se.to; };
/* Reihen: Anzahl je Jahr ist Vorgabe, das Intervall wird berechnet: (Wochen ohne Programmpause) ÷ Anzahl.
   Ruhige Wochen und Schulferien zählen als normale Wochen. Saison-Reihen (draußen ohne Ausweichraum) zählen nur Wochen in der Saison. */
const serSeasonOnly = s => !!(s && s.outdoor && (s.seasonFrom || s.seasonTo) && !s.roomOff);
const serSeason = s => serSeasonOnly(s) ? {from: s.seasonFrom || "03-15", to: s.seasonTo || "10-15"} : null;
function serWeeks(s, from, to){
  const se = serSeason(s), out = []; let mo = D(mondayOf(...isoWeek(from)));
  for (; S_(mo) <= to; mo += 7){ const m = S_(mo); if (S.weeks[weekKey(m)] === "pause") continue; if (se && ![0,1,2,3,4,5].some(i => inSeason(S_(mo+i), se))) continue; out.push(m); }
  return out;
}
function serIv(s){ const n = +(s && s.count); if (!s || s.individual || !n) return null; const ws = serWeeks(s, mondayOf(YEAR, 1), mondayOf(YEAR, isoWeek(YEAR+"-12-28")[1])); return {weeks: ws.length, n, iv: ws.length / n, season: serSeason(s)}; }
const ivNum = x => x.iv.toFixed(1).replace(".", ",");
const backupOf = e => OUTROOMS.includes(e.room) ? (e.backupRoom != null && e.backupRoom !== "" ? e.backupRoom : (serOf(e).backupRoom || "")) : "";
const md2de = v => v && /^\d\d-\d\d$/.test(v) ? v.slice(3)+"."+v.slice(0,2)+"." : "";
const de2md = v => { const m = String(v||"").trim().match(/^(\d{1,2})\.(\d{1,2})\.?$/); return m ? String(m[2]).padStart(2,"0")+"-"+String(m[1]).padStart(2,"0") : ""; };
const ov = (a1,a2,b1,b2) => a1 < b2 && b1 < a2;

/* v108: Termineinladung bei Hybrid – ab fix/in WP ohne Haken = Hinweis, veröffentlicht = Fehler; nur kommende Termine */
const INV_TXT = "Termineinladung an Referenten noch nicht verschickt (hybrid)";
function invIssue(e, today){
  if (!e.hybrid || e.invSent || e.kind === "notiz" || e.kind === "vermietung" || e.status === "abgesagt" || !e.date || e.date < (today || todayStr())) return null;
  if (e.status === "veröffentlicht") return {l:"err", t:INV_TXT};
  if (e.status === "fix" || e.status === "in WP angelegt") return {l:"warn", t:INV_TXT};
  return null;
}
/* v112: Website-Abgleich (Routine schreibt Feld web am Termin und meta/websync) – nur kommende Veranstaltungen; Titel werden nicht verglichen */
function webIssue(e, today){
  if (e.kind !== "va" || e.status === "abgesagt" || !e.date || e.date < today) return null;
  const w = e.web || {};
  if (w.at && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(w.at)){
    const wd = w.at.slice(0, 10), wt = w.at.slice(11);
    if (wd !== e.date) return {l:"warn", t:"Website: " + WD[wdOf(wd)] + " " + fmtY(wd) + " " + wt + " (anderer Tag als im Planer)"};
    if (!e.allDay && e.start && wt !== e.start) return {l:"warn", t:"Website: Beginn " + wt + " (im Planer " + e.start + ")"};
  }
  if (e.status === "veröffentlicht" && w.src !== "manuell" && S.websync && (S.websync.gone || []).includes(e.id)) return {l:"warn", t:"Veröffentlicht, aber nicht auf der Website gefunden"};
  return null;
}
function computeIssues(list){
  const out = new Map(), zk = new Set(); out.zones = [];
  /* z = Fehlerstelle {from, to, lanes:[Räume | "__ci"]} – wird in der Wochenansicht als Markierung gezeichnet */
  /* g: Kennung für Meldungen, die zwei Termine gemeinsam betreffen (Prüfbericht zeigt sie als eine Zeile) */
  const gids = new WeakMap(); let gn = 0; const gid = o => { if (!o || typeof o !== "object") return 0; if (!gids.has(o)) gids.set(o, ++gn); return gids.get(o); };
  const add = (e,l,t,z,g) => { if (!out.has(e.id)) out.set(e.id, []); const a = out.get(e.id); if (!a.some(x => x.t === t)) a.push({l,t,z:!!z,g:gid(g||z)});
    if (z && z.to > z.from){ const k = e.date+"|"+z.from+"|"+z.to+"|"+z.lanes.join(","); let zz;
      if (!zk.has(k)){ zk.add(k); zz = {date:e.date, from:z.from, to:z.to, lanes:z.lanes, t, l, m:[]}; out.zones.push(zz); } else { zz = out.zones.find(q => q.date+"|"+q.from+"|"+q.to+"|"+q.lanes.join(",") === k); if (zz && !zz.t.includes(t)) zz.t += " · " + t; if (zz && l === "err") zz.l = "err"; }
      if (zz && !zz.m.some(q => q.id === e.id && q.t === t)) zz.m.push({id:e.id, t}); } };
  const today = todayStr(), byDate = {};
  const act = list.filter(e => e.date && e.status !== "abgesagt" && e.kind !== "notiz");
  act.forEach(e => (byDate[e.date] = byDate[e.date] || []).push(e));
  const abs = Object.values(S.absences).filter(a => !a.block);
  const blk = {}; list.filter(e => e.kind === "notiz" && e.blockDay && e.status !== "abgesagt").forEach(e => blk[e.date] = evName(e));
  Object.values(S.absences).filter(a => a.block).forEach(a => { for (let d = a.from; d && d <= (a.to || a.from); d = S_(D(d)+1)) blk[d] = a.note || "keine Veranstaltung"; });
  /* Lücke um eine Programmpause größer als nötig (Pausenwochen + 1,5 × Intervall) */
  { const bySer = {}; act.filter(e => e.seriesId && e.kind !== "vermietung" && e.date.startsWith(YEAR + "-")).forEach(e => (bySer[e.seriesId] = bySer[e.seriesId] || []).push(e));
    for (const [sid, evs] of Object.entries(bySer)){ const x = serIv(S.series[sid]); if (!x) continue;
      evs.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < evs.length; i++){ const a = D(mondayOf(...isoWeek(evs[i-1].date))), b = D(mondayOf(...isoWeek(evs[i].date))), gap = Math.round((b - a) / 7);
        let p = 0; for (let m = a + 7; m < b; m += 7) if (S.weeks[weekKey(S_(m))] === "pause") p++;
        if (p && gap > p + 1.5 * x.iv) add(evs[i], "warn", "Lücke um die Pause: " + gap + " Wochen seit dem letzten Termin der Reihe (nötig etwa " + Math.round(p + x.iv) + ")"); } } }
  for (const e of act){
    const w = wdOf(e.date), ser = S.series[e.seriesId] || {}, nm = serName(e), st = e.start ? t2m(e.start) : null;
    if (blk[e.date]) add(e,"err","Sperrtag: "+blk[e.date]);
    if (e.kind === "vermietung") continue;
    if (w === 0) add(e,"err","Sonntag ist geschlossen");
    if (w === 6) add(e,"info","Samstag nur in Ausnahmefällen");
    if (FEIER[e.date]) add(e,"err","Feiertag: "+FEIER[e.date]);
    const ws = weekStatus(e.date);
    if (ws === "pause" && !e.fixed) add(e,"err","Liegt in einer Programmpause");
    if (ws === "ruhig" && !e.fixed){ const q = ser.quiet || "nein"; if (q === "ausnahme") add(e,"warn","Ruhige Woche: nur als Ausnahme"); else if (q !== "ja") add(e,"warn","Ruhige Woche: möglichst frei lassen"); }
    if (!e.start && !e.allDay) add(e,"info","Startzeit offen");
    if (!e.room) add(e,"info","Raum offen");
    if (e.room === "DG (Notfall)" && !e.fixed) add(e,"warn","DG ist nur Notfall-Ausweichfläche");
    { const dl = deadlineOf(e); if (dl) add(e, dl.l, dl.t); }
    { const iv = invIssue(e, today); if (iv) add(e, iv.l, iv.t); }
    { const wi = webIssue(e, today); if (wi) add(e, wi.l, wi.t); }
    for (const rid of (e.refs||[])){
      const r = S.referents[rid]; if (!r) continue;
      if ((r.blocked||[]).includes(w)) add(e,"err",r.name+" kann nicht "+WDL[w]);
      if ((r.only||[]).length && !r.only.includes(w)) add(e,"err",r.name+" kann nur "+r.only.map(x => WD[x]).join(", "));
      if (st != null && (r.noMorning||[]).includes(w) && st < 12*60) add(e,"err",r.name+" kann "+WDL[w]+" nicht vormittags");
      if (st != null && r.evening && st < 17*60) add(e,"err",r.name+" kann nur abends");
      if (r.noFerien && ferienOn(e.date)) add(e,"err",r.name+" kann nicht in den Schulferien");
      if ((r.avail||[]).length){ const sp0 = span(e); availIssues(e, r, sp0 && !e.allDay ? sp0.s : null, sp0 && !e.allDay ? sp0.e : null, add); }
      { const ra = (e.refAns||{})[rid]; if (ra && ra.date === e.date && (ra.start||"") === (e.start||"") && !SETTLED.includes(e.status)){ if (ra.a === "nein") add(e,"err",r.name+": passt nicht – neu planen"+(ra.note ? " ("+ra.note+")" : "")); else if (ra.a === "offen") add(e,"info",r.name+": noch offen"+(ra.note ? " ("+ra.note+")" : "")); } }
    }
    if ((ser.weekdays||[]).length && !ser.weekdays.includes(w)) add(e,"err",WDL[w].replace(/^./, c => c.toUpperCase())+" nicht vorgesehen (Reihe: "+ser.weekdays.map(x => WD[x]).join(", ")+")");
    if (st != null && ser.earliest && st < t2m(ser.earliest)) add(e,"err","Beginn vor "+ser.earliest+" nicht möglich (Reihe)");
    if (st != null && ser.latestEnd && st + (+e.dur||60) > t2m(ser.latestEnd)) add(e,"err","Ende nach "+ser.latestEnd+" nicht möglich (Reihe)");
    if (ser.noFerien && ferienOn(e.date)) add(e,"err","Nicht in den Schulferien ("+ferienOn(e.date)+")");
    if (st != null && !e.allDay && e.room !== "online" && (st < t2m(OPEN_FROM) || st + (+e.dur||60) + afterOf(e) > t2m(OPEN_TO))) add(e,"warn",OPEN_TXT);
    for (const a of abs){
      if (a.from <= e.date && e.date <= (a.to || a.from)){
        if (e.hybrid && /sebastian/i.test(a.person||"")) add(e,"err","Hybrid nicht möglich: Sebastian abwesend");
        else add(e,"info",(a.person||"Team")+" abwesend");
      }
    }
    if (OUTROOMS.includes(e.room) || outdoorOf(e)){
      const se = seasonOf(e);
      if (se && OUTROOMS.includes(e.room) && !inSeason(e.date, se)) add(e,"warn","Außerhalb der Draußen-Saison ("+md2de(se.from)+"–"+md2de(se.to)+")"+(se.off ? ": "+se.off : ""));
      if (st != null){ const ss = sunset(e.date), ph = endPh(e), oe = st + (+e.dur||60) - (ph ? ph.min : 0); if (oe > ss) add(e,"warn",(ph ? "Draußen-Teil endet" : "Endet")+" nach Sonnenuntergang ("+m2t(Math.round(ss))+")"); }
    }
    /* Walk and Talk: ganzjährig (keine Winterpause mehr, 28.10.2026) – Sonnenuntergang wird weiter geprüft */
    if (/Lungenkrebs/i.test(nm) && !(w === 4 && +e.date.slice(8) <= 7)) add(e,"info","Nicht am 1. Donnerstag des Monats");
    if (/Caféhaus/i.test(nm) && w === 3) add(e,"err","Caféhaus nie mittwochs");
    if (/Ernährungs-Coach/i.test(nm) && !(byDate[e.date]||[]).some(x => /Walk and Talk/i.test(serName(x)))) add(e,"info","Ohne Walk-and-Talk-Kopplung (neu ab 2027)");
  }
  /* Übernachtungsgäste im Dachgeschoss (v121): Belegung des DG (inkl. Aufbau, Check-in, Nachlauf) überschneidet eine Übernachtung → gebucht = Fehler, vorgemerkt = Hinweis */
  if (Object.keys(S.stays || {}).length) for (const e of act) for (const o of occ(e).filter(x => x[2] === STAY_ROOM)) for (const q of staysOn(e.date))
    if (ov(o[0], o[1], q.s, q.e)) add(e, q.x.status === "gebucht" ? "err" : "warn", "Übernachtungsgäste im Dachgeschoss (" + (q.x.status || "vorgemerkt") + "): " + stayName(q.x) + ", " + stayPer(q.x), {from:Math.max(o[0], q.s), to:Math.min(o[1], q.e), lanes:[STAY_ROOM]});
  for (const arr of Object.values(byDate)){
    for (let i = 0; i < arr.length; i++) for (let j = i+1; j < arr.length; j++) pair(arr[i], arr[j], add);
    const cafe = arr.find(e => /Caféhaus/i.test(serName(e))), back = arr.find(e => /Backen/i.test(serName(e))), zei = arr.find(e => e.seriesId === "gemeinsames-zeichnen" || /^Gemeinsames Zeichnen/i.test(serName(e)));
    if (cafe && back && zei) add(cafe,"err","Caféhaus nur mit Backen ODER Zeichnen");
    if (back && !cafe && back.kind === "va") add(back,"err","Backen nur am selben Tag vor dem Caféhaus");
    if (zei && !cafe && zei.kind === "va") add(zei,"err","Zeichnen nur zusammen mit dem Caféhaus");
    if (cafe && back && cafe.start && back.start && t2m(back.start) + (+back.dur||0) > t2m(cafe.start)) add(back,"err","Backen muss vor dem Caféhaus enden", {from:t2m(cafe.start), to:t2m(back.start)+(+back.dur||0), lanes:["Küche/Esszimmer"]});
    if (cafe && zei && cafe.start && zei.start){ const d = Math.abs(t2m(zei.start) - t2m(cafe.start)); if (d < 30 || d > 60) add(zei,"warn","Zeichnen 30–60 Min vor/nach Caféhaus-Beginn"); }
  }
  /* Umbauzeit Workshopraum (Sebastian, 26.10.2026): wechselt die Möblierung zwischen zwei Nutzungen am selben Tag, braucht es mind. 2 Std. Umbau
     (bzw. Abbau + Aufbau, wenn länger) zwischen Ende inkl. Nachlauf und Beginn des Check-ins der folgenden Veranstaltung */
  for (const arr of Object.values(byDate)){
    const ws = arr.filter(e => usesWSR(e) && e.start && !e.allDay && furnOf(e)).sort((a, b) => t2m(a.start) - t2m(b.start));
    for (let i = 1; i < ws.length; i++){ const a = ws[i-1], b = ws[i]; if (furnOf(a) === furnOf(b)) continue;
      const sa = span(a), sb = span(b), ph = endPh(a), free = ph ? sa.e - ph.min : sa.e + afterOf(a), need = sb.s - (arrives(b) ? CI_MIN : 0);
      const req = Math.max(UMBAU_MIN, teardownOf(a) + setupOf(b)), gap = need - free;
      if (gap < req){ const z = {from:Math.min(free, need), to:Math.max(free, need), lanes:["Workshopraum"]};
        const t = "Umbauzeit Workshopraum zu kurz: " + Math.max(0, gap) + " von " + req + " Min (" + furnOf(a) + " → " + furnOf(b) + ", frei ab " + m2t(free) + ", fertig bis " + m2t(need) + ")";
        add(b, "err", t + " – nach „" + evName(a) + "“", z); add(a, "err", t + " – vor „" + evName(b) + "“", z); } }
  }
  const mk = act.filter(e => /Mannschafts/i.test(serName(e))), kc = act.filter(e => /Küchenclub/i.test(serName(e)));
  for (const a of mk) for (const b of kc) if (Math.abs(D(a.date) - D(b.date)) < 7){ const g = {}; add(a,"warn","Weniger als 1 Woche Abstand zum Küchenclub",null,g); add(b,"warn","Weniger als 1 Woche Abstand zum Mannschafts-Kochen",null,g); }
  return out;
}
function pair(a, b, add){
  const sa = span(a), sb = span(b);
  const ext = e => e.room === "online";
  if (a.kind !== "vermietung" && b.kind !== "vermietung" && a.start && b.start && !ext(a) && !ext(b) && !a.allDay && !b.allDay && checkinOf(a) !== "keiner" && checkinOf(b) !== "keiner"){
    if (Math.abs(t2m(a.start) - t2m(b.start)) < CI_MIN && !shareEnd(a, b)){ const z = {from:Math.max(t2m(a.start),t2m(b.start))-CI_MIN, to:Math.min(t2m(a.start),t2m(b.start)), lanes:["__ci"]}; add(a,"err","Startabstand unter "+CI_MIN+" Min zu „"+evName(b)+"“", z); add(b,"err","Startabstand unter "+CI_MIN+" Min zu „"+evName(a)+"“", z); }
  }
  if (!sa || !sb) return;
  for (const [x, y] of [[a, b], [b, a]]){ const bk = backupOf(x); if (!bk) continue; const sx = span(x);
    const hitB = occ(y).find(o => o[2] === bk && ov(sx.s, sx.e, o[0], o[1]));
    if (hitB){ const z = {from:Math.max(sx.s, hitB[0]), to:Math.min(sx.e, hitB[1]), lanes:[bk]}; add(x,"warn","Ausweichraum "+bk+" bei Schlechtwetter belegt durch „"+evName(y)+"“", z); add(y,"warn","Belegt Ausweichraum "+bk+" von „"+evName(x)+"“", z); } }
  const ovz = (lanes) => ({from:Math.max(sa.s,sb.s), to:Math.min(sa.e,sb.e), lanes});
  if (ov(sa.s, sa.e, sb.s, sb.e)) (a.refs||[]).filter(r => (b.refs||[]).includes(r)).forEach(r => { const n = (S.referents[r]||{}).name || r, z = ovz([...new Set(roomsOf(a).concat(roomsOf(b)))]); add(a,"err",n+" gleichzeitig bei „"+evName(b)+"“", z); add(b,"err",n+" gleichzeitig bei „"+evName(a)+"“", z); });
  const oa = occ(a), ob = occ(b);
  let hit = null;
  const shr = shareEnd(a, b), dk = dockOK(a, b);
  for (const x of oa) for (const y of ob) if (!hit && x[2] === y[2] && ov(x[0], x[1], y[0], y[1]) && !(shr && x[5] && y[5]) && !(dk && !ov(x[3], x[4], y[3], y[4])) && !nachlaufLK(a, b, x, y)) hit = [x, y];
  if (hit){
    const [x, y] = hit; let why = "";
    if (!ov(x[3], x[4], y[3], y[4])){ const first = x[3] < y[3] ? a : b, second = first === a ? b : a;
      why = " (Nachlauf/Abbau „"+evName(first)+"“ ↔ Check-in/Aufbau „"+evName(second)+"“)"; }
    const z = {from:Math.max(x[0],y[0]), to:Math.min(x[1],y[1]), lanes:[x[2]]};
    add(a,"err","Raumkonflikt "+hit[0][2]+(why ? why : " mit „"+evName(b)+"“"), z); add(b,"err","Raumkonflikt "+hit[0][2]+(why ? why : " mit „"+evName(a)+"“"), z);
  }
  const ra = allRooms(a), rb = allRooms(b), shared = ra.filter(r => rb.includes(r));
  if (ov(sa.s, sa.e, sb.s, sb.e) && !shareEnd(a, b)){
    for (const [x, y] of [[a, b], [b, a]]){ const lx = egLevel(x); if (lx < 2 || y.kind === "notiz") continue;
      const ry = allRooms(y).filter(r => EG.includes(r)); if (!ry.length || (lx === 2 && isBeratung(y))) continue; const z = ovz(ry);
      if (lx === 2){ add(y,"err","Parallel zu „"+evName(x)+"“ sind nur Einzelberatungen zulässig", z); add(x,"err","Parallel im EG (keine Einzelberatung): „"+evName(y)+"“", z); }
      else { add(y,"err","EG ist exklusiv belegt durch „"+evName(x)+"“", z); add(x,"err","Parallel im EG: „"+evName(y)+"“", z); } }
  }
  /* Streng exklusiv (Reihe): auch kein Aufbau, Check-in, Nachlauf oder Abbau anderer Veranstaltungen im EG während der Veranstaltung */
  for (const [x, y] of [[a, b], [b, a]]){
    if (egLevel(x) < 4 || y.kind === "notiz") continue;
    const sx = span(x); if (!sx) continue;
    { const sy = span(y); if (sy && ov(sx.s, sx.e, sy.s, sy.e) && allRooms(y).some(r => EG.includes(r))) continue; } /* gleichzeitige Belegung meldet bereits Stufe 3 */
    let q = occ(y).find(o => EG.includes(o[2]) && ov(sx.s, sx.e, o[0], o[1]));
    if (!q && arrives(y) && y.start && !y.allDay){ const st = t2m(y.start); if (ov(sx.s, sx.e, st - CI_MIN, st)) q = [st - CI_MIN, st, "Küche/Esszimmer"]; }
    if (q){ const z = {from:Math.max(sx.s, q[0]), to:Math.min(sx.e, q[1]), lanes:[q[2]]}; const t = "Ruhe im EG nötig während „"+evName(x)+"“: Belegung, Aufbau, Check-in, Nachlauf oder Abbau von „"+evName(y)+"“ ("+m2t(z.from)+"–"+m2t(z.to)+")"; add(x,"err",t,z); add(y,"err",t,z); }
    /* Rückkehr von unterwegs (Sebastian, 26.10.2026): Gäste einer Veranstaltung „unterwegs“ kommen am Ende ins EG zurück – das darf nicht während absoluter Ruhe passieren */
    else if (y.start && !y.allDay && (y.room || "").split(" + ").includes("unterwegs")){ const sy = span(y), ph = endPh(y), ret = ph ? sy.e - ph.min : sy.e;
      if (ret >= sx.s && ret < sx.e){ const z = {from:ret, to:Math.min(sx.e, ret + 15), lanes:["unterwegs"]}; const t = "Ruhe im EG nötig während „"+evName(x)+"“: Rückkehr der Gäste von unterwegs („"+evName(y)+"“, "+m2t(ret)+")"; add(x,"err",t,z); add(y,"err",t,z); } }
  }
  /* Lärm: Beratung im Wohnzimmer */
  const noise = (c, o) => {
    if (!(isBeratung(c) && roomsOf(c).includes("Wohnzimmer"))) return;
    const sc = span(c); if (!sc) return;
    const kx = occ(o).find(x => x[2] === "Küche/Esszimmer" && ov(sc.s, sc.e, x[3], x[4]));
    if (!shared.length && kx) add(c,"err","Beratung im Wohnzimmer, aber Küche belegt durch „"+evName(o)+"“ (Lärm)", {from:Math.max(sc.s,kx[3]), to:Math.min(sc.e,kx[4]), lanes:["Wohnzimmer","Küche/Esszimmer"]});
    else if (arrives(o)){ const st = t2m(o.start); if (ov(sc.s, sc.e, st - CI_MIN, st)) add(c,"warn","Ankunft/Check-in „"+evName(o)+"“ "+m2t(st-CI_MIN)+"–"+o.start+": Küche und Flur belebt (Lärm)"); }
  };
  noise(a, b); noise(b, a);
  /* Check-in (CI_MIN vor Beginn) darf nicht von einer vorhergehenden Veranstaltung überlagert werden (Ende inkl. Nachlauf) */
  const ciRule = (p, n) => { if (!arrives(p) || !arrives(n) || hit || dk) return; const sp = span(p), sn = span(n); if (!sp || !sn || sp.s >= sn.s || sp.e > sn.s) return;
    const endP = sp.e + afterOf(p); if (endP > sn.s - CI_MIN){ const z = {from:Math.max(sn.s-CI_MIN, sp.s), to:Math.min(endP, sn.s), lanes:["__ci"].concat(allRooms(p))};
      const t = "Check-in „"+evName(n)+"“ ab "+m2t(sn.s-CI_MIN)+" überlagert: „"+evName(p)+"“ endet "+m2t(sp.e)+(afterOf(p) ? " + "+afterOf(p)+" Min Nachlauf" : ""); add(n,"err",t,z); add(p,"err",t,z); } };
  ciRule(a, b); ciRule(b, a);
  /* Ankunft während exklusiver EG-Belegung */
  const exArr = (c, o) => { const lc = egLevel(c); if (lc < 2 || lc === 4 || (lc === 2 && isBeratung(o)) || !arrives(o) || !allRooms(o).length) return; const sc = span(c), st = t2m(o.start); if (sc && st > sc.s && ov(sc.s, sc.e, st - CI_MIN, st)) add(c,"warn","Ankunft/Check-in „"+evName(o)+"“ ab "+m2t(st-CI_MIN)+" während exklusiver EG-Belegung"); };
  exArr(a, b); exArr(b, a);
}
/* Akzeptierte Konflikte: meta/accepted {items:{hash:{id,t,at}}} – zählen nicht mehr als Fehler/Hinweis, bleiben in der Woche als Warnung sichtbar */
const accKey = (id, t) => { let h = 5381; const str = id + "|" + t; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return "a" + h.toString(36); };
const isAcc = (id, t) => !!(S.accepted && S.accepted[accKey(id, t)]);
function markAcc(m){ for (const [id, arr] of m) arr.forEach(x => x.acc = (x.l === "err" || x.l === "warn") && isAcc(id, x.t)); (m.zones || []).forEach(z => z.acc = z.m && z.m.length && z.m.every(q => isAcc(q.id, q.t))); return m; }
function recompute(){ ISS = markAcc(computeIssues(evList())); }
async function setAcc(members, on){
  S.accepted = Object.assign({}, S.accepted || {});
  members.forEach(q => { const k = accKey(q.id, q.t); if (on) S.accepted[k] = {id:q.id, t:q.t, at:todayStr()}; else delete S.accepted[k]; });
  render(); if (UI.drawer && UI.drawer.kind === "ev") refreshLive();
  if (db){ try { await db.doc("meta/accepted").set({items:S.accepted}); } catch(e){ toast("Akzeptieren nicht gespeichert"); } } else offTouch();
  toast(on ? "Konflikt akzeptiert – zählt nicht mehr als Fehler" : "Konflikt wieder aktiv");
}
/* Beteiligte eines Konflikts: alle Termine der Zone, sonst nur dieser Termin */
const accMembers = (id, t) => { const z = (ISS.zones || []).find(q => q.m && q.m.some(x => x.id === id && x.t === t)); return z ? z.m : [{id, t}]; };
const issuesAll = id => ISS.get(id) || [];
const issuesOf = id => issuesAll(id).filter(x => !x.acc);
const worst = id => { const a = issuesOf(id); return a.some(x => x.l === "err") ? "err" : a.some(x => x.l === "warn") ? "warn" : a.length ? "info" : ""; };
const errNoZone = id => issuesOf(id).some(x => x.l === "err" && !x.z && !/^Online-Frist/.test(x.t));
const accNoZone = id => issuesAll(id).some(x => x.acc && !x.z);

/* ---------- Bausteine ---------- */
function tbadge(name){ const t = THEMES[name] || THEMES["Sonstige"]; return `<span class="chip tbadge ${t[1]?"dark":""}" style="background:${t[0]}">${esc(name||"ohne Thema")}</span>`; }
function stchip(s){ return `<span class="chip st s-${esc((s||"").split(" ")[0])}">${esc(s||"–")}</span>`; }
function lvchips(id, max){ const a = issuesOf(id); const lab = {err:"Fehler",warn:"Hinweis",info:"Info"}; return a.slice(0, max||99).map(x => `<span class="lv ${x.l}" title="${esc(lab[x.l])}">${esc(x.t)}</span>`).join("") + (max && a.length > max ? `<span class="lv info">+${a.length-max}</span>` : ""); }
/* Quick-Help: Symbol mit Hover-/Fokus-Box (Inhalt in <template>) */
const qh = (html, label) => `<span class="qh${label?" lab":""}" tabindex="0" role="button" aria-label="${esc(label||"Hilfe")}"><span class="qhi">${label?esc(label)+" ▾":"?"}</span><template class="qht">${html}</template></span>`;
function legendThemes(){ return `<div class="lgt"><b>Themenbereiche</b>${Object.entries(THEMES).filter(([k]) => k!=="Sonstige").map(([k,v]) => `<span><i class="sw" style="background:${v[0]}"></i>${esc(k)}</span>`).join("")}<b>Wochen und Tage</b><span><i class="sw" style="background:var(--quiet);border:1px solid var(--violet-2)"></i>ruhige Woche</span><span><i class="sw" style="background:var(--pause)"></i>Pause</span><span><i class="sw" style="background:var(--hatch)"></i><i class="sw" style="background:color-mix(in srgb, var(--violet-2) 20%, var(--paper))"></i>Schulferien (Woche: nur Tageskopf)</span><span><i class="sw" style="background:var(--err-bg)"></i>Feiertag / Sperrtag</span></div>`; }
function legend(){ return `<div class="legend">${Object.entries(THEMES).filter(([k]) => k!=="Sonstige").map(([k,v]) => `<span><i class="sw" style="background:${v[0]}"></i>${esc(k)}</span>`).join("")}<span><i class="sw" style="background:var(--quiet);border:1px solid var(--violet-2)"></i>ruhige Woche</span><span><i class="sw" style="background:var(--pause)"></i>Pause</span><span><i class="sw" style="background:var(--hatch)"></i><i class="sw" style="background:color-mix(in srgb, var(--violet-2) 20%, var(--paper))"></i>Schulferien (Woche: nur Tageskopf)</span></div>`; }

/* v112: Link auf survivors-home.de (Feld web am Termin; a.clink wird von der Klick-Behandlung durchgelassen) */
const webLink = e => e && e.web && /^https?:\/\//.test(e.web.url || "") ? ` <a class="clink webl" href="${esc(e.web.url)}" target="_blank" rel="noopener" title="Auf survivors-home.de öffnen${e.web.title ? ": " + esc(e.web.title) : ""}">↗</a>` : "";
let WS_MAX_H = 36; /* Einstellungen */
/* Routine läuft nur Mo–Fr: gezählt werden nur Stunden an Werktagen (Ortszeit), sonst warnt jedes Wochenende */
function wsWorkHours(from, to){
  let ms = 0, t = new Date(from);
  while (t < to){ const n = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1), e = n < to ? n : to; const wd = t.getDay(); if (wd >= 1 && wd <= 5) ms += e - t; t = n; }
  return ms / 3600e3;
}
/* Zeitpunkt (ISO mit Zeitzone) in Ortszeit: „01.11.2026, 05:17 Uhr“ */
const wsWhen = s => { const d = new Date(s); return isNaN(d) ? bkWhen(s) : fmtY(d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate())) + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + " Uhr"; };
/* Warnleiste, wenn der Website-Abgleich (Routine) länger als 36 Werktagsstunden nicht erfolgreich lief – nicht im Team-Modus */
function wsBar(){
  if (TEAM || !S.wsLoaded) return "";
  const w = S.websync || {}, ok = w.okAt ? Date.parse(w.okAt) : NaN;
  if (!isNaN(ok) && wsWorkHours(ok, new Date()) <= WS_MAX_H) return "";
  const last = isNaN(ok) ? "noch nie erfolgreich gelaufen" : "zuletzt erfolgreich am " + wsWhen(w.okAt);
  return `<div class="wsbar" role="status"><b>Website-Abgleich ${last}.</b> Links und Status „veröffentlicht“ können veraltet sein.${w.err ? " Letzter Fehler: " + esc(w.err) : ""} Routine „Belegungsplan aktualisieren“ in claude.ai/code/routines prüfen.</div>`;
}

/* ---------- Kopfzahlen ---------- */
function renderKpis(){
  const ev = evList().filter(e => e.date.startsWith(String(YEAR)) && e.kind === "va" && e.status !== "abgesagt");
  let err = 0, warn = 0; ev.forEach(e => { const w = worst(e.id); if (w === "err") err++; else if (w === "warn") warn++; });
  const today = todayStr();
  const dls = ev.map(deadlineOf), dueE = dls.filter(x => x && x.l === "err").length, dueW = dls.filter(x => x && x.l === "warn").length;
  const umb = [...umbauMap().values()].filter(x => x && true).length;
  /* Kopfzahlen: nur Einträge mit Wert größer 0 anzeigen */
  const fix = ev.filter(e => ["fix","in WP angelegt","veröffentlicht"].includes(e.status)).length;
  const k = (n, txt, cls = "", tip = "") => n > 0 ? `<span${cls ? ` class="${cls}"` : ""}${tip ? ` title="${tip}"` : ""}><b>${n}</b>${txt}</span>` : "";
  $("#kpis").innerHTML = k(ev.length, "Termine " + YEAR) + k(umb, "Umbauten Workshopraum", "", "Umbauten der Möblierung im Workshopraum (Wechsel zwischen aufeinanderfolgenden Nutzungen)") + k(fix, "fix")
    + k(dueE, "Online-Frist verpasst", "e") + k(dueW, "Vorwarnung " + WARN_DAYS/7 + " Wo.", "w") + k(err, "mit Fehlern", "e") + k(warn, "mit Hinweisen", "w");
}

/* ---------- Ansicht: Jahr ---------- */
const stLab = st => st === "pause" ? "Pause" : st;
/* Zeitraum kurz: „5.–11. Apr.“, über Monatsgrenze „28. Sep.–4. Okt.“ */
const MON_AB = ["Jan.","Feb.","März","Apr.","Mai","Juni","Juli","Aug.","Sep.","Okt.","Nov.","Dez."];
const fmtRng = (a, b) => { const da = +a.slice(8,10), db = +b.slice(8,10), ma = MON_AB[+a.slice(5,7)-1], mb = MON_AB[+b.slice(5,7)-1]; return ma === mb ? `${da}.–${db}. ${mb}` : `${da}. ${ma}–${db}. ${mb}`; };
/* Jahresüberblick beginnt im Oktober 2026 (nachgetragene Termine), endet mit KW 52 des Planungsjahres */
const Y_FROM = "2026-10-01";
const yStartMon = () => S_(D(Y_FROM) - (wdOf(Y_FROM)+6)%7);
function viewJahr(){
  const rows = [];
  let lastM = "";
  for (let mon = yStartMon(); mon <= mondayOf(YEAR, 52); mon = S_(D(mon)+7)){
    const key = weekKey(mon), w = isoWeek(mon)[1], st = S.weeks[key] || "belebt";
    const days = [0,1,2,3,4,5].map(i => S_(D(mon)+i));
    const m = +days[3].slice(5,7) - 1, ym = days[3].slice(0,7), newM = ym !== lastM, yLab = newM && (!lastM || m === 0) ? `<small>${days[3].slice(0,4)}</small>` : ""; lastM = ym;
    let cnt = {err:0,warn:0}, notes = [], dsts = [];
    const cells = days.map(d => {
      const evs = evList().filter(e => e.date === d).sort(sortEv);
      evs.forEach(e => { const x = worst(e.id); if (x === "err") cnt.err++; else if (x === "warn") cnt.warn++; });
      const hol = FEIER[d] || (sperrOn(d) ? "Sperrtag" : ""), fer = ferienOn(d);
      if (hol) notes.push(fmt(d)+" "+hol);
      const dots = evs.map(e => { const t = theme(e); const cls = (e.kind==="vermietung"?" rent":"")+(" "+stCls(e))+(worst(e.id)==="err"?" bad":""); return e.kind==="notiz" ? `<span title="${esc(evName(e))}" class="notes">✎</span>` : `<i class="dot${cls}" style="background:${t[0]}" title="${esc((e.start||"–")+" "+evName(e))}"></i>`; }).join("");
      const chips = evs.map(e => { const t = theme(e), cls = (e.kind==="vermietung"?" rent":"")+(" "+stCls(e))+(worst(e.id)==="err"?" bad":"")+(t[1]?" dark":"");
        if (e.kind === "notiz") return `<button class="ych note" data-ev="${e.id}" title="${esc(evName(e))}">✎ ${esc(evName(e))}</button>`;
        return `<button class="ych${cls}" data-ev="${e.id}" style="--c:${e.kind==="vermietung"?"var(--muted)":t[0]}" title="${esc((e.start||"–")+" "+evName(e)+(e.room?" · "+e.room:"")+" · "+(e.status||""))}"><b>${esc(e.allDay?"ganzt.":(e.start||"–"))}</b> ${esc(evName(e))}${e.status==="veröffentlicht"?" ✓":""}</button>`; }).join("");
      /* Mini-Zeitstrahl 10–21 Uhr: Belegung je Tag, Überschneidungen in Spuren */
      const T0 = Math.floor(t2m(OPEN_FROM)/60)*60, T1 = Math.ceil(t2m(OPEN_TO)/60)*60, TS = T1 - T0, lanesEnd = [], segs = [];
      evs.filter(e => e.kind !== "notiz" && span(e)).sort((a,b) => span(a).s - span(b).s).forEach(e => {
        const sp = span(e); let li = lanesEnd.findIndex(x => x <= sp.s); if (li < 0){ li = lanesEnd.length; lanesEnd.push(0); } lanesEnd[li] = sp.e + (e.allDay ? 0 : afterOf(e));
        segs.push({e, sp, li}); });
      const nl = Math.max(1, lanesEnd.length);
      let busy = 0, cur = -1; segs.map(x => [Math.max(T0,x.sp.s), Math.min(T1,x.sp.e)]).sort((a,b) => a[0]-b[0]).forEach(([a,b]) => { if (b <= cur) return; busy += b - Math.max(a, cur); cur = Math.max(cur, b); });
      const tl = segs.map(({e, sp, li}) => { const t = theme(e), l = Math.max(0,(sp.s-T0)/TS*100), w = Math.max(1.5,(Math.min(sp.e,T1)-Math.max(sp.s,T0))/TS*100);
        return `<i class="yseg${e.kind==="vermietung"?" rent":""}${" "+stCls(e)}${worst(e.id)==="err"?" bad":""}" style="left:${l}%;width:${w}%;top:${li/nl*100}%;height:${100/nl}%;background-color:${e.kind==="vermietung"?"var(--muted)":t[0]}" title="${esc((e.start||"–")+"–"+m2t(sp.e)+" "+evName(e))}"></i>` + (afterOf(e) && !e.allDay && sp.e < T1 ? `<i class="ytail" style="left:${(sp.e-T0)/TS*100}%;width:${Math.min(afterOf(e), T1-sp.e)/TS*100}%;top:${li/nl*100}%;height:${100/nl}%;--c:${e.kind==="vermietung"?"var(--muted)":t[0]}" title="${esc("Nachlauf Gäste bis "+m2t(sp.e+afterOf(e))+" · "+evName(e))}"></i>` : ""); }).join("");
      const noteMark = evs.some(e => e.kind === "notiz") ? `<span class="notes" title="${esc(evs.filter(e => e.kind==="notiz").map(evName).join(", "))}">✎</span>` : "";
      const dst = dayState(evs), past = d < todayStr(); dsts.push(dst);
      const sts = staysOn(d), sIcon = sts.length ? `<span class="sti${sts.every(q => q.x.status === "gebucht") ? "" : " vm"}" title="${esc(sts.map(q => stayTip(q.x)).join("\n"))}">${BED}</span>` : "";
      const dIcon = dst === "er" ? `<span class="dsi er" title="Online-Frist verpasst">!</span>` : dst === "wn" ? `<span class="dsi wn" title="Vorwarnung: Status zu niedrig (${WARN_DAYS/7} Wochen vorher mind. fix)">!</span>` : dst === "ok" ? `<span class="dsi ok" title="Alle Termine veröffentlicht">✓</span>` : "";
      return `<td class="dcell${hol?" hol":""}${fer?" fer":""}${past?" past":""}" data-goweek="${d}" title="${esc(fer||"")}"><span class="dn">${d.slice(8)}${dIcon}${sIcon}${busy ? `<span class="busy">${String(Math.round(busy/30)/2).replace(".",",")} h</span>` : ""}${noteMark}</span><div class="dots"><div class="ytl">${tl}</div></div><div class="ychips">${chips}</div></td>`;
    }).join("");
    const fer = [...new Set(days.map(ferienOn).filter(Boolean).concat(days.flatMap(d => fairsOn(d).map(f => "Messe: " + f.name))))];
    const kwSt = dsts.includes("er") ? " kw-er" : dsts.includes("wn") ? " kw-wn" : (dsts.some(Boolean) && dsts.every(x => x === "ok" || x === "") && dsts.includes("ok") ? " kw-ok" : ""), wPast = S_(D(mon)+6) < todayStr();
    rows.push(`<tr class="${st}${newM?" month":""}${wPast?" past":""}${UI.yOpen === key ? " yopen" : ""}" data-ykw="${key}"><td class="mname">${newM?MONTHS[m].slice(0,3)+yLab:""}</td><td class="kw${kwSt}" title="${kwSt===" kw-er"?"Woche mit verpasster Online-Frist":kwSt===" kw-wn"?"Woche mit Vorwarnung":kwSt===" kw-ok"?"Alle Tage mit Veranstaltungen haben ✓ (alle veröffentlicht)":""}">${w}</td><td class="rng">${fmtRng(days[0], S_(D(mon)+6))}</td><td><button class="wkst ${st}" data-wk="${key}">${stLab(st)}</button></td>${cells}<td class="notes">${esc([...fer, ...notes].join(" · "))}</td><td class="wkissue">${cnt.err?`<span class="lv err">${cnt.err}</span> `:""}${cnt.warn?`<span class="lv warn">${cnt.warn}</span>`:""}</td></tr>`);
  }
  const yHelp = `<b>Jahresüberblick</b> (Oktober 2026 bis Dezember ${YEAR})<ul><li>Tag anklicken öffnet die Wochenansicht; neue Termine dort mit „+ Termin“ am Tag anlegen.</li><li>Termin anklicken öffnet den Termin.</li><li><b>Ungespeicherte Änderungen</b> im Dialog: geänderte Felder magenta umrahmt mit Balken links, betroffene Bereiche mit „● geändert“, unten die Anzahl. Verschwindet nach „Speichern“ oder wenn der alte Wert wieder eingetragen wird.</li><li><b>Duplizieren</b> (im Termin): übernimmt alle Einstellungen inkl. Status; nur die Startzeit ist leer und muss neu eingetragen werden. Das Duplikat ist oben violett als „Duplikat“ markiert und erst nach „Speichern“ angelegt.</li><li>Kompakt: Maus über eine Woche zeigt deren Termine mit Startzeit.</li><li>Kopfleiste und Steuerleiste bleiben beim Scrollen oben stehen.</li><li>Die oberste sichtbare Woche wird gemerkt: beim Zurückwechseln (auch nach Neuladen) steht der Überblick wieder dort.</li><li><b>Heute</b>: schiebt die aktuelle Woche ganz nach oben und klappt sie auf (bleibt aufgeklappt, bis eine andere Darstellung gewählt wird). Liegt heute außerhalb des Überblicks, springt er zur ersten bzw. letzten Woche.</li><li>Zeitstrahl je Tag: Belegung ${OPEN_FROM}–${OPEN_TO} Uhr, Zahl = belegte Stunden.</li><li>Roter blinkender Punkt: Termin mit Fehler.</li><li>Blass/gestrichelt: Idee, Option, angefragt (je blasser, desto früher im Ablauf).</li><li>Am Tag: <b style="color:#2e8b57">✓</b> alle Termine veröffentlicht · <b style="color:#e8a200">!</b> Vorwarnung (${WARN_DAYS/7} Wochen vorher Status unter „fix“) · <b style="color:#e5322d">!</b> Online-Frist verpasst (${ON_DAYS/7} Wochen vorher nicht veröffentlicht).</li><li>Farbige Kante an der KW: rot = ein Tag mit verpasster Online-Frist, gelb = ein Tag mit Vorwarnung, grün = jeder Tag mit Veranstaltungen hat ✓ (leere Tage und Tage nur mit Notizen oder Einträgen „vermietet oder nicht öffentlich“ zählen nicht).</li><li>Am Tag: <span class="sti">${BED}</span> Übernachtungsgäste im Dachgeschoss (blass = vorgemerkt); Messen in Berlin stehen rechts in der Notizspalte. Details im Reiter „Übernachtungen“.</li><li>Vergangene Tage und Wochen: schraffiert.</li></ul>`;
  /* Steuerleiste + Tabellenkopf kommen in die feste Kopfleiste (ein einziges klebendes Element) */
  const cg = `<colgroup><col class="c-m"><col class="c-kw"><col class="c-rng"><col class="c-st"><col class="c-d"><col class="c-d"><col class="c-d"><col class="c-d"><col class="c-d"><col class="c-d"><col class="c-note"><col class="c-iss"></colgroup>`;
  UI.yHead = `<div class="hwrap"><div class="head"><div class="weeknav ynav"><span class="seg" role="group" aria-label="Darstellung"><button class="btn ${UI.yearDetail?"":"primary"}" data-ydet="0">Kompakt</button><button class="btn ${UI.yearDetail?"primary":""}" data-ydet="1">Details</button></span><button class="btn" data-ytoday="1" title="Zur aktuellen Woche springen und sie aufklappen">Heute</button><h2>Jahresüberblick ${qh(`<div class="qcols"><div>${yHelp}</div><div>${legendThemes()}</div></div>`)}</h2></div></div><div class="scroll yhs"><table class="year${UI.yearDetail?" detail":""}">${cg}<thead><tr><th></th><th>KW</th><th>Zeitraum</th><th class="nw">Status ${qh(`<b>Wochenstatus</b><ul><li>Klick auf den Status wechselt: belebt → ruhig → Pause.</li><li><b>belebt</b>: normales Programm.</li><li><b>ruhig</b>: so wenig Programm wie möglich, regulär nur Walk and Talk; andere Reihen nur, wenn sie es erlauben oder als Ausnahme.</li><li><b>Pause</b>: keine Termine.</li></ul>Die Prüfung und die Jahresplanung berücksichtigen den Status.`)}</th><th>Mo</th><th>Di</th><th>Mi</th><th>Do</th><th>Fr</th><th>Sa</th><th>Ferien / Feiertage</th><th>Prüfung ${qh("Fehler, Hinweise und Infos der Termine dieser Woche. Details im Reiter „Prüfung“ oder im Termin.")}</th></tr></thead></table></div></div>`;
  return `<div class="scroll ybody"><table class="year${UI.yearDetail?" detail":""}">${cg}<tbody>${rows.join("")}</tbody></table></div>`;
}

/* Jahr: „Heute“ springt zur aktuellen Woche und klappt sie auf (Kompakt). Liegt heute außerhalb des Überblicks, erste bzw. letzte Woche. */
function yearToday(){
  const t = todayStr(), [y, w] = isoWeek(t), first = yStartMon(), last = mondayOf(YEAR, 52);
  let key = weekKey(t), out = "";
  if (t < first || t > S_(D(last)+6)){ const before = t < first; key = weekKey(before ? first : last); out = `Heute (KW ${w}/${y}) liegt ${before ? "vor" : "nach"} dem Jahresüberblick – gesprungen zur ${before ? "ersten" : "letzten"} Woche.`; }
  UI.yOpen = key; render();
  /* render() zeichnet im nächsten Frame – danach scrollen */
  requestAnimationFrame(() => { const row = yScrollTo(key, true); if (row) row.classList.add("yflash"); if (out) toast(out); });
}
/* Woche ganz oben ausrichten, direkt unter Kopfleiste + Steuerleiste (beide kleben) */
function yStickyH(){ const hd = document.querySelector("header.top"); return hd ? hd.offsetHeight : 0; }
function yScrollTo(key, smooth){
  const row = key && document.querySelector(`tr[data-ykw="${key}"]`); if (!row) return null;
  const top = row.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({top: Math.max(0, top - yStickyH() - 4), behavior: smooth ? "smooth" : "auto"}); return row;
}
/* Jahresüberblick: oberste sichtbare Woche merken (auch über Neuladen) */
(() => { let tm = 0;
  window.addEventListener("scroll", () => { if (UI.view !== "jahr" || UI.mob || !S.loaded || UI.yRestore) return; clearTimeout(tm); tm = setTimeout(() => {
    const lim = yStickyH() + 10, row = [...document.querySelectorAll("tr[data-ykw]")].find(r => r.getBoundingClientRect().bottom > lim);
    if (row && row.dataset.ykw !== UI.yPos){ UI.yPos = row.dataset.ykw; try { localStorage.setItem("shp-ypos", UI.yPos); } catch(e){} } }, 200); }, {passive:true});
})();

/* ---------- Ansicht: Woche ---------- */
const wkLegend = () => {
  const smp = (inner, h) => `<div class="lgs"${h?` style="height:${h}px"`:""}>${inner}</div>`;
  const row = (sample, text) => `<div class="lgr">${sample}<div>${text}</div></div>`;
  const c = "#3f8fc4";
  return `<b>So liest du die Wochenansicht</b><div class="lgrid">`
   + [["st-idee","Idee: nur denkbar, noch nichts geprüft"],["st-opt","Option: intern vorgemerkt, noch nicht angefragt"],["st-anf","angefragt: Referent ist gefragt"],["st-zug","zugesagt: Referent hat bestätigt"],["st-fix","fix: intern freigegeben, alle Angaben komplett"],["st-wp","in WP angelegt: in WordPress angelegt"],["st-pub","veröffentlicht: online auf survivors-home.de"],["st-abg","abgesagt"]].map(([k,t]) => row(smp(`<button class="blk ${k}" style="left:10%;width:70%;background-color:${c};--c:${c}"><small>14:00</small>Termin${k==="st-wp"?'<span class="smk">WP</span>':k==="st-pub"?'<span class="smk">✓ online</span>':""}</button>`), t)).join("")
   + row(`<div class="lgs" style="background:var(--quiet);border:3px solid var(--violet-2)"></div>`, "Ruhige Woche: violetter Hinweisbalken oben, dicker violetter Rahmen, getönte Tagesflächen, Statusknopf violett gefüllt. Programmpause: grauer Balken, gestrichelter Rahmen.")
   + row(smp(`<button class="blk draft" style="left:10%;width:55%;background-color:${c};--c:${c};animation:none"><small>Entwurf · 14:00</small>Termin</button><div class="oldpos" style="left:70%;width:25%">bisher</div>`), "Vorschau beim Bearbeiten, Neuanlegen oder Duplizieren: der geöffnete Termin bzw. sein Entwurf aus dem Dialog rechts erscheint sofort hier, magenta blinkend umrandet, die gespeicherte Lage gepunktet als „bisher“. Die Woche springt mit dem Datum mit; bei Änderung von Datum, Zeit, Dauer oder Raum wechselt die Ansicht automatisch in die Woche. Abbrechen führt zur vorherigen Ansicht zurück, Speichern bleibt in der neuen Woche.")
   + row(smp(`<button class="blk st-opt" style="left:10%;width:80%;background-color:${c};--c:${c}">Termin<span class="dlb warn">⏱ 2 Wo.</span></button>`), "Vorwarnung: ab " + WARN_DAYS/7 + " Wochen vorher, solange der Status unter „fix“ liegt (Zahl = Wochen bis zur " + ON_DAYS/7 + "-Wochen-Frist)")
   + row(smp(`<button class="blk st-zug" style="left:10%;width:80%;background-color:${c};--c:${c}">Termin<span class="dlb err">⏱ überfällig</span></button>`), "Online-Frist verpasst: " + ON_DAYS/7 + " Wochen vorher nicht veröffentlicht (Fehler)")
   + row(smp(`<div class="setup" style="left:6%;width:30%"></div><button class="blk" style="left:36%;width:54%;background-color:${c}">Hybrid</button>`), "Schraffiert davor: Technik-Aufbau")
   + row(smp(`<button class="blk" style="left:6%;width:54%;background-color:${c}">Termin</button><div class="tail" style="left:60%;width:24%;--c:${c}"></div>`), "Gestrichelter Anhang: Nachlauf Gäste (Raum belegt, zählt nicht zur Veranstaltungszeit)")
   + row(smp(`<div class="excl" style="left:6%;width:80%"></div>`), "Schraffierte Fläche in anderen Räumen: EG exklusiv belegt (Stufe 3 „kein anderes Programm“ bzw. 4 „absolute Ruhe“)")
   + row(smp(`<div class="excl ex2" style="left:6%;width:80%"></div>`), "Leichter schraffiert: Stufe 2 – parallel nur Einzelberatungen zulässig")
   + row(smp(`<div class="bkp" style="left:6%;width:70%;--c:${c}">Qigong</div>`), "Gestrichelter Rahmen: Ausweichraum bei Schlechtwetter (freihalten)")
   + row(smp(`<div class="ci" style="left:30%;width:20%"></div>`, 22), "Check-in-Zeile: " + CI_MIN + " Min vor Beginn sind Küche und Flur belebt")
   + row(smp(`<div class="ci" style="left:10%;width:16%"></div><div class="ci run" style="left:26%;width:60%"></div>`, 22), "Heller gestreift: durchgehender Check-in während der Veranstaltung")
   + row(smp(`<button class="blk" style="left:6%;width:50%;background-color:${c}">A</button><button class="blk" style="left:56%;width:38%;background-color:${c}">B</button><div class="zone" style="left:48%;width:16%"></div>`), "Rot-weiß mit laufendem Rand: Fehlerstelle – Maus darüber zeigt den Grund, Klick öffnet „Akzeptieren“")
   + row(smp(`<button class="blk" style="left:6%;width:50%;background-color:${c}">A</button><button class="blk" style="left:56%;width:38%;background-color:${c}">B</button><div class="zone acc" style="left:48%;width:16%"></div>`), "Gelb-weiß: akzeptierter Konflikt (zählt nicht mehr als Fehler; Klick: wieder aktivieren)")
   + row(smp(`<button class="blk bad" style="left:10%;width:70%;background-color:${c}">Termin</button>`), "Ganzer Block umrandet: Fehler ohne Zeitstelle, z. B. falscher Wochentag")
   + row(smp(`<button class="livem" style="left:10%;width:70%;--c:${c}">● Live · Termin</button>`), "Zeile „online“: hybride Veranstaltung mit Live-Übertragung")
   + row(smp(`<button class="blk h1" style="left:20%;width:50%;background-color:${c}"><small>gemeinsam</small>A</button><button class="blk h2" style="left:20%;width:50%;background-color:#6aa84f"><small>gemeinsam</small>B</button>`), "Zwei halbe Blöcke: gemeinsamer Abschluss zweier Reihen im selben Raum (gewollt, keine Doppelbelegung)")
   + row(smp(`<span class="fur" style="left:8%">□</span><span class="fur" style="left:30%">○</span><span class="fur" style="left:52%">≡</span><span class="fur chg" style="left:72%">⇄ ⊞</span>`), "Workshopraum-Möblierung: □ leer · ○ Stuhlkreis · ≡ Stuhlreihen · ⊞ Tische mit Stühlen; ⇄ = vorher Umbau nötig (Maus zeigt von → nach)")
   + row(`<div class="lgs lgn"></div>`, "Schraffierter Streifen zwischen Tagen: Nacht (21–10 Uhr)")
   + row(`<div class="lgs" style="position:relative;height:34px"><button class="blk" style="left:5%;width:45%;top:2px;bottom:auto;height:13px;background-color:${c};--c:${c}"></button><div class="cnx mid" style="left:50%;top:15px;bottom:auto;height:4px"></div><div class="cnx t-dn" style="left:50%;top:19px;height:2px"></div><button class="blk" style="left:50%;width:30%;top:21px;bottom:auto;height:11px;background-color:${c};--c:${c}"></button></div>`, "Abschluss in einem anderen Raum (z. B. Walk and Talk am Esstisch): dunkle Verbindungslinie mit Pfeil vom Hauptteil zum Abschluss. Maus auf einen Teil hebt alle Teile derselben Veranstaltung hervor.")
   + row(`<div class="lgs" style="position:relative"><div class="alt ok" style="left:4%;width:44%"></div><div class="alt wn" style="left:52%;width:44%"></div></div>`, "Alternativen (nur bei geöffnetem Termin): grün schraffiert = hier passt der Termin mit gleicher Dauer und gleichem Raum ohne Konflikt, gelb = nur mit Hinweis (z. B. ruhige Woche, Lärm). Geprüft werden alle Regeln: andere Termine, Reihe, Referent, Feiertage, Pausen, Kernöffnungszeit. Beginn in " + ALT_STEP + "-Minuten-Schritten, Montag bis Freitag (Samstag nur bei Samstagsterminen), Wochen mit Programmpause ohne Schraffur, ruhige Wochen gelb (außer die Reihe erlaubt ruhige Wochen). Mit ← → durch die Wochen blättern, die Schraffur rechnet je Woche neu. Maus auf die Schraffur zeigt die möglichen Beginnzeiten und bei Gelb den Grund. Schalter oben: „Alternativen ausblenden“. Unter dem Raster listet „Mögliche Zeiten“ alle Startfenster über mehrere Wochen (als Tabelle kopierbar, übernehmbar).")
   + `</div><div class="notes">Kopfzeile: ← → blättert, Datumsfeld springt zu einer Woche, rechts der Wochenstatus (Klick: belebt → ruhig → Pause). „+ Termin“ legt einen Termin an diesem Tag an. Oben Mo–Mi, unten Do–Sa. Zeitachse je Tag ${OPEN_FROM}–${OPEN_TO} Uhr, länger, wenn Termine früher beginnen oder später enden. Maus auf einen Block zeigt Name, Zeit und Raum.</div>`;
};
let UMB = new Map();
/* Alternativen: mögliche Lagen des geöffneten Termins in der angezeigten Woche (gleiche Dauer und Räume, alle Prüfregeln inkl. Reihe und Referent) */
const ALT_IGN = /^Online-Frist|^Vorwarnung|Startzeit offen|Raum offen|^Termineinladung/;
/* v110: Beginn nur in 30-Min-Schritten; nur Mo–Fr (Samstag nur, wenn der Originaltermin auf einem Samstag liegt); Programmpausen ausgelassen */
let ALT_STEP = 30; /* Einstellungen */
function altOrig(dr){ const id = UI.drawer && UI.drawer.kind === "ev" && UI.drawer.id, o = id && S.events[id]; return (o && o.date) || UI.altD0 || (dr && dr.date) || ""; }
function altDayOk(dr, d){ const w = wdOf(d); if (w === 0) return false; if (w === 6 && wdOf(altOrig(dr) || d) !== 6) return false; return weekStatus(d) !== "pause"; }
function altSlots(dr, base, d){
  if (!altDayOk(dr, d)) return [];
  const dayL = base.filter(e => e.date === d), b0 = new Set(), quiet = weekStatus(d) === "ruhig" && ((S.series[dr.seriesId] || {}).quiet || "nein") !== "ja";
  for (const [id,a] of computeIssues(dayL)) for (const x of a) if (x.l === "err") b0.add(id + "|" + x.t);
  const dur = +dr.dur || 0, aft = afterOf(dr), out = [];
  for (let s = Math.ceil(t2m(OPEN_FROM) / ALT_STEP) * ALT_STEP; s + dur + aft <= t2m(OPEN_TO); s += ALT_STEP){
    const c = Object.assign({}, dr, {id:"__alt", date:d, start:m2t(s)}); delete c.__draft;
    let bad = false; const why = [];
    for (const [id,a] of computeIssues(dayL.concat([c]))){ for (const x of a){ if (ALT_IGN.test(x.t)) continue;
      if (id === "__alt"){ if (x.l === "err") bad = true; else if (x.l === "warn" && !why.includes(x.t)) why.push(x.t); } else if (x.l === "err" && !b0.has(id + "|" + x.t)) bad = true; } if (bad) break; }
    if (quiet && !why.some(t => /^Ruhige Woche/.test(t))) why.unshift("Ruhige Woche");
    if (!bad) out.push({s, w:why.length > 0, r:why.join(" · ")});
  }
  return out;
}
/* Startzeiten zu Bereichen zusammenfassen: "10:00–11:30, 14:00" */
const altRanges = arr => { const r = []; arr.forEach(x => { const l = r[r.length-1]; if (l && x.s - l[1] === ALT_STEP) l[1] = x.s; else r.push([x.s, x.s]); }); return r.map(([a,b]) => a === b ? m2t(a) : m2t(a) + "–" + m2t(b)).join(", "); };
function altGo(d){ UI.week = d; if (UI.dayOnly) UI.dayOnly = d; UI.restoreY = 0; UI.altFlash = d; render(); }
/* Liste möglicher Zeiten (v107): alle Startfenster je Tag über einen wählbaren Zeitraum, Kopie für Mailvorschläge */
const ALT_RG = [["4w","4 Wochen"],["3m","3 Monate"],["jahr","bis Jahresende"]];
const WDF = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
let ALTC = null;
/* aufeinanderfolgende Startzeiten gleicher Art (ok / mit Hinweis) zu Fenstern zusammenfassen */
const altWins = arr => { const r = []; arr.forEach(x => { const l = r[r.length-1]; if (l && x.s - l.b === ALT_STEP && l.w === x.w && l.r === (x.r || "")) l.b = x.s; else r.push({a:x.s, b:x.s, w:x.w, r:x.r || ""}); }); return r; };
/* v110: „bis Jahresende“ = 31.12. des laufenden Jahres; liegen bis dahin weniger als 3 Monate (ab 1. Oktober), 31.12. des Folgejahres */
const altYearEnd = from => { const y = +from.slice(0,4); return (from.slice(5) >= "10-01" ? y + 1 : y) + "-12-31"; };
function altSpan(){
  /* Beginn bleibt fest, solange der Dialog offen ist (Woche beim ersten Anzeigen), damit Sprünge aus der Liste die Liste nicht verschieben */
  if (!UI.altFrom){ UI.altFrom = UI.dayOnly || UI.week || todayStr(); const dr0 = PREV && PREV.list.find(e => e.__draft); UI.altD0 = dr0 ? dr0.date : ""; }
  const base = UI.altFrom, [y,w] = isoWeek(base), mon = mondayOf(y,w), td = todayStr();
  const from = mon < td ? td : mon, rg = UI.altRange || "4w";
  const to = rg === "jahr" ? altYearEnd(from) : rg === "3m" ? S_(D(mon) + 90) : S_(D(mon) + 27);
  return {from, to, rg};
}
function altList(dr, base){
  const sp = altSpan();
  const key = JSON.stringify([sp, PREV_FIELDS.filter(k => k !== "date" && k !== "start").map(k => dr[k]), dr.refs, dr.excl, dr.kind, dr.theme,
    base.map(e => [e.id, e.date, e.start, e.dur, e.room, e.status, e.allDay, (e.refs||[]).join()].join("|")).join(";"), S.weeks, Object.keys(S.absences||{}).length, wdOf(altOrig(dr) || "2027-01-04") === 6]);
  if (ALTC && ALTC.key === key) return ALTC;
  const days = [];
  for (let n = D(sp.from); n <= D(sp.to); n++){ const d = S_(n); if (!altDayOk(dr, d)) continue;
    const ws = altWins(altSlots(dr, base, d)); if (ws.length) days.push({d, ws}); }
  return ALTC = {key, sp, days};
}
const altWinTxt = x => x.a === x.b ? m2t(x.a) : m2t(x.a) + "–" + m2t(x.b);
const durTxt = m => { m = +m || 0; const h = Math.floor(m/60), r = m % 60; return (h ? h + " Std." : "") + (h && r ? " " : "") + (r ? r + " Min." : ""); };
function altListHtml(dr, base){
  const L = altList(dr, base), sp = L.sp, nW = L.days.reduce((a,x) => a + x.ws.length, 0), nH = L.days.reduce((a,x) => a + x.ws.filter(w => w.w).length, 0);
  let lastK = "", rows = "";
  L.days.forEach(x => { const [y,w] = isoWeek(x.d), k = y + "-W" + pad(w), st = S.weeks[k] || "belebt";
    if (k !== lastK){ lastK = k; rows += `<div class="alk">KW ${w}${st !== "belebt" ? " · " + stLab(st) : ""}</div>`; }
    rows += `<div class="ald"><button class="aldt" data-altgo="${x.d}" title="Tag in der Wochenansicht zeigen">${WD[wdOf(x.d)]} ${fmtY(x.d)}</button><span class="alws">${x.ws.map(v =>
      `<span class="alc ${v.w ? "wn" : "ok"}"><button class="alcg" data-altgo="${x.d}" title="${esc((v.w ? "Nur mit Hinweis: " + (v.r || "–") : "Ohne Konflikt") + " – Beginn " + altWinTxt(v) + " Uhr. Klick: Tag in der Wochenansicht zeigen")}">${altWinTxt(v)}</button><button class="alcs" data-altset="${x.d}|${m2t(v.a)}" title="${esc("Datum " + fmtY(x.d) + " und Beginn " + m2t(v.a) + " in den Termin übernehmen")}">übernehmen</button></span>`).join("")}</span></div>`; });
  const help = qh(`<b>Mögliche Zeiten</b><ul><li>Listet alle Startfenster, in denen der geöffnete Termin mit gleicher Dauer und gleichem Raum passt – nach denselben Regeln wie die Schraffur in der Wochenansicht.</li><li>Grün = ohne Konflikt, gelb = nur mit Hinweis (z. B. ruhige Woche, Lärm). Maus auf ein gelbes Fenster zeigt den Grund. In ruhigen Wochen gelb, außer die Reihe erlaubt ruhige Wochen.</li><li>„14:00–15:30“ heißt: Beginn zwischen 14:00 und 15:30 möglich (${ALT_STEP}-Minuten-Schritte).</li><li>Zeitraum: ab der Woche, die beim Öffnen des Termins angezeigt war (frühestens heute), 4 Wochen, 3 Monate oder bis zum Jahresende. Ab 1. Oktober (weniger als 3 Monate bis zum Jahresende) gilt das Ende des Folgejahres; das Jahr steht in der Auswahl. Die Liste bleibt beim Blättern gleich.</li><li>Geprüft werden Montag bis Freitag; Samstag nur, wenn der Termin selbst auf einem Samstag liegt. Wochen mit Programmpause werden ausgelassen. Dasselbe gilt für die Schraffur in der Wochenansicht.</li><li>Klick auf Datum oder Zeit: springt zu diesem Tag in der Wochenansicht. „übernehmen“ setzt Datum und Beginn (Anfang des Fensters) in den Termin; gespeichert wird erst mit „Speichern“.</li><li>„Als Tabelle kopieren“: je Zeitfenster eine Zeile mit den Spalten Wochentag, Datum, Status (grüner/gelber Punkt mit „frei“ bzw. „mit Hinweis“) und Beginn. Lässt sich in Outlook, Word und Excel einfügen; in Excel landen die Werte in getrennten Spalten.</li></ul>`);
  return `<section class="altlist" aria-label="Mögliche Zeiten"><div class="alh"><h3>Mögliche Zeiten${help}</h3><span class="alsub">${esc(evName(dr))} · ${esc(durTxt(dr.dur))} · ${esc(dr.room || "Raum offen")} · ${fmtY(sp.from)}–${fmtY(sp.to)}</span><span class="altools"><select class="in" data-altrg="1" aria-label="Zeitraum">${ALT_RG.map(([v,l]) => `<option value="${v}"${sp.rg === v ? " selected" : ""}>${v === "jahr" ? l + " " + altYearEnd(altSpan().from).slice(0,4) : l}</option>`).join("")}</select><button class="btn" data-altcopy="tab"${nW ? "" : " disabled"} title="Tabelle mit den Spalten Wochentag, Datum, Status, Beginn kopieren (für Mail, Word oder Excel)">Als Tabelle kopieren</button></span></div>`
    + (nW ? `<div class="alsum">${L.days.length} Tage · ${nW} Startfenster${nH ? ` · davon ${nH} nur mit Hinweis` : ""}</div><div class="alrows">${rows}</div>` : `<div class="alsum">Im gewählten Zeitraum keine passende Lage.</div>`) + `</section>`;
}
const ALT_DOT = {ok:"#2e7d4f", wn:"#e0a100"};
function altCopyData(){
  if (!ALTC || !PREV) return null;
  const dr = PREV.list.find(e => e.__draft); if (!dr) return null;
  const dl = d => WD[wdOf(d)] + "., " + (+d.slice(8,10)) + ". " + MONTHS[+d.slice(5,7)-1] + " " + d.slice(0,4);
  const w1 = v => v.a === v.b ? "um " + m2t(v.a) + " Uhr" : "zwischen " + m2t(v.a) + " und " + m2t(v.b) + " Uhr";
  const head = "Mögliche Termine für „" + evName(dr) + "“ (Dauer " + durTxt(dr.dur) + "):";
  const text = head + "\n" + ALTC.days.map(x => "– " + dl(x.d) + ": Beginn " + x.ws.map(w1).join(" oder ")).join("\n");
  const dot = v => `<span style="color:${v.w ? ALT_DOT.wn : ALT_DOT.ok}">&#9679;</span>&nbsp;`;
  const html = `<div style="${MAIL_CSS.body}"><p style="${MAIL_CSS.p}">${esc(head)}</p><p style="${MAIL_CSS.p}">` + ALTC.days.map(x => `<b>${esc(dl(x.d))}</b>: Beginn ` + x.ws.map(v => dot(v) + esc(w1(v))).join(" oder ")).join("<br>") + `</p></div>`;
  return {text, html};
}
function altCopyText(){ const c = altCopyData(); return c ? c.text : ""; }
/* v110: Tabelle (HTML-Tabelle + tabulatorgetrennter Text) – je Zeitfenster eine Zeile */
function altCopyTable(){
  if (!ALTC || !PREV) return null;
  const dr = PREV.list.find(e => e.__draft); if (!dr) return null;
  const dt = d => (+d.slice(8,10)) + ". " + MONTHS[+d.slice(5,7)-1] + " " + d.slice(0,4);
  const tm = v => v.a === v.b ? m2t(v.a) + " Uhr" : m2t(v.a) + "–" + m2t(v.b) + " Uhr";
  const rows = ALTC.days.flatMap(x => x.ws.map(v => ({wd:WD[wdOf(x.d)] + ".", d:dt(x.d), st:v.w ? "mit Hinweis" : "frei", w:v.w, t:tm(v)})));
  const head = "Mögliche Termine für „" + evName(dr) + "“ (Dauer " + durTxt(dr.dur) + ")", H = ["Wochentag","Datum","Status","Beginn"];
  const text = head + "\n" + H.join("\t") + "\n" + rows.map(r => [r.wd, r.d, r.st, r.t].join("\t")).join("\n");
  const td = "padding:3px 14px 3px 0;border-bottom:1px solid #e3dce6;vertical-align:top;white-space:nowrap";
  const html = `<div style="${MAIL_CSS.body}"><p style="${MAIL_CSS.p}">${esc(head)}:</p><table style="${MAIL_CSS.table}"><thead><tr>${H.map(h => `<th style="${MAIL_CSS.th}">${h}</th>`).join("")}</tr></thead><tbody>`
    + rows.map(r => `<tr><td style="${td}">${esc(r.wd)}</td><td style="${td};font-weight:bold">${esc(r.d)}</td><td style="${td}"><span style="color:${r.w ? ALT_DOT.wn : ALT_DOT.ok}">&#9679;</span>&nbsp;${esc(r.st)}</td><td style="${td}">${esc(r.t)}</td></tr>`).join("") + `</tbody></table></div>`;
  return {text, html};
}
function viewWoche(o){
  o = o || {}; const MOB = !!o.mob;
  const L = PREV ? PREV.list : evList(), IS = PREV ? PREV.iss : ISS, OLD = PREV && PREV.orig;
  const ALTD = !UI.altOff && PREV ? PREV.list.find(e => e.__draft && e.kind !== "notiz" && !e.allDay && +e.dur > 0) : null, ALTB = ALTD ? PREV.list.filter(e => !e.__draft) : null;
  UMB = umbauMap(L);
  if (!UI.week){ const first = L.filter(e => e.date >= todayStr()).sort(sortEv)[0]; UI.week = first ? first.date : YEAR+"-01-15"; }
  const [y,w] = isoWeek(UI.week), mon = mondayOf(y,w), st = S.weeks[y+"-W"+pad(w)] || "belebt";
  const LBL = {"DG (Notfall)":"Dachgeschoss"};
  const grp = l => ["Innenhof","unterwegs"].includes(l) ? "out" : l === "DG (Notfall)" ? "dg" : ["online","Raum offen"].includes(l) ? "misc" : "eg";
  /* je Tag: Zeitachse, Check-in, Belegung je Raum */
  const ONE = !MOB && !o.days && UI.dayOnly ? UI.dayOnly : null;
  const days = (o.days || (ONE ? [ONE] : [0,1,2,3,4,5].map(i => S_(D(mon)+i)))).map(d => {
    const evs = L.filter(e => e.date === d).sort(sortEv);
    const notes = evs.filter(e => e.kind === "notiz"), timed = evs.filter(e => span(e)), open = evs.filter(e => e.kind !== "notiz" && !span(e));
    const tags = [FEIER[d] ? `<span class="lv err">${esc(FEIER[d])}</span>` : "", sperrOn(d) ? `<span class="lv err" title="Sperrtag (Abwesenheiten)">Sperrtag: ${esc(sperrOn(d))}</span>` : "", ferienOn(d) ? `<span class="lv info">${esc(ferienOn(d))}</span>` : "", ...notes.map(n => `<span class="lv info" data-ev="${n.id}" style="cursor:pointer">✎ ${esc(evName(n))}</span>`)].join("");
    /* Zeitachse je Tag: Kernöffnungszeit (Einstellungen, Standard 10–21 Uhr), erweitert auf frühere/spätere Belegung (inkl. Aufbau und Check-in) */
    let lo = Math.floor(t2m(OPEN_FROM)/60)*60, hi = Math.ceil(t2m(OPEN_TO)/60)*60;
    for (const e of timed){ const sp = span(e); lo = Math.min(lo, sp.s - Math.max(setupOf(e), arrives(e) ? CI_MIN : 0)); hi = Math.max(hi, sp.e + (e.allDay ? 0 : afterOf(e))); }
    /* Abreisetag der Übernachtungsgäste: Achse beginnt mind. 1 Std. vor der Abreise, damit sie sichtbar ist (Sebastian 02.11.2026) */
    for (const q of staysOn(d)) if (q.s === 0 && q.e < 1440) lo = Math.min(lo, q.e - 60);
    const DAY0 = Math.max(0, Math.floor(lo/60)*60), DAYSPAN = Math.min(24*60, Math.ceil(hi/60)*60) - DAY0;
    const hours = []; for (let h = DAY0/60; h < (DAY0+DAYSPAN)/60; h++) hours.push(`<span style="left:${(h*60-DAY0)/DAYSPAN*100}%">${h}</span>`);
    const lanes = {}; LANES.forEach(l => lanes[l] = []);
    const ci = timed.filter(arrives).map(e => { const s = t2m(e.start), sp = span(e), run = checkinOf(e) === "durchgehend";
      return `<div class="ci" style="left:${Math.max(0,(s-CI_MIN-DAY0)/DAYSPAN*100)}%;width:${CI_MIN/DAYSPAN*100}%" title="Ankunft/Check-in ${m2t(s-CI_MIN)}–${e.start}: Küche und Flur belebt (${esc(evName(e))})"></div>` + (run ? `<div class="ci run" style="left:${(s-DAY0)/DAYSPAN*100}%;width:${(Math.min(sp.e,DAY0+DAYSPAN)-s)/DAYSPAN*100}%" title="Check-in durchgehend ${e.start}–${m2t(sp.e)} (${esc(evName(e))})"></div>` : ""); }).join("");
    for (const e of timed){
      const sp = span(e), t = theme(e), left = Math.max(0,(sp.s-DAY0)/DAYSPAN*100), width = Math.max(1.5,(Math.min(sp.e,DAY0+DAYSPAN)-Math.max(sp.s,DAY0))/DAYSPAN*100);
      const cls = `blk${t[1]?" dark":""} ${stCls(e)}${e.__draft ? " draft" : errNoZone(e.id)?" bad":accNoZone(e.id)?" accb":""}`;
      const dl = deadlineOf(e), dlb = dl ? `<span class="dlb ${dl.l}" title="${esc(dl.t)}">⏱${(sp.e-sp.s)/DAYSPAN > .14 ? " "+esc(dl.short) : ""}</span>` : "";
      const bg = e.kind === "vermietung" ? "var(--muted)" : t[0];
      const html = `<button class="${cls}" data-ev="${e.id}" style="left:${left}%;width:${width}%;background-color:${bg};--c:${bg}" title="${esc(evName(e)+" · "+(e.allDay?"ganztägig":e.start+"–"+m2t(sp.e))+" · "+(e.room||"Raum offen")+" · Status: "+(e.status||"–")+(dl?" · "+dl.t:""))}"><small>${e.__draft ? "Entwurf · " : ""}${e.allDay?"ganzt.":esc(e.start)}</small>${esc(evName(e))}${stMark(e)}${dlb}</button>`;
      const su = setupOf(e), setup = su > 0 && !e.allDay ? `<div class="setup" style="left:${Math.max(0,(sp.s-su-DAY0)/DAYSPAN*100)}%;width:${(Math.min(sp.s,DAY0+DAYSPAN)-Math.max(sp.s-su,DAY0))/DAYSPAN*100}%" title="Technik-Aufbau"></div>` : "";
      const ph = endPh(e), mainW = ph ? Math.max(1.5, width - ph.min/DAYSPAN*100) : width;
      const rs = e.room === "Gesamtes EG" ? EG.slice() : (e.room ? e.room.split(" + ").filter(r => LANES.includes(r)) : []); if (!rs.length) rs.push("Raum offen");
      rs.forEach((r,i) => lanes[r].push((i===0 ? setup : "") + (ph ? html.replace("width:"+width+"%", "width:"+mainW+"%") : html)));
      const sp2 = ph ? sharePartner(e) : null, half = sp2 ? (e.seriesId < sp2.seriesId ? " h1" : " h2") : "";
      if (ph){ const pl = Math.max(0,(sp.e-ph.min-DAY0)/DAYSPAN*100), pw = ph.min/DAYSPAN*100; splitRooms(ph.room).filter(r => LANES.includes(r)).forEach(r => lanes[r].push(`<button class="${cls}${half}" data-ev="${e.id}" style="left:${pl}%;width:${pw}%;background-color:${bg};--c:${bg}" title="${esc((sp2 ? "Gemeinsamer Abschluss mit „"+evName(sp2)+"“ · " : "Abschluss ")+evName(e)+" · "+m2t(sp.e-ph.min)+"–"+m2t(sp.e)+" · "+ph.room)}"><small>${sp2 ? "gemeinsam" : "Abschluss"}</small>${esc(evName(e))}</button>`));
        /* Verbindungslinie Hauptteil → Abschluss in anderem Raum (gleiche Veranstaltung) */
        const tl = splitRooms(ph.room).filter(r => LANES.includes(r)).filter(r => !rs.includes(r));
        if (tl.length && sp.e - ph.min >= DAY0 && sp.e - ph.min <= DAY0 + DAYSPAN){ const ti = LANES.indexOf(tl[0]), srcs = rs.map(r => LANES.indexOf(r)).filter(i => i >= 0);
          const si = srcs.sort((a,b) => Math.abs(a-ti) - Math.abs(b-ti))[0], dn = ti > si, x = pl, tt = esc("Abschluss von „"+evName(e)+"“ in "+ph.room+" ab "+m2t(sp.e-ph.min));
          if (si != null && si !== ti){ const lo = Math.min(si, ti), hi = Math.max(si, ti);
            for (let i = lo; i <= hi; i++){ const r = LANES[i]; if (!lanes[r]) continue; const k = i === si ? (dn ? "s-dn" : "s-up") : i === ti ? (dn ? "t-dn" : "t-up") : "mid";
              lanes[r].push(`<div class="cnx ${k}" style="left:${x}%" title="${tt}"></div>`); } } }
      }
      if (e.hybrid && e.room !== "online" && lanes["online"]) lanes["online"].push(`<button class="livem" data-ev="${e.id}" style="left:${left}%;width:${width}%;--c:${bg}" title="${esc("Live-Übertragung (hybrid): "+evName(e)+" · "+e.start+"–"+m2t(sp.e))}">● Live · ${esc(evName(e))}</button>`);
      const fu = furnOf(e); if (fu && lanes["Workshopraum"]){ const um = UMB.get(e.id), pre = Math.max(setupOf(e), arrives(e) ? CI_MIN : 0), ul = Math.max(0,(sp.s-pre-DAY0)/DAYSPAN*100);
        lanes["Workshopraum"].push(`<span class="fur${um ? " chg" : ""}" style="left:${um ? ul : left}%" title="${esc((um ? "Umbau vorher: " + um.from + " → " + fu + " (zuletzt: " + evName(um.prev) + ", " + fmt(um.prev.date) + ")" : "Möblierung: " + fu + " – kein Umbau nötig"))}">${um ? "⇄ " : ""}${FURN_SYM[fu]}</span>`); }
      const bk = backupOf(e); if (bk && lanes[bk]) lanes[bk].push(`<div class="bkp" style="left:${left}%;width:${width}%;--c:${bg}" title="${esc("Ausweichraum bei Schlechtwetter: "+evName(e))}">${esc(evName(e))}</div>`);
      { const lv = egLevel(e); if (lv >= 2 && e.room !== "Gesamtes EG") EG.filter(r => !rs.includes(r)).forEach(r => lanes[r].push(`<div class="excl${lv === 2 ? " ex2" : ""}" style="left:${left}%;width:${width}%" title="${esc(eglName(lv) + ": " + evName(e))}"></div>`)); }
      const af = e.allDay ? 0 : afterOf(e);
      if (af > 0 && sp.e < DAY0 + DAYSPAN){ const tw = Math.min(af, DAY0 + DAYSPAN - sp.e) / DAYSPAN * 100, tlft = (sp.e - DAY0) / DAYSPAN * 100;
        const tail = `<div class="tail${ph ? half : ""}" style="left:${tlft}%;width:${tw}%;--c:${bg}" title="${esc("Nachlauf Gäste "+m2t(sp.e)+"–"+m2t(sp.e+af)+" · "+evName(e))}"></div>`;
        (ph ? splitRooms(ph.room).filter(r => LANES.includes(r)) : rs).forEach(r => lanes[r].push(tail)); }
    }
    /* Übernachtungsgäste (grau; vorgemerkt blass gestrichelt) und Messen (dezenter Hinweis) in der Spalte Dachgeschoss (v121) */
    if (lanes[STAY_ROOM]){
      const fm = fairsOn(d).map(f => (`<div class="fairm" title="${esc("Messe in Berlin: " + f.name + " (" + fairPer(f) + ") – Übernachtungsgäste wahrscheinlicher")}">Messe: ${esc(f.name)}</div>`));
      staysOn(d).forEach(q => { const l = Math.max(0, (q.s - DAY0) / DAYSPAN * 100), r = Math.min(100, (q.e - DAY0) / DAYSPAN * 100); if (r <= l) return;
        const cls = `stay${q.x.status === "gebucht" ? "" : " vm"}${stayClash(q.x).length ? " bad" : ""}${q.s === 0 && q.e < 1440 ? " dep" : ""}`, tip = esc(stayTip(q.x) + (stayClash(q.x).length ? " · überschneidet sich mit einer anderen Übernachtung" : ""));
        const dep = q.s === 0 && q.e < 1440;
        const nx = Math.min(DAY0 + DAYSPAN, ...staysOn(d).filter(o => o.s >= q.e).map(o => o.s)), mw = Math.max(0, (nx - q.e) / DAYSPAN * 100);
        if (dep) lanes[STAY_ROOM].unshift(`<span class="stlab" style="left:${r}%;max-width:calc(${mw}% - 8px)" title="${tip}">Abreise ${m2t(q.e)} · ${esc(stayName(q.x))}</span>`);
        const lab = dep ? BED : `${BED}${q.s > 0 ? "<small>ab " + m2t(q.s) + "</small>" : ""}${esc(stayName(q.x))}${+q.x.persons > 1 ? " (" + (+q.x.persons) + ")" : ""}${stayOutSat(q, d) ? `<span class="stout">${stayOutSat(q, d)}</span>` : ""}`;
        lanes[STAY_ROOM].unshift(TEAM || PREV ? `<div class="${cls}" style="left:${l}%;width:${r - l}%" title="${tip}">${lab}</div>` : `<button class="${cls}" data-stay="${q.x.id}" style="left:${l}%;width:${r - l}%" title="${tip} – Klick: bearbeiten">${lab}</button>`); });
      lanes[STAY_ROOM].unshift(...fm);
    }
    /* Alternativen des geöffneten Termins: grün = ohne Konflikt, gelb = nur mit Hinweis */
    if (ALTD){ const sl = altSlots(ALTD, ALTB, d), ok = sl.filter(x => !x.w), wn = sl.filter(x => x.w), dur = +ALTD.dur;
      const cov = arr => { const c = new Set(); arr.forEach(x => { for (let t = x.s; t < x.s + dur; t += 15) c.add(t); }); return c; };
      const cOk = cov(ok), cWn = cov(wn), segs = [];
      for (const [set, cls] of [[cOk, "ok"], [new Set([...cWn].filter(t => !cOk.has(t))), "wn"]]){ const ts = [...set].sort((a,b) => a-b); let a = null, b = null;
        ts.forEach(t => { if (a != null && t === b + 15){ b = t; } else { if (a != null) segs.push([a, b + 15, cls]); a = b = t; } }); if (a != null) segs.push([a, b + 15, cls]); }
      const tip = esc("Mögliche Lagen für „" + evName(ALTD) + "“ am " + fmt(d) + " (" + dur + " Min): " + (ok.length ? "Beginn ohne Konflikt " + altRanges(ok) : "kein Beginn ohne Konflikt") + (wn.length ? " · nur mit Hinweis: " + [...new Set(wn.map(x => x.r))].map(r => altRanges(wn.filter(x => x.r === r)) + " (" + r + ")").join(", ") : ""));
      const ars = ALTD.room === "Gesamtes EG" ? EG.slice() : (ALTD.room ? ALTD.room.split(" + ").filter(r => LANES.includes(r)) : []); if (!ars.length) ars.push("Raum offen");
      segs.forEach(([a, b, cls]) => { const al = Math.max(0,(a-DAY0)/DAYSPAN*100), aw = (Math.min(b,DAY0+DAYSPAN)-Math.max(a,DAY0))/DAYSPAN*100; ars.forEach(r => lanes[r].unshift(`<div class="alt ${cls}" style="left:${al}%;width:${aw}%" title="${tip}"></div>`)); });
    }
    /* bisherige Lage des bearbeiteten Termins (nur Umriss) */
    if (OLD && OLD.date === d && span(OLD)){ const osp = span(OLD), ol = Math.max(0,(osp.s-DAY0)/DAYSPAN*100), ow = Math.max(1.5,(Math.min(osp.e,DAY0+DAYSPAN)-Math.max(osp.s,DAY0))/DAYSPAN*100);
      const ors = OLD.room === "Gesamtes EG" ? EG.slice() : (OLD.room ? OLD.room.split(" + ").filter(r => LANES.includes(r)) : []); if (!ors.length) ors.push("Raum offen");
      ors.forEach(r => lanes[r].push(`<div class="oldpos" style="left:${ol}%;width:${ow}%" title="${esc("bisher gespeichert: "+evName(OLD)+" · "+(OLD.allDay?"ganztägig":OLD.start+"–"+m2t(osp.e))+" · "+(OLD.room||"Raum offen"))}">bisher</div>`)); }
    /* Fehlerstellen markieren */
    let ciZ = "";
    for (const z of (IS.zones || []).filter(q => q.date === d)){
      const zl = Math.max(0,(z.from-DAY0)/DAYSPAN*100), zw = Math.max(.6,(Math.min(z.to,DAY0+DAYSPAN)-Math.max(z.from,DAY0))/DAYSPAN*100);
      const zi = (IS.zones || []).indexOf(z);
      const zh = `<div class="zone${z.acc ? " acc" : z.l === "warn" ? " zw" : ""}"${PREV || MOB ? "" : ` data-zone="${zi}"`} style="left:${zl}%;width:${zw}%" title="${esc(m2t(z.from)+"–"+m2t(z.to)+": "+(MOB ? mobSan(z.t) : z.t)+(z.acc ? " (akzeptiert)" : "")+(MOB ? "" : " – Klick: akzeptieren/aktivieren"))}"></div>`;
      z.lanes.forEach(r => { if (r === "__ci") ciZ += zh; else if (lanes[r]) lanes[r].push(zh); });
    }
    const openH = open.length ? `<div class="unsched"><span class="notes">Ohne Startzeit:</span>${open.map(e => `<button data-ev="${e.id}">${esc(evName(e))}</button>`).join("")}</div>` : "";
    return {d, evs, tags, hours, ci: ci + ciZ, lanes, openH, hrs: DAYSPAN/60, hol: !!FEIER[d], fer: !!ferienOn(d)};
  });
  /* Raster: zwei Blöcke (Mo–Mi, Do–Sa), Raumnamen je Block einmal links */
  const dc = (x, extra) => `wc${x.hol?" hol":""}${x.fer?" fer":""}${extra?" "+extra:""}`;
  const showOpen = days.some(x => x.lanes["Raum offen"].length);
  const gap = extra => `<div class="wgap${extra?" "+extra:""}" title="21–10 Uhr (Nacht)"></div>`;
  const block = part => {
    let html = `<div class="wl wh"></div>` + part.map(x => `<div class="${dc(x,"wh")}" data-wday="${x.d}"><div class="whd"><b${o.week ? ` data-mday="${x.d}" role="button" tabindex="0" title="Tagesansicht öffnen"` : ""}><span class="wdn">${WD[wdOf(x.d)]}</span> ${fmtY(x.d)}${o.week ? " ›" : ""}</b>${MOB ? "" : `<button class="btn add" data-new="${x.d}" title="Termin am ${fmtY(x.d)} anlegen" aria-label="Termin am ${fmtY(x.d)} anlegen">+ Termin</button>`}</div>${x.tags?`<div class="tags">${x.tags}</div>`:""}${x.openH}</div>`).join(gap("wh"));
    html += `<div class="wl wt"></div>` + part.map(x => `<div class="${dc(x,"wt")}"><div class="lane hrs">${x.hours.join("")}</div></div>`).join(gap("wt"));
    html += `<div class="wl">Check-in</div>` + part.map(x => `<div class="${dc(x)}"><div class="lane" style="--hrs:${x.hrs}">${x.ci}</div></div>`).join(gap(""));
    let lastG = "";
    LANES.filter(l => (l !== "Raum offen" || showOpen) && (!MOB || !["unterwegs","DG (Notfall)","online","Raum offen"].includes(l) || part.some(x => x.lanes[l].length))).forEach(l => { const g = grp(l), gs = g !== lastG ? " gs" : ""; lastG = g;
      html += `<div class="wl g-${g}${gs}">${esc(LBL[l] || l)}</div>` + part.map(x => `<div class="${dc(x, "g-"+g+gs)}"><div class="lane" style="--hrs:${x.hrs}">${x.lanes[l].join("")}</div></div>`).join(gap("g-"+g+gs)); });
    return `<div class="scroll"><div class="wgrid ${MOB ? (S.weeks[weekKey(part[0].d)] || "belebt") + " mob" : st}" style="grid-template-columns:var(--wlab) ${part.map(() => "minmax(0,1fr)").join(" var(--wgap) ")}">${html}</div></div>`;
  };
  if (MOB) return o.week ? days.map(x => block([x])).join("") : block(days);
  if (ONE) return `<div class="head"><div class="weeknav"><button class="btn" data-prback="1" title="Termin schließen und zurück zum ${UI.view0 === "liste" ? "Terminliste" : "Prüfbericht"}">← ${UI.view0 === "liste" ? "Terminliste" : "Prüfbericht"}</button><span class="kwl">${WD[wdOf(ONE)]} ${fmtY(ONE)} · KW ${isoWeek(ONE)[1]}</span><button class="btn" data-dayweek="1" title="Ganze Woche anzeigen">Ganze Woche</button>${qh("<b>Tagesansicht</b> (aus Prüfbericht oder Terminliste)<ul><li>Zeigt den Tag des Termins mit allen Belegungen und Konfliktstellen.</li><li>Ändert sich im Dialog das Datum, folgt die Ansicht dem neuen Tag.</li><li>Schließen oder Speichern führt zurück zum Prüfbericht bzw. zur Terminliste.</li><li>„Ganze Woche“ wechselt in die normale Wochenansicht.</li></ul>")}</div></div>${st === "ruhig" ? `<div class="wkbanner ruhig" role="note"><b>Ruhige Woche</b><span>So wenig Programm wie möglich.</span></div>` : st === "pause" ? `<div class="wkbanner pause" role="note"><b>Programmpause</b><span>Keine Veranstaltungen – nur feste Termine.</span></div>` : ""}${PREV ? `<div class="prevbar">Vorschau der Eingabe im Dialog rechts: <span class="pv-d">Entwurf</span> = neue Lage, <span class="pv-o">bisher</span> = gespeicherte Lage. Rot-weiß = Konflikt mit dem Entwurf.</div>` : ""}<div class="wblocks one">${block(days)}</div>${ALTD ? altListHtml(ALTD, ALTB) : ""}`;
  return `<div class="head"><div class="weeknav"><button class="btn" data-wnav="-7" aria-label="Vorige Woche">←</button><button class="btn" data-wnav="7" aria-label="Nächste Woche">→</button><button class="btn" data-wtoday="1" aria-pressed="${mobMon(UI.week) === mobMon(todayStr())}" title="Zur aktuellen Woche">Heute</button><span class="kwl">KW ${w} · ${fmt(mon)}–${fmtY(S_(D(mon)+6))}</span><input class="in" type="date" id="wkjump" value="${UI.week}" aria-label="Woche wählen">${qh(`<div class="qcols"><div>${wkLegend()}</div><div>${legendThemes()}</div></div>`)}</div><div class="tools">${PREV && PREV.list.some(e => e.__draft) ? `<button class="btn ghost sm" data-alt="1" aria-pressed="${UI.altOff ? "false" : "true"}" title="Schraffur der möglichen Lagen für den geöffneten Termin ein-/ausblenden">${UI.altOff ? "Alternativen zeigen" : "Alternativen ausblenden"}</button>` : ""}<button class="wkst ${st}" data-wk="${y}-W${pad(w)}" title="Wochenstatus wechseln: belebt → ruhig → Pause">${stLab(st)}</button></div></div>${st === "ruhig" ? `<div class="wkbanner ruhig" role="note"><b>Ruhige Woche</b><span>So wenig Programm wie möglich: regulär nur Walk and Talk; Einzelberatungen und andere Veranstaltungen nur als Ausnahme.</span></div>` : st === "pause" ? `<div class="wkbanner pause" role="note"><b>Programmpause</b><span>Keine Veranstaltungen – nur feste Termine.</span></div>` : ""}${PREV ? `<div class="prevbar">Vorschau der Eingabe im Dialog rechts: <span class="pv-d">Entwurf</span> = neue Lage, <span class="pv-o">bisher</span> = gespeicherte Lage. Rot-weiß = Konflikt mit dem Entwurf.</div>` : ""}<div class="wblocks">${block(days.slice(0,3))}${block(days.slice(3))}</div>${ALTD ? altListHtml(ALTD, ALTB) : ""}`;
}

/* ---------- Ansicht: Liste ---------- */
function filtered(){
  const td = todayStr();
  const r = evList().filter(e => {
    if (UI.lPast ? e.date >= td : e.date < td) return false;
    if (UI.month !== "alle" && +e.date.slice(5,7) !== +UI.month) return false;
    if (UI.status !== "alle" && e.status !== UI.status) return false;
    if (UI.onlyIssues && !["err","warn"].includes(worst(e.id))) return false;
    if (UI.q && !(evName(e)+" "+(e.room||"")+" "+(e.note||"")).toLowerCase().includes(UI.q.toLowerCase())) return false;
    return true;
  }).sort(sortEv);
  return UI.lPast ? r.reverse() : r;
}
function viewListe(){
  const evs = filtered();
  const rows = evs.map(e => { const [,w] = isoWeek(e.date); const sp = span(e); return `<tr class="click" data-ev="${e.id}"><td class="t">${fmtY(e.date)}</td><td class="t">${WD[wdOf(e.date)]} · KW ${w}</td><td class="t">${e.allDay?"ganzt.":esc(e.start||"–")}${sp&&!e.allDay?"–"+m2t(sp.e):""}</td><td><b>${esc(evName(e))}</b>${webLink(e)}<div>${tbadge(e.theme)}</div></td><td>${esc(e.room||"–")}${e.hybrid?" · hybrid":""}</td><td>${stchip(e.status)}</td><td class="t">${e.kind==="va"?fmtY(S_(D(e.date)-ON_DAYS)):"–"}</td><td><div class="iss">${lvchips(e.id,4)}</div></td></tr>`; }).join("");
  return `<div class="head"><h2>Terminliste ${qh(`<ul><li><b>Kommende | Vergangene</b>: Standard sind alle Termine ab heute. „Vergangene“ zeigt bereits durchgeführte Termine, die neuesten oben. Nach dem Neuladen steht die Liste wieder auf „Kommende“.</li><li><b>↗</b> hinter dem Titel: Link auf die Veranstaltungsseite auf survivors-home.de (vom Website-Abgleich gesetzt oder im Termin eingetragen).</li><li>Filter nach Monat, Status, nur Termine mit Fehlern/Hinweisen und Freitextsuche (Name, Raum, Notiz).</li><li><b>Online bis</b> = Termin − ${ON_DAYS/7} Wochen: bis dahin muss die Veranstaltung veröffentlicht sein (sonst Fehler). Ab ${WARN_DAYS/7} Wochen vorher Vorwarnung, solange der Status unter „fix“ liegt.</li><li>„CSV exportieren“ speichert die gefilterte Liste (kommende bzw. vergangene), z. B. zum Anlegen in WordPress.</li><li>Klick auf eine Zeile öffnet den Termin rechts, links erscheint der betroffene Tag mit allen Belegungen. Schließen oder Speichern führt zurück zur Terminliste an dieselbe Stelle.</li></ul>`)}</h2><div class="tools"><button class="btn" data-csv="1">CSV exportieren</button><button class="btn primary" data-new="1">+ Termin</button></div></div>
  <div class="filters"><span class="seg" role="group" aria-label="Zeitraum"><button class="btn ${UI.lPast?"":"primary"}" data-lpast="0">Kommende</button><button class="btn ${UI.lPast?"primary":""}" data-lpast="1">Vergangene</button></span><select class="in" id="fMonth" aria-label="Monat"><option value="alle">Alle Monate</option>${MONTHS.map((m,i) => `<option value="${i+1}" ${+UI.month===i+1?"selected":""}>${m}</option>`).join("")}</select>
  <select class="in" id="fStatus" aria-label="Status"><option value="alle">Alle Status</option>${STATUS.map(s => `<option ${UI.status===s?"selected":""}>${s}</option>`).join("")}</select>
  <label><input type="checkbox" id="fIss" ${UI.onlyIssues?"checked":""}> nur mit Fehlern/Hinweisen</label>
  <input class="in" id="fQ" placeholder="Suchen" value="${esc(UI.q)}"><span class="notes">${evs.length} ${UI.lPast?"vergangene":"kommende"} Termine</span></div>
  ${evs.length ? `<div class="scroll"><table class="list"><thead><tr><th>Datum</th><th>Tag</th><th>Zeit</th><th>Veranstaltung</th><th>Raum</th><th>Status</th><th>Online bis</th><th>Prüfung</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty">Keine ${UI.lPast?"vergangenen":"kommenden"} Termine für diese Auswahl.</div>`}`;
}

/* ---------- Ansicht: Prüfung ---------- */
/* Prüfbericht-Gruppen: eine Meldung, die zwei Termine gemeinsam betrifft (gleiche Kennung g), wird zu einer Zeile.
   Offen, solange mindestens eine Seite nicht akzeptiert ist; akzeptieren/wieder aktivieren gilt für alle Seiten. */
function prGroups(){
  const map = new Map(), out = [];
  evList().filter(e => e.status !== "abgesagt").sort(sortEv).forEach(e => issuesAll(e.id).forEach(x => {
    const k = x.g ? "g" + x.g : "s" + out.length; let grp = x.g && map.get(k);
    if (!grp){ grp = {l:x.l, m:[]}; out.push(grp); if (x.g) map.set(k, grp); }
    grp.m.push({e, x}); if (x.l === "err") grp.l = "err";
  }));
  out.forEach(g => { g.open = g.m.some(i => !i.x.acc); g.e = g.m[0].e; });
  return out;
}
const prMembers = g => JSON.stringify(g.m.map(i => [i.e.id, i.x.t]));
function prWhen(g){ const ds = [...new Set(g.m.map(i => i.e.date))]; return ds.map(d => `${WD[wdOf(d)]} ${fmtY(d)}`).join("<br>"); }
function prEvs(g, room){ return g.m.map(i => `<span class="prev" data-ev="${i.e.id}">${esc(evName(i.e))}</span> · ${esc(i.e.start||"ohne Zeit")}${room ? " · " + esc(i.e.room||"Raum offen") : ""}`).join(g.m.length > 1 ? ` <span class="prsep">↔</span> ` : ""); }
const prText = g => esc(g.m[0].x.t);
function viewPruefung(){
  const grs = prGroups();
  const items = grs.filter(g => g.open), accd = grs.filter(g => !g.open && g.m.some(i => i.x.acc));
  const ord = {err:0,warn:1,info:2};
  items.sort((a,b) => ord[a.l]-ord[b.l] || sortEv(a.e,b.e));
  const n = l => items.filter(g => g.l === l).length;
  const lab = {err:"Fehler",warn:"Hinweis",info:"Info"};
  return `<div class="head"><h2>Prüfbericht ${qh(`<b>Prüfbericht</b><ul><li><b>Fehler</b> (rot) müssen gelöst werden, z. B. Raumkonflikt, Check-in überlagert, EG exklusiv belegt, Online-Frist verpasst (${ON_DAYS/7} Wochen vorher nicht veröffentlicht).</li><li><b>Hinweise</b> (gelb) sind abzuwägen, z. B. ruhige Woche, Lärm durch Check-in, Ausweichraum belegt, Vorwarnung ${WARN_DAYS/7} Wochen vorher (Status unter „fix“).</li><li><b>Kernöffnungszeit</b> ${OPEN_FROM}–${OPEN_TO} Uhr: Beginn und Ende inkl. Nachlauf außerhalb davon ergibt einen Hinweis.</li><li><b>Umbauzeit Workshopraum</b>: wechselt die Möblierung zwischen zwei Veranstaltungen am selben Tag, sind mind. ${fmtHM(UMBAU_MIN)} h Umbau nötig (Abbau + Aufbau, wenn zusammen länger). Gezählt wird vom Ende inkl. Nachlauf bis zum Beginn des Check-ins der nächsten Veranstaltung – der Umbau muss vor dem Check-in fertig sein.</li><li><b>Absolute Ruhe im EG (Stufe 4)</b>: Auch eine parallele Veranstaltung „unterwegs“ darf nicht während der Ruhe-Veranstaltung enden – die zurückkehrenden Gäste betreten das EG.</li><li><b>Lungenkrebs</b>: Der Nachlauf einer vorherigen Veranstaltung darf sich mit dem Start der Selbsthilfegruppe überschneiden.</li><li><b>Andocken</b>: Backen direkt vor dem Caféhaus und Frag den Doc direkt nach dem Caféhaus – Check-in, Nachlauf und Abbau dürfen sich dabei überlagern und werden nicht gemeldet.</li><li><b>Infos</b> nur zur Kenntnis.</li><li><b>Zwei Termine, ein Konflikt</b>: Betrifft eine Meldung zwei Termine (z. B. Raumkonflikt), steht sie nur einmal hier und zählt nur einmal. Beide Termine stehen in der Zeile (↔); ein Klick auf einen Namen öffnet genau diesen Termin. „akzeptieren“ gilt für beide.</li><li>Klick auf eine Zeile öffnet den Termin; in der Wochenansicht ist die Fehlerstelle rot-weiß markiert.</li><li><b>Zähler am Reiter „Prüfung“</b>: Der rote Kreis zeigt die Anzahl der Fehler; ein gelber Kreis dahinter (ohne Zahl) zeigt, dass es außerdem Hinweise gibt. Sind alle Fehler gelöst, zeigt der gelbe Kreis die Anzahl der Hinweise. Infos und akzeptierte Konflikte zählen nicht.</li><li><b>akzeptieren</b>: Konflikt bewusst hinnehmen – er zählt dann nicht mehr hier, im Jahresüberblick und im Zähler; in der Wochenansicht bleibt die Stelle gelb markiert. Unten unter „Akzeptierte Konflikte“ wieder aktivierbar. Ändert sich der Termin so, dass ein anderer Konflikt entsteht, erscheint er neu.</li><li>Eintrag anklicken: Termin öffnet sich rechts, links erscheint der betroffene Tag mit allen Belegungen. Schließen oder Speichern führt zurück zum Prüfbericht.</li><li><b>Website-Abgleich</b> (zweimal täglich, Routine): ordnet Termine auf survivors-home.de den Planer-Terminen zu (Datum + Beginn, danach fest über die Website-ID), setzt den Link und hebt den Status auf „veröffentlicht“ (nie zurück; abgesagte bleiben unverändert). Hinweise bei anderem Tag oder Beginn auf der Website und bei „veröffentlicht“, das auf der Website fehlt. Titel werden nicht verglichen. Unten: Termine, die nur auf der Website stehen (werden nicht angelegt), und nicht eindeutige Zuordnungen.</li></ul>`)}</h2><div class="sub">${n("err")} Fehler · ${n("warn")} Hinweise · ${n("info")} Infos</div></div>
  ${items.length ? `<div class="ilist">${items.map(g => `<div class="iitem${g.m.length > 1 ? " pair" : ""}" data-ev="${g.e.id}"><span class="lv ${g.l}">${lab[g.l]}</span><span class="when t">${prWhen(g)}</span><div class="what"><b>${prText(g)}</b><div>${prEvs(g, true)}</div></div>${g.l !== "info" ? `<button class="btn ghost sm" data-accg='${esc(prMembers(g))}' data-on="1" title="Konflikt akzeptieren${g.m.length > 1 ? " (gilt für beide Termine)" : ""}">akzeptieren</button>` : ""}</div>`).join("")}</div>` : `<div class="empty">Keine Auffälligkeiten.</div>`}
  ${wsSection()}
  ${accd.length ? `<details class="sec accsec"><summary>Akzeptierte Konflikte (${accd.length})</summary><div class="ilist">${accd.map(g => `<div class="iitem${g.m.length > 1 ? " pair" : ""}" data-ev="${g.e.id}"><span class="lv warn">akzeptiert</span><span class="when t">${prWhen(g)}</span><div class="what"><b>${prText(g)}</b><div>${prEvs(g, false)}</div></div><button class="btn ghost sm" data-accg='${esc(prMembers(g))}' data-on="0">wieder aktivieren</button></div>`).join("")}</div></details>` : ""}`;
}
/* v112: Website-Abgleich im Prüfbericht – Stand, nur auf der Website, nicht eindeutig (nur ab heute) */
function wsSection(){
  if (!S.wsLoaded) return "";
  const w = S.websync || {}, today = todayStr(), fut = a => (a || []).filter(x => (x.at || "").slice(0, 10) >= today);
  const only = fut(w.onlyWeb), unc = fut(w.unclear);
  const when = x => `${WD[wdOf(x.at.slice(0, 10))]} ${fmtY(x.at.slice(0, 10))}<br>${esc(x.at.slice(11))}`;
  const lnk = x => /^https?:\/\//.test(x.url || "") ? `<a class="clink" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || "ohne Titel")} ↗</a>` : esc(x.title || "");
  const stand = w.okAt ? `Website-Abgleich: zuletzt ${wsWhen(w.okAt)} · ${w.n || 0} Termine auf der Website` + (w.ok === false && w.err ? ` · letzter Lauf fehlgeschlagen (${wsWhen(w.at)})` : "") : "Website-Abgleich: noch kein erfolgreicher Lauf";
  return `<div class="notes wsstand">${stand}</div>
  ${unc.length ? `<details class="sec accsec" open><summary>Website: nicht eindeutig zugeordnet (${unc.length})</summary><div class="ilist">${unc.map(x => `<div class="iitem"><span class="lv warn">offen</span><span class="when t">${when(x)}</span><div class="what"><b>${lnk(x)}</b><div>passt zu: ${(x.cands || []).map(id => S.events[id] ? `<span class="prev" data-ev="${esc(id)}">${esc(evName(S.events[id]))}</span>` : esc(id)).join(" · ")} – Link im richtigen Termin eintragen</div></div></div>`).join("")}</div></details>` : ""}
  ${only.length ? `<details class="sec accsec"><summary>Nur auf der Website, nicht im Planer (${only.length})</summary><div class="ilist">${only.map(x => `<div class="iitem"><span class="lv info">Website</span><span class="when t">${when(x)}</span><div class="what"><b>${lnk(x)}</b></div></div>`).join("")}</div></details>` : ""}`;
}

/* ---------- Ansicht: Reihen ---------- */
const ivCell = s => { const x = serIv(s); if (!x) return "–"; return "≈ " + ivNum(x) + " Wo." + (x.season ? ` <span class="hint" title="${esc("Saison-Reihe (draußen ohne Ausweichraum): Intervall nur über die Wochen " + md2de(x.season.from) + "–" + md2de(x.season.to) + " gerechnet")}">Saison</span>` : ""); };
const ivText = s => { const x = serIv(s); if (!x) return s && s.individual ? "individuell – kein Intervall" : "Anzahl eintragen"; return "≈ alle " + ivNum(x) + " Wochen (" + x.weeks + " Wochen ohne Pausen ÷ " + x.n + ")" + (x.season ? " · Saison-Reihe: nur Wochen " + md2de(x.season.from) + "–" + md2de(x.season.to) + " gezählt" : ""); };
const FLAB = {rhythmWeeks:"Rhythmus", count:"Anzahl", weekdays:"Wochentag", start:"Startzeit", endMin:"Abschluss-Dauer"};
function serGaps(s){
  if (s.active === false) return {state:"paused", miss:[], prop:[]};
  const miss = [];
  if (!s.theme) miss.push("Themenbereich");
  if (!s.form) miss.push("Form");
  if (!s.room) miss.push("Raum");
  if (!s.dur) miss.push("Dauer");
  /* Individuelle Reihen (kein fester Rhythmus) werden nicht automatisch vorgeplant: Startzeit und Anzahl nicht Pflicht */
  if (!s.individual){ if (!s.start) miss.push("Startzeit"); if (!(s.weekdays||[]).length) miss.push("Wochentag"); if (!(s.refs||[]).length && !s.refsVary) miss.push("Referenten"); }
  if (!s.individual && (s.count == null || s.count === "")) miss.push("Anzahl");
  const prop = (s.unconfirmed||[]).map(f => FLAB[f] || f);
  return {state: miss.length ? "miss" : prop.length ? "prop" : "ok", miss, prop};
}
function gapChip(g){
  if (g.state === "paused") return `<span class="chip st">pausiert</span>`;
  if (g.state === "ok") return `<span class="chip okc">vollständig</span>`;
  return (g.miss.length ? `<span class="chip miss">fehlt: ${esc(g.miss.join(", "))}</span> ` : "") + (g.prop.length ? `<span class="chip prop">Vorschlag prüfen: ${esc(g.prop.join(", "))}</span>` : "");
}
function serListNow(all){
  const ord = {miss:0, prop:1, ok:2, paused:3};
  all = all || Object.values(S.series).map(s => ({s, g:serGaps(s)}));
  return all.filter(x => UI.serFilter === "alle" || x.g.state === UI.serFilter).sort((a,b) => ord[a.g.state]-ord[b.g.state] || a.s.name.localeCompare(b.s.name,"de"));
}
function snapSerOrder(id){
  let ids = serListNow().map(x => x.s.id);
  if (id && !ids.includes(id)){ const f = UI.serFilter; UI.serFilter = "alle"; ids = serListNow().map(x => x.s.id); UI.serFilter = f; UI.serOrderAll = true; } else UI.serOrderAll = false;
  UI.serOrder = ids;
}
function serListNav(s){
  if (!s.id) return "";
  if (!UI.serOrder || !UI.serOrder.includes(s.id)) snapSerOrder(s.id);
  const ids = UI.serOrder.filter(id => S.series[id]), i = ids.indexOf(s.id), prev = S.series[ids[i-1]], next = S.series[ids[i+1]];
  const filt = UI.serOrderAll ? "alle Reihen" : {alle:"alle Reihen", miss:"Daten fehlen", prop:"Vorschlag prüfen", ok:"vollständig", paused:"pausiert"}[UI.serFilter] || "";
  return `<div class="sernav sl"><button type="button" class="btn" data-sernav="${prev?prev.id:""}" ${prev?"":"disabled"} title="${esc(prev?"Vorherige Reihe: "+prev.name:"Anfang der Liste")}">← <span class="nm">${esc(prev?prev.name:"vorherige")}</span></button><span class="pos"><b>${i+1}</b> von ${ids.length}<br><span class="notes">Liste: ${esc(filt)}</span></span><button type="button" class="btn" data-sernav="${next?next.id:""}" ${next?"":"disabled"} title="${esc(next?"Nächste Reihe: "+next.name:"Ende der Liste")}"><span class="nm">${esc(next?next.name:"nächste")}</span> →</button></div>`;
}
function viewReihen(){
  const ord = {miss:0, prop:1, ok:2, paused:3};
  const all = Object.values(S.series).map(s => ({s, g:serGaps(s)}));
  const n = k => all.filter(x => x.g.state === k).length;
  const list = serListNow(all);
  const cnt = id => evList().filter(e => e.seriesId === id && e.date.startsWith(String(YEAR)) && e.status !== "abgesagt").length;
  const pv = (s,f) => (s.unconfirmed||[]).includes(f) ? ' <span class="lv warn">Vorschlag</span>' : "";
  const rows = list.map(({s,g}) => `<tr class="click" data-ser="${s.id}"><td><b>${esc(s.name)}</b></td><td>${tbadge(s.theme)}</td><td>${gapChip(g)}</td><td>${esc(s.room||"–")}${serLevel(s) > 1 ? " · EG: " + esc(eglName(serLevel(s))) : ""}${s.hybrid?" · hybrid":""}</td><td class="t">${(s.weekdays||[]).map(x => WD[x]).join(", ")||"–"} ${esc(s.start||"")}</td><td class="t">${s.dur||"–"} Min</td><td>${s.individual?"individuell":ivCell(s)}</td><td class="t">${cnt(s.id)} / ${s.count==null?"–":s.count}${pv(s,"count")}</td><td>${esc((s.refs||[]).map(r => (S.referents[r]||{}).name).filter(Boolean).join(", ")||(s.individual||s.refsVary?"wechselnd":"–"))}</td><td>${esc({ja:"ja",ausnahme:"Ausnahme",nein:"nein"}[s.quiet||"nein"])}</td></tr>`).join("");
  const fb = (k,l) => `<button class="btn ${UI.serFilter===k?"primary":""}" data-serf="${k}">${l}</button>`;
  if (UI.serQuick) return quickTimes();
  return `<div class="head"><h2>Reihen ${qh(`<b>Reihen</b><ul><li>Stammdaten je Reihe: Tage, Zeiten, Anzahl je Jahr, Raum, Ablauf, Regeln.</li><li><b>Anzahl und Intervall</b>: Vorgabe ist die Anzahl ${YEAR} (Soll). Das Intervall wird daraus berechnet: Wochen des Jahres ohne Programmpausen ÷ Anzahl (ruhige Wochen und Schulferien zählen mit). „Saison“ = Reihe draußen ohne Ausweichraum, dort zählen nur die Wochen der Saison. Liegt zwischen zwei Terminen eine Pause und ist die Lücke größer als Pause + 1,5 × Intervall, meldet die Prüfung einen Hinweis.</li><li>Neue Termine kopieren Raum, Dauer, Hybrid, Exklusiv, Referenten und Thema. Check-in, Aufbau, Nachlauf, Abbau, Ausweichraum, Abschluss und „draußen“ gelten direkt aus der Reihe, solange sie im Termin leer sind – im Termin lassen sie sich einzeln abweichend setzen.</li><li><b>Stammdaten-Status</b>: vollständig · Vorschlag prüfen (Anzahl ${YEAR} aus den Terminen 2025/26 abgeleitet – öffnen, prüfen, speichern) · Daten fehlen · pausiert.</li><li>Klick auf eine Zeile öffnet den Dialog; darin mit ← → durch die Liste blättern oder „Speichern + nächste“.</li><li><b>Parallelbetrieb im EG</b> (Raum und Ablauf): 4 Stufen von „keine Einschränkung“ über „nur Einzelberatungen“ (Form „Beratung“) und „kein anderes Programm“ bis „absolute Ruhe“ (auch kein Auf-/Abbau, Check-in, Nachlauf anderer). Im Termin abweichend einstellbar.</li><li><b>Ungespeicherte Änderungen</b> im Dialog: geänderte Felder magenta umrahmt mit Balken links, betroffene Bereiche mit „● geändert“, unten die Anzahl. Verschwindet nach „Speichern“ oder wenn der alte Wert wieder eingetragen wird.</li><li>„Zeiten schnell erfassen“: Dauer, Aufbau, Nachlauf und Abbau aller Reihen in einer Tabelle.</li><li>„Terminvorschläge berechnen“ im Dialog legt Vorschläge als Option an.</li><li>Regeln und Notizen liest Claude bei der Jahresplanung; die automatische Prüfung wertet Freitext nicht aus.</li></ul>`)}</h2><div class="tools"><button class="btn" data-quick="1">Zeiten schnell erfassen</button><button class="btn primary" data-newser="1">+ Reihe</button></div></div>
  <div class="filters">${fb("alle","Alle ("+all.length+")")}${fb("miss","Daten fehlen ("+n("miss")+")")}${fb("prop","Vorschlag prüfen ("+n("prop")+")")}${fb("ok","Vollständig ("+n("ok")+")")}${fb("paused","Pausiert ("+n("paused")+")")}<span class="notes">Soll ${YEAR} aktive Reihen: ${all.filter(x => x.g.state!=="paused").reduce((a,x) => a + (+x.s.count||0), 0)} Termine</span></div>
  ${list.length ? `<div class="scroll"><table class="list"><thead><tr><th>Reihe</th><th>Thema</th><th>Stammdaten</th><th>Raum</th><th>Tag / Start</th><th>Dauer</th><th>Intervall</th><th>Termine ${YEAR} / Soll</th><th>Referenten</th><th>Ruhige Woche</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty">Keine Reihen in dieser Auswahl.</div>`}`;
}

function quickTimes(){
  const act = Object.values(S.series).filter(s => s.active !== false).sort((a,b) => a.name.localeCompare(b.name,"de"));
  const open = act.filter(s => s.after == null || s.after === "").length;
  const lab = {dur:"Dauer", setup:"Aufbau", after:"Nachlauf", teardown:"Abbau"};
  const inp = (s,f,step) => durPair(`class="qe" step="${step}" data-qs="${s.id}" data-qf="${f}"`, s[f], lab[f]+" "+s.name);
  const rows = act.map(s => { const st = t2m(s.start||""), end = st != null && s.dur ? st + +s.dur : null;
    return `<tr${s.after == null || s.after === "" ? ' class="qopen"' : ""}><td><b>${esc(s.name)}</b><div class="notes">${esc(s.form||"")} · ${esc(s.room||"")}</div></td><td class="t">${esc(s.start||"–")}</td><td>${inp(s,"dur",15)}</td><td>${inp(s,"setup",15)}</td><td>${inp(s,"after",5)}</td><td>${inp(s,"teardown",15)}</td><td class="t">${end!=null?m2t(end)+(+s.after?" → "+m2t(end + +s.after):""):"–"}</td></tr>`; }).join("");
  return `<div class="head"><h2>Zeiten schnell erfassen ${qh(`<ul><li>Jede Änderung wird sofort gespeichert.</li><li><b>Nachlauf</b> = Zeit nach dem offiziellen Ende, in der Gäste noch im Raum sind (blockiert den Raum, zählt nicht zur Veranstaltungszeit).</li><li>Leeres Aufbau-Feld = Standard (${fmtHM(HYB_SETUP)} h bei Hybrid, sonst 0).</li><li>Ganztägige Termine belegen 9–21 Uhr; Aufbau, Nachlauf und Abbau werden bei ihnen nicht gerechnet.</li><li>Hell hinterlegt: Reihe noch ohne Nachlauf-Angabe.</li></ul>`)}</h2><div class="tools"><button class="btn" data-quick="0">Zurück zur Übersicht</button></div><div class="sub">Noch ohne Nachlauf-Angabe: <b>${open}</b> von ${act.length} aktiven Reihen (hell hinterlegt).</div></div>
  <div class="scroll"><table class="list"><thead><tr><th>Reihe</th><th>Start</th><th>Dauer</th><th>Aufbau</th><th>Nachlauf</th><th>Abbau</th><th>Ende → inkl. Nachlauf</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---------- Ansicht: Referenten ---------- */
function viewRefStamm(seg, sender){
  const rs = Object.values(S.referents).sort(byRefName);
  const ser = id => Object.values(S.series).filter(s => (s.refs||[]).includes(id)).map(s => s.name).join(", ");
  const cons = r => [r.only&&r.only.length?"nur "+r.only.map(x => WD[x]).join("/"):"", r.blocked&&r.blocked.length?"nicht "+r.blocked.map(x => WD[x]).join("/"):"", r.noMorning&&r.noMorning.length?"nicht vormittags "+r.noMorning.map(x => WD[x]).join("/"):"", r.evening?"nur abends":"", r.noFerien?"nicht in Schulferien":""].concat((r.avail||[]).map(availLabel)).concat(r.wish != null ? ["Wunsch: "+r.wish+" Termine"] : []).filter(Boolean).join(" · ");
  const rows = rs.map(r => `<tr class="click" data-ref="${r.id}"><td><b>${esc(r.name)}</b><div class="notes">${esc(r.role||"")}</div></td><td>${esc(ser(r.id)||"–")}</td><td>${esc(cons(r)||"–")}</td><td>${esc(r.email||"–")}${r.phone?"<br>"+esc(r.phone):""}</td></tr>`).join("");
  return `<div class="head"><h2>Referenten ${qh(`<ul><li>Kontakt, Anrede (Du/Sie) und Kontaktweg je Person.</li><li><b>Einschränkungen der Person</b> (nur bestimmte Tage, gesperrte Tage, nicht vormittags, nur abends, nicht in den Ferien) nur pflegen, wenn die Person in mehreren Reihen oder im Wechsel auftritt – sonst Tage und Zeiten in der Reihe.</li><li><b>Verfügbarkeit aus Abfragen</b>: was über „Vorabfrage Verfügbarkeit“ → „Antwort einfügen“ übernommen wurde (abwesend, kann nicht, kann nur, Wunschanzahl). Im Dialog einzeln entfernbar.</li><li><b>Nachrichtenverlauf</b> im Dialog: alle Anfragen und Antworten mit Datum und Absender.</li><li>Die Prüfung nutzt die Angaben automatisch für jeden Termin.</li><li>Sortiert nach Vorname; Titel wie Dr. werden ignoriert.</li><li><b>Ungespeicherte Änderungen</b> im Dialog: geänderte Felder magenta umrahmt mit Balken links, betroffene Bereiche mit „● geändert“, unten die Anzahl. Verschwindet nach „Speichern“ oder wenn der alte Wert wieder eingetragen wird.</li></ul>`)}</h2><div class="tools">${seg}${sender}<button class="btn primary" data-newref="1">+ Referent</button></div></div>
  ${rs.length ? `<div class="scroll"><table class="list"><thead><tr><th>Name</th><th>Reihen</th><th>Verfügbarkeit</th><th>Kontakt</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty">Noch keine Referenten angelegt.</div>`}`;
}

/* ---------- Übernachtungen im Dachgeschoss und Messen in Berlin (v121) ---------- */
/* Termine, deren Belegung des Dachgeschosses die Übernachtung überschneidet */
const stayHits = x => evList().filter(e => e.date >= x.from && e.date <= x.to && e.status !== "abgesagt" && e.kind !== "notiz")
  .filter(e => occ(e).some(o => o[2] === STAY_ROOM && staysOn(e.date).some(q => q.x.id === x.id && ov(o[0], o[1], q.s, q.e))));
const fairsIn = x => fairList().filter(f => f.from <= x.to && x.from <= (f.to || f.from));
async function saveStays(msg){
  const doc = {items:JSON.parse(JSON.stringify(S.stays || {})), fairs:JSON.parse(JSON.stringify(S.fairs || {})), set:localIso()};
  render(); if (!db){ offTouch(); if (msg) toast(msg); return true; }
  try { await db.doc("meta/stays").set(doc); if (msg) toast(msg); return true; } catch(e){ toast("Übernachtungen nicht gespeichert – bitte erneut versuchen"); return false; }
}
function viewStays(){
  const t = todayStr(), all = stayList(), next = all.filter(x => x.to >= t), past = all.filter(x => x.to < t).reverse();
  const ed = UI.stayEdit && S.stays[UI.stayEdit] ? S.stays[UI.stayEdit] : null, fe = UI.fairEdit && S.fairs[UI.fairEdit] ? S.fairs[UI.fairEdit] : null;
  const row = x => { const cl = stayClash(x), hits = stayHits(x), fs = fairsIn(x);
    const hint = [...cl.map(y => `<span class="lv err">überschneidet sich mit ${esc(stayName(y))} (${fmt(y.from)}–${fmt(y.to)})</span>`),
      ...hits.map(e => `<span class="lv ${x.status === "gebucht" ? "err" : "warn"}" data-ev="${e.id}" style="cursor:pointer" title="Termin öffnen">${WD[wdOf(e.date)]} ${fmt(e.date)} ${esc(e.start || "")} ${esc(evName(e))} im DG</span>`),
      ...fs.map(f => `<span class="lv info">Messe: ${esc(f.name)}</span>`)].join(" ");
    return `<tr class="${UI.stayEdit === x.id ? "edt" : ""}"><td class="t">${WD[wdOf(x.from)]} ${fmtY(x.from)} <small>${esc(x.fromT || STAY_IN)}</small></td><td class="t">${WD[wdOf(x.to)]} ${fmtY(x.to)} <small>${esc(x.toT || STAY_OUT)}</small></td><td class="t">${stayNights(x)}</td><td>${BED}<b>${esc(stayName(x))}</b></td><td class="t">${Math.min(4, Math.max(1, +x.persons || 1))}</td><td><span class="stb${x.status === "gebucht" ? "" : " vm"}">${esc(x.status || "vorgemerkt")}</span></td><td>${hint}</td><td>${esc(x.note || "")}</td><td class="nowrap"><button class="btn ghost" data-stayed="${x.id}">Bearbeiten</button><button class="btn ghost" data-staydel="${x.id}">Entfernen</button></td></tr>`; };
  const tab = l => `<div class="scroll"><table class="list stays"><thead><tr><th>Anreise</th><th>Abreise</th><th>Nächte</th><th>Name</th><th>Pers.</th><th>Status</th><th>Hinweise</th><th>Notiz</th><th></th></tr></thead><tbody>${l.map(row).join("")}</tbody></table></div>`;
  const refs = Object.values(S.referents).map(r => r.name).filter(Boolean).sort((a,b) => a.localeCompare(b, "de"));
  const v = ed || {fromT:STAY_IN, toT:STAY_OUT, status:"vorgemerkt", persons:1};
  const frow = f => `<tr class="${UI.fairEdit === f.id ? "edt" : ""}"><td class="t">${WD[wdOf(f.from)]} ${fmtY(f.from)}${f.to && f.to !== f.from ? " – " + WD[wdOf(f.to)] + " " + fmtY(f.to) : ""}</td><td><b>${esc(f.name || "")}</b></td><td>${esc(f.note || "")}</td><td class="nowrap"><button class="btn ghost" data-faired="${f.id}">Bearbeiten</button><button class="btn ghost" data-fairdel="${f.id}">Entfernen</button></td></tr>`;
  const fl = fairList(), fNext = fl.filter(f => (f.to || f.from) >= t), fPast = fl.filter(f => (f.to || f.from) < t).reverse();
  const help = `<b>Übernachtungen</b> (Gästezimmer im Dachgeschoss, eine Einheit)<ul><li>Bezug standardmäßig ab ${STAY_IN} Uhr, Auszug bis ${STAY_OUT} Uhr; beides je Buchung änderbar. 1–4 Personen.</li><li>Status: <b>vorgemerkt</b> (blass, gestrichelt) oder <b>gebucht</b> (grau).</li><li>Erscheinen in der Wochen-/Tagesansicht in der Spalte „Dachgeschoss“ (Klick: bearbeiten), im Jahresüberblick als <span class="sti">${BED}</span> am Tag; überall mit Bett-Symbol und auf der Team-Seite (mit Namen). Nicht auf der öffentlichen Belegungsseite.</li><li>Prüfung: Liegt eine Veranstaltung oder Vermietung im Dachgeschoss (inkl. Aufbau, Check-in, Nachlauf) in einer Übernachtung, ist das bei „gebucht“ ein Fehler, bei „vorgemerkt“ ein Hinweis – am Termin, im Prüfbericht und hier unter „Hinweise“.</li><li>Zwei Übernachtungen zur selben Zeit: rot markiert (nur eine Einheit).</li><li><b>Aktuell und kommend</b> / <b>Vergangen</b>: Übernachtungen und Messen, deren Ende vor heute liegt, stehen in der Ansicht „Vergangen“ (dort bearbeiten und entfernen möglich).</li><li><b>Messen in Berlin</b>: Zeiträume, in denen Übernachtungsgäste wahrscheinlicher sind (Hotelpreise). Dezent in der Spalte „Dachgeschoss“ und im Jahresüberblick in der Notizspalte; keine Prüfung.</li></ul>`;
  const back = UI.stayBack ? `<button class="btn" type="button" data-staybk="1">← zurück zur ${UI.stayBack === "jahr" ? "Jahresübersicht" : "Woche"}</button>` : "";
  const PAST = !!UI.stayPast;
  const sForm = `${ed ? `<section class="stayed"><h3>Übernachtung bearbeiten: ${BED}${esc(stayName(ed))} <span class="notes">${esc(stayPer(ed))}</span></h3>` : ""}<form class="filters stayf" id="stayForm"><input class="in" id="sName" list="stayNames" placeholder="Name" value="${esc(v.name || "")}" required aria-label="Name"><datalist id="stayNames">${refs.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    <label class="cb">Personen <select class="in" id="sPers">${opt(["1","2","3","4"], String(Math.min(4, Math.max(1, +v.persons || 1))))}</select></label>
    <label class="cb">Anreise <input class="in" type="date" id="sFrom" value="${esc(v.from || "")}" required> <input class="in" type="time" id="sFromT" value="${esc(v.fromT || STAY_IN)}" step="900" required></label>
    <label class="cb">Abreise <input class="in" type="date" id="sTo" value="${esc(v.to || "")}" required> <input class="in" type="time" id="sToT" value="${esc(v.toT || STAY_OUT)}" step="900" required></label>
    <select class="in" id="sStatus" aria-label="Status">${opt(STAY_ST, v.status || "vorgemerkt")}</select>
    <input class="in" id="sNote" placeholder="Notiz (optional)" value="${esc(v.note || "")}">
    <button class="btn primary" type="submit">${ed ? "Speichern" : "+ Übernachtung"}</button>${ed ? `<button class="btn" type="button" data-stayed="">Abbrechen</button>` : ""}</form>${ed ? "</section>" : ""}`;
  const fForm = `${fe ? `<section class="stayed"><h3>Messe bearbeiten: ${esc(fe.name || "")} <span class="notes">${esc(fairPer(fe))}</span></h3>` : ""}<form class="filters" id="fairForm"><input class="in" type="date" id="mFrom" value="${esc(fe ? fe.from : "")}" required aria-label="von"><input class="in" type="date" id="mTo" value="${esc(fe ? fe.to || "" : "")}" aria-label="bis (optional)"><input class="in" id="mName" placeholder="Name, z. B. ITB" value="${esc(fe ? fe.name || "" : "")}" required><input class="in" id="mNote" placeholder="Notiz (optional)" value="${esc(fe ? fe.note || "" : "")}"><button class="btn primary" type="submit">${fe ? "Speichern" : "+ Messe"}</button>${fe ? `<button class="btn" type="button" data-faired="">Abbrechen</button>` : ""}</form>${fe ? "</section>" : ""}`;
  const fTab = l => `<div class="scroll"><table class="list"><thead><tr><th>Zeitraum</th><th>Messe</th><th>Notiz</th><th></th></tr></thead><tbody>${l.map(frow).join("")}</tbody></table></div>`;
  const nav = `<nav class="setnav" aria-label="Übernachtungen"><span class="seg" role="group"><button class="btn ${PAST ? "" : "primary"}" data-staypast="0">Aktuell und kommend</button><button class="btn ${PAST ? "primary" : ""}" data-staypast="1">Vergangen (${past.length + fPast.length})</button></span></nav>`;
  /* v122: Vergangenes in eigener Ansicht (Sebastian 02.11.2026); Bearbeiten dort nur über „Bearbeiten“ */
  if (PAST) return `<div class="head"><h2>Übernachtungen ${qh(help)}</h2>${back}</div>${nav}
  ${ed ? sForm : ""}
  ${past.length ? tab(past) : `<div class="empty">Keine vergangenen Übernachtungen.</div>`}
  <h3 class="sh">Vergangene Messen</h3>${fe ? fForm : ""}
  ${fPast.length ? fTab(fPast) : `<div class="empty">Keine vergangenen Messen.</div>`}`;
  return `<div class="head"><h2>Übernachtungen ${qh(help)}</h2>${back}</div>${nav}
  ${sForm}
  ${next.length ? tab(next) : `<div class="empty">Keine kommenden Übernachtungen eingetragen.</div>`}
  <h3 class="sh">Messen in Berlin</h3>
  ${fForm}
  ${fNext.length ? fTab(fNext) : `<div class="empty">Keine kommenden Messen eingetragen.</div>`}`;
}
/* ---------- Einstellungen: Abwesenheiten im Team ---------- */
const absHit = a => evList().filter(e => e.kind==="va" && e.status !== "abgesagt" && a.from <= e.date && e.date <= (a.to||a.from));
const absPer = a => `${fmtY(a.from)}${a.to&&a.to!==a.from?" – "+fmtY(a.to):""}`;
const absSorted = () => Object.values(S.absences).sort((a,b) => (a.from||"").localeCompare(b.from||""));
function viewAbwesend(){
  const as = absSorted().filter(a => !a.block);
  const rows = as.map(a => { const hit = absHit(a); return `<tr><td><b>${esc(a.person)}</b></td><td class="t">${absPer(a)}</td><td>${esc(a.note||"")}</td><td>${hit.length} Termine${hit.some(e => e.hybrid)?' · <span class="lv warn">davon hybrid</span>':""}</td><td><button class="btn ghost" data-delabs="${a.id}">Entfernen</button></td></tr>`; }).join("");
  return `${setNav()}<div class="head"><h2>Abwesenheiten im Team ${qh(`<b>Abwesenheiten im Team</b><ul><li>Erscheinen als Info am betroffenen Termin.</li><li>Ist Sebastian abwesend, meldet die Prüfung jede Hybrid-Veranstaltung als Fehler.</li><li>Sperrtage (keine Veranstaltung im Haus) stehen unter „Kalender“.</li></ul>`)}</h2></div>
  <form class="filters" id="absForm"><input class="in" id="aPerson" list="teamList" placeholder="Person" required><datalist id="teamList"><option>Sebastian</option><option>Kati</option></datalist><input class="in" type="date" id="aFrom" required aria-label="von"><input class="in" type="date" id="aTo" aria-label="bis"><input class="in" id="aNote" placeholder="Anlass (optional)"><button class="btn primary" type="submit">+ Abwesenheit</button></form>
  ${as.length ? `<div class="scroll"><table class="list"><thead><tr><th>Person</th><th>Zeitraum</th><th>Anlass</th><th>Betroffene Termine</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : `<div class="empty">Noch keine Abwesenheiten eingetragen.</div>`}`;
}
/* ---------- Einstellungen: Kalender (Schulferien, Feiertage, Sperrtage, Wochenstatus) ---------- */
const wkMon = k => { const y = +k.slice(0,4), w = +k.slice(6), j4 = D(y + "-01-04"); return S_(j4 - (wdOf(y + "-01-04") + 6) % 7 + (w - 1) * 7); };
const wkLabel = k => { const m = wkMon(k); return `KW ${+k.slice(6)}/${k.slice(0,4)} · ${fmt(m)}–${fmtY(S_(D(m) + 6))}`; };
function viewKalender(){
  const st = S.settings || {}, own = Array.isArray(st.ferien);
  const fer = FERIEN.slice().sort((a,b) => a[0].localeCompare(b[0])), ex = (Array.isArray(st.feierExtra) ? st.feierExtra : []).slice().sort((a,b) => a[0].localeCompare(b[0]));
  const ferRows = fer.map(f => `<tr><td class="t">${fmtY(f[0])}${f[1] !== f[0] ? " – " + fmtY(f[1]) : ""}</td><td>${esc(f[2] || "")}</td><td><button class="btn ghost" data-ferdel='${esc(JSON.stringify(f))}'>Entfernen</button></td></tr>`).join("");
  const auto = FEIER_YEARS().map(y => `<tr><td class="t"><b>${y}</b></td><td>${Object.entries(feierBerlin(y)).map(([d, n]) => `<span class="cfgday">${WD[wdOf(d)]} ${fmt(d)} ${esc(n)}</span>`).join("")}</td></tr>`).join("");
  const exRows = ex.map(f => `<tr><td class="t">${WD[wdOf(f[0])]} ${fmtY(f[0])}</td><td>${esc(f[1] || "")}</td><td><button class="btn ghost" data-fxdel="${esc(f[0])}">Entfernen</button></td></tr>`).join("");
  const sp = absSorted().filter(a => a.block);
  const srows = sp.map(a => { const hit = absHit(a); return `<tr><td class="t">${WD[wdOf(a.from)]} ${absPer(a)}</td><td>${esc(a.note||"")}</td><td>${hit.length ? `<span class="lv err">${hit.length} Termine liegen darauf</span>` : "frei"}</td><td><button class="btn ghost" data-delabs="${a.id}">Entfernen</button></td></tr>`; }).join("");
  const wks = Object.entries(S.weeks || {}).filter(([, v]) => v === "ruhig" || v === "pause").sort((a,b) => a[0].localeCompare(b[0]));
  const wsel = (k, v) => `<select class="in" data-wksel="${k}" aria-label="Status ${esc(wkLabel(k))}">${opt([["belebt","belebt (entfernen)"],["ruhig","ruhig"],["pause","Programmpause"]], v)}</select>`;
  const wrow = ([k, v]) => `<tr><td class="t">${wkLabel(k)}</td><td>${wsel(k, v)}</td></tr>`, tw = weekKey(todayStr());
  const wNext = wks.filter(([k]) => k >= tw), wPast = wks.filter(([k]) => k < tw);
  const wtab = l => `<div class="scroll"><table class="list"><thead><tr><th>Woche</th><th>Status</th></tr></thead><tbody>${l.map(wrow).join("")}</tbody></table></div>`;
  const help = `<b>Kalender</b><ul><li><b>Schulferien</b> (Berlin): erscheinen im Jahresüberblick und in der Wochenansicht als Hinweis; Quelle: Senatsverwaltung für Bildung (Ferientermine). Ändern = Entfernen und neu eintragen.</li><li><b>Feiertage</b>: gesetzliche Feiertage in Berlin werden je Jahr automatisch berechnet (${FEIER_YEARS()[0]}–${FEIER_YEARS()[2]}). Einmalige oder zusätzliche Feiertage unter „Zusätzliche Feiertage“. Termine an Feiertagen sind ein Fehler.</li><li><b>Sperrtage</b>: Tage ohne Veranstaltung im Haus (auch Zeiträume). Jeder Termin daran ist ein Fehler; im Jahresüberblick wie ein Feiertag, in der Wochenansicht als rotes Schild.</li><li><b>Ruhige Wochen und Programmpausen</b>: dieselben Angaben wie im Jahresüberblick (Klick auf die Wochenspalte); hier als Liste. Ruhige Wochen: nur Reihen mit „ruhige Woche: ja“, sonst Hinweis. Programmpause: keine Termine.</li><li>Änderungen gelten sofort für alle (Prüfung, Jahresüberblick, Wochenansicht, Team-Seite, öffentliche Seite ab dem nächsten Lauf der Routine).</li></ul>`;
  return `${setNav()}<div class="head"><h2>Kalender ${qh(help)}</h2></div>
  <h3 class="sh">Schulferien Berlin</h3>
  <form class="filters" id="ferForm"><input class="in" type="date" id="fFrom" required aria-label="von"><input class="in" type="date" id="fTo" aria-label="bis (optional)"><input class="in" id="fName" placeholder="Name, z. B. Sommerferien" required><button class="btn primary" type="submit">+ Ferien</button>${own ? `<button class="btn ghost" type="button" data-ferdef="1" title="Eigene Liste verwerfen, Standardliste von 2026/27 verwenden">Standardliste</button>` : ""}</form>
  ${fer.length ? `<div class="scroll"><table class="list"><thead><tr><th>Zeitraum</th><th>Name</th><th></th></tr></thead><tbody>${ferRows}</tbody></table></div>` : `<div class="empty">Keine Schulferien eingetragen.</div>`}
  <h3 class="sh">Feiertage Berlin (automatisch)</h3>
  <div class="scroll"><table class="list cfgfeier"><tbody>${auto}</tbody></table></div>
  <h3 class="sh">Zusätzliche Feiertage</h3>
  <form class="filters" id="fxForm"><input class="in" type="date" id="xDate" required aria-label="Datum"><input class="in" id="xName" placeholder="Name, z. B. 80. Jahrestag Kriegsende" required><button class="btn primary" type="submit">+ Feiertag</button></form>
  ${ex.length ? `<div class="scroll"><table class="list"><thead><tr><th>Datum</th><th>Name</th><th></th></tr></thead><tbody>${exRows}</tbody></table></div>` : `<div class="empty">Keine zusätzlichen Feiertage.</div>`}
  <h3 class="sh">Sperrtage</h3>
  <form class="filters" id="blkForm"><input class="in" type="date" id="bFrom" required aria-label="Datum (von)"><input class="in" type="date" id="bTo" aria-label="bis (optional)"><input class="in" id="bNote" placeholder="Anlass (optional)"><button class="btn primary" type="submit">+ Sperrtag</button></form>
  ${sp.length ? `<div class="scroll"><table class="list"><thead><tr><th>Datum</th><th>Anlass</th><th>Termine</th><th></th></tr></thead><tbody>${srows}</tbody></table></div>` : `<div class="empty">Keine Sperrtage eingetragen.</div>`}
  <h3 class="sh">Ruhige Wochen und Programmpausen</h3>
  <form class="filters" id="wkForm"><input class="in" type="date" id="wDate" required aria-label="ein Tag der Woche"><select class="in" id="wVal" aria-label="Status">${opt([["ruhig","ruhig"],["pause","Programmpause"]], "ruhig")}</select><button class="btn primary" type="submit">+ Woche</button></form>
  ${wNext.length ? wtab(wNext) : `<div class="empty">Keine kommenden ruhigen Wochen oder Pausen eingetragen.</div>`}
  ${wPast.length ? `<details class="sec"><summary>Vergangene Wochen (${wPast.length})</summary>${wtab(wPast)}</details>` : ""}`;
}
/* ---------- Einstellungen: Zeiten & Fristen, Kontakte & Adressen ---------- */
const SET_F = {
  zeiten: [["ci","Check-in vor Beginn","Min","number","0","120","5","Ankunft der Gäste: Küche und Flur belebt; Grundlage für Lärm- und Überlagerungsprüfung"],
    ["openFrom","Kernöffnungszeit von","Uhr","time","","","","Beginn außerhalb ergibt einen Hinweis; bestimmt auch die Zeitachse der Wochenansicht"],
    ["openTo","Kernöffnungszeit bis","Uhr","time","","","","Ende inkl. Nachlauf später ergibt einen Hinweis"],
    ["umbau","Umbauzeit Workshopraum","Min","number","0","480","15","Mindestzeit bei Wechsel der Möblierung am selben Tag"],
    ["hybSetup","Aufbau bei Hybrid","Std","number","0","12","0.5","gilt, wenn Termin und Reihe keinen eigenen Aufbau haben"],
    ["onlineWeeks","Online-Frist","Wochen vorher","number","1","26","1","bis dahin veröffentlicht, sonst Fehler"],
    ["warnWeeks","Vorwarnung","Wochen vorher","number","1","30","1","ab dann Hinweis, solange der Status unter „fix“ liegt; muss größer als die Online-Frist sein"],
    ["nachfass","Nachfassen bei Referenten","Tage","number","1","60","1","ohne Antwort nach so vielen Tagen: „nachfassen“"],
    ["altStep","Raster „Mögliche Zeiten“","Min","number","15","60","15","Beginnzeiten in diesen Schritten (15, 30 oder 60)"],
    ["wsMaxH","Warnung Website-Abgleich","Std","number","6","240","1","Warnleiste, wenn der Abgleich länger nicht lief (nur Werktagsstunden)"]],
  kontakte: [["invLoc","Ort in der Termineinladung","","text","","","","Hybrid: Ort der Outlook-Einladung"],
    ["sebMail","E-Mail Sebastian (Einladung)","","email","","","","wird bei Hybrid automatisch eingeladen, wenn bei Sebastian keine E-Mail hinterlegt ist"],
    ["noteMail","Adresse für Notizen (Team-Seite)","","email","","","","Notiz-Knopf im Detailblatt der Team-Seite"],
    ["belegUrl","Link Belegungsseite","","url","","","","in Mails an Referenten"],
    ["teamUrl","Link Team-Seite","","url","","","","unter Sicherung → Team-Seite fürs Handy"],
    ["cleanUrl","Link Reinigungsseite","","url","","","","unter Reinigung und Einstellungen → Reinigung"]]};
function setForm(kind){
  const st = S.settings || {};
  const fld = ([k, l, u, ty, mn, mx, sp, h]) => `<label>${esc(l)}${u ? ` (${esc(u)})` : ""} <span class="hint">${esc(h)} · Standard: ${esc(String(SET_DEF[k]))}${st[k] != null && st[k] !== "" && String(st[k]) !== String(SET_DEF[k]) ? " · <b>geändert</b>" : ""}</span><input class="in" name="${k}" type="${ty}"${mn ? ` min="${mn}"` : ""}${mx ? ` max="${mx}"` : ""}${sp ? ` step="${sp}"` : ""} value="${esc(String(setv(k)))}"></label>`;
  return `<form class="form cfg" id="setForm" data-kind="${kind}">${SET_F[kind].map(fld).join("")}<div class="full cfgbtn"><button class="btn primary" type="submit">Speichern</button> <button class="btn ghost" type="button" data-setdef="${kind}">Alle auf Standard</button></div></form>`;
}
function viewZeiten(){
  const help = `<b>Zeiten & Fristen</b><ul><li>Gelten sofort für alle Prüfungen und Ansichten (auch Team-Seite nach dem nächsten Lauf der Routine).</li><li>Leeres Feld = Standard.</li><li>Achtung: Ändern sich Check-in oder Kernöffnungszeit, ändern sich auch die Texte der betroffenen Prüfhinweise – bereits akzeptierte Konflikte dieser Art erscheinen dann wieder.</li></ul>`;
  return `${setNav()}<div class="head"><h2>Zeiten & Fristen ${qh(help)}</h2></div>${setForm("zeiten")}`;
}
function viewKontakte(){
  const help = `<b>Kontakte & Adressen</b><ul><li>Adressen und Links, die der Planer in Mails, Einladungen und auf der Team-Seite verwendet.</li><li>Leeres Feld = Standard.</li></ul>`;
  return `${setNav()}<div class="head"><h2>Kontakte & Adressen ${qh(help)}</h2></div>${setForm("kontakte")}`;
}

/* Zähler am Reiter „Prüfung“: rot = Anzahl Fehler; gelb angeschnitten dahinter = es gibt Hinweise; ohne Fehler gelb mit Anzahl Hinweise */
function errBadge(){
  const b = document.querySelector('#tabs [data-view="pruefung"]'); if (!b) return;
  const og = prGroups().filter(g => g.open), n = og.filter(g => g.l === "err").length, w = og.filter(g => g.l === "warn").length;
  const cap = x => x > 99 ? "99+" : x, wt = `${w} ${w === 1 ? "Hinweis" : "Hinweise"}`;
  b.innerHTML = "Prüfung" + (n ? (w ? `<span class="nbadge hint peek" aria-hidden="true"></span>` : "") + `<span class="nbadge" title="${n} Fehler${w ? " · " + wt : ""} im Prüfbericht">${cap(n)}</span>`
    : w ? `<span class="nbadge hint" title="${wt} im Prüfbericht">${cap(w)}</span>` : "");
  b.setAttribute("aria-label", "Prüfung" + (n ? `, ${n} Fehler` : "") + (w ? `, ${wt}` : ""));
  const rb = document.querySelector('#tabs [data-view="referenten"]'); if (!rb) return;
  const k = personRefs().filter(r => ["neu","late","ans"].includes(personInfo(r).state)).length;
  rb.innerHTML = "Referenten" + (k ? `<span class="nbadge" style="background:var(--violet-2)" title="${k} Personen brauchen einen Schritt (neu anzuschreiben, nachfassen, Antwort auswerten)">${k > 99 ? "99+" : k}</span>` : "");
}
/* Popover an einer Fehlerstelle: Konflikt akzeptieren oder wieder aktivieren */
function zonePop(i, el){
  const z = (ISS.zones || [])[i], p = $("#zpop"); if (!z || !p) return;
  const lines = z.m.map(q => { const e = S.events[q.id]; return `<li><b>${esc(e ? evName(e) : q.id)}</b>: ${esc(q.t)}</li>`; }).join("");
  const q0 = z.m[0];
  p.innerHTML = `<div class="zph"><span class="lv ${z.acc ? "warn" : z.l}">${z.acc ? "akzeptiert" : z.l === "err" ? "Fehler" : "Hinweis"}</span> ${esc(m2t(z.from)+"–"+m2t(z.to))} <button class="btn ghost" data-zclose="1" aria-label="Schließen">✕</button></div><ul>${lines}</ul>`
    + (z.acc ? `<button class="btn" data-acc='${esc(JSON.stringify([q0.id, q0.t]))}' data-on="0">Wieder als ${z.l === "err" ? "Fehler" : "Hinweis"} werten</button>`
             : `<button class="btn primary" data-acc='${esc(JSON.stringify([q0.id, q0.t]))}' data-on="1">Akzeptieren</button><div class="notes">Akzeptiert zählt nicht mehr im Prüfbericht, im Jahresüberblick und im Zähler – hier bleibt die Stelle gelb markiert.</div>`);
  p.hidden = false; const r = el.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  let x = r.left, y = r.bottom + 6; if (x + w > innerWidth - 12) x = Math.max(12, innerWidth - 12 - w); if (y + h > innerHeight - 12) y = Math.max(12, r.top - 6 - h);
  p.style.left = x + "px"; p.style.top = y + "px";
}
document.addEventListener("click", ev => { const p = $("#zpop"); if (!p || p.hidden) return; if (ev.target.closest("[data-zclose]") || (!ev.target.closest("#zpop") && !ev.target.closest("[data-zone]"))) p.hidden = true; }, true);
/* ---------- Anfragen an Referenten (Runden, Nachrichtenverlauf, Auswertung) ---------- */
const RTYPES = {verf:"Verfügbarkeit (Vorabfrage)", term:"Terminabfrage (Vorplanung)"};
/* Terminabfrage: nur Termine, die zur Besprechung stehen (Status Idee, Option, angefragt; keine festen Termine) */
const DISCUSS = ["Idee","Option","angefragt"];
const rdType = rd => (rd && rd.type) || "verf";
let NACHFASS_TAGE = 10; /* Einstellungen */
const senderName = () => UI.sender || "";
const SENDER_IDS = {Kati:"kati-burchart", Sebastian:"sebastian-roeder"};
const sigName = sn => { if (!sn) return "[Name]"; const r = S.referents[SENDER_IDS[sn]]; return r && r.name ? r.name.replace(/^((Dr|Prof|Dipl)\.?(-\w+\.?)?\s+)+/i, "") : sn; };
const firstName = r => { const n = sortName(r.name||""); if (/team/i.test(n)) return ""; return n.split(/\s+/)[0] || ""; };
const greet = r => { const fn = firstName(r); if ((r.salutation||"Du") === "Sie") return fn ? "Guten Tag " + sortName(r.name).replace(/\s*\(.*\)$/,"") + "," : "Guten Tag,"; return fn ? "Hallo " + fn + "," : "Hallo zusammen,"; };
const isTeamInternal = r => ["sebastian-roeder","kati-burchart"].includes(r.id);
/* Wen betrifft die Abfrage: Referenten aktiver Reihen oder mit Terminen ab März */
function roundRefs(rd){
  if (rdType(rd) === "term") return [...new Set(termEvents().flatMap(e => e.refs||[]))].map(id => S.referents[id]).filter(r => r && !isTeamInternal(r)).sort(byRefName);
  const ids = new Set();
  Object.values(S.series).filter(s => s.active !== false).forEach(s => (s.refs||[]).forEach(r => ids.add(r)));
  evList().filter(e => e.kind === "va" && e.status !== "abgesagt" && e.date >= YEAR+"-03-01").forEach(e => (e.refs||[]).forEach(r => ids.add(r)));
  return [...ids].map(id => S.referents[id]).filter(r => r && !isTeamInternal(r)).sort(byRefName);
}
const refSeries = r => Object.values(S.series).filter(s => s.active !== false && (s.refs||[]).includes(r.id)).map(s => s.name);
function verfText(r, sender){
  const du = (r.salutation||"Du") !== "Sie", ser = refSeries(r), team = /team/i.test(r.name||"");
  const subj = "SURVIVORS HOME – Planung " + YEAR + ": " + (du ? (team ? "Wann könnt ihr nicht?" : "Wann kannst du nicht?") : "Wann können Sie nicht?");
  const angebot = ser.length ? (du ? (team ? " für euer Angebot " : " für dein Angebot ") : " für Ihr Angebot ") + ser.map(x => "„" + x + "“").join(" und ") : "";
  const L = du ? (team
     ? ["wir beginnen mit der Planung für " + YEAR + angebot + ". Bevor wir euch konkrete Termine vorschlagen, möchten wir wissen, was bei euch nicht geht – dann treffen unsere Vorschläge besser. Stichpunkte reichen völlig:", "Was ihr noch nicht wisst, könnt ihr jederzeit nachreichen."]
     : ["wir beginnen mit der Planung für " + YEAR + angebot + ". Bevor wir dir konkrete Termine vorschlagen, möchten wir wissen, was bei dir nicht geht – dann treffen unsere Vorschläge besser. Stichpunkte reichen völlig:", "Was du noch nicht weißt, kannst du jederzeit nachreichen."])
    : ["wir beginnen mit der Planung für " + YEAR + angebot + ". Bevor wir Ihnen konkrete Termine vorschlagen, möchten wir wissen, was bei Ihnen nicht geht – dann treffen unsere Vorschläge besser. Stichpunkte reichen völlig:", "Was Sie noch nicht wissen, können Sie jederzeit nachreichen."];
  const body = greet(r) + "\n\n" + L[0] + "\n\n"
    + "- Urlaub / Abwesenheiten " + YEAR + " (soweit schon bekannt):\n"
    + "- Wochentage, die gar nicht gehen (ggf. mit Zeitraum):\n"
    + "- Uhrzeiten: frühestens ab … / spätestens bis …\n"
    + "- Lieblingstage oder -zeiten:\n"
    + "- Wie viele Termine " + YEAR + " wären " + (du ? (team ? "euch" : "dir") : "Ihnen") + " recht?\n"
    + "- Sonstiges:\n\n" + L[1] + "\n\nHerzliche Grüße\n" + sigName(sender) + "\nSURVIVORS HOME";
  return {subj, body};
}
function nachfassText(r, sender){
  const du = (r.salutation||"Du") !== "Sie", team = /team/i.test(r.name||"");
  return {subj: "Erinnerung: SURVIVORS HOME – Planung " + YEAR, body: greet(r) + "\n\n" + (du ? (team ? "kurze Erinnerung an unsere Nachricht zur Planung " + YEAR + ": Habt ihr schon einen Überblick, wann es bei euch nicht geht? Stichpunkte reichen." : "kurze Erinnerung an meine Nachricht zur Planung " + YEAR + ": Hast du schon einen Überblick, wann es bei dir nicht geht? Stichpunkte reichen.") : "kurze Erinnerung an unsere Nachricht zur Planung " + YEAR + ": Haben Sie schon einen Überblick, wann es bei Ihnen nicht geht? Stichpunkte reichen.") + "\n\nHerzliche Grüße\n" + sigName(sender) + "\nSURVIVORS HOME"};
}
/* ---------- Terminabfrage: persönliche Terminliste aus der Vorplanung (immer Du- bzw. Ihr-Form) ---------- */
const termEvents = () => evList().filter(e => e.kind === "va" && e.date.startsWith(String(YEAR)) && DISCUSS.includes(e.status) && !e.fixed);
const termOf = r => termEvents().filter(e => (e.refs||[]).includes(r.id)).sort(sortEv);
const termLine = e => { const sp = span(e); return "- " + WD[wdOf(e.date)] + " " + fmtY(e.date) + (e.allDay ? ", ganztägig" : e.start ? ", " + e.start + (sp ? "–" + m2t(sp.e) : "") + " Uhr" : ", Uhrzeit folgt"); };
/* Gruppen je Angebot: gleiche Titel → Titel, sonst Name der Reihe und Titel je Zeile */
function termGroups(r){
  const g = new Map();
  termOf(r).forEach(e => { const k = e.seriesId || ("t:" + evName(e)); if (!g.has(k)) g.set(k, []); g.get(k).push(e); });
  return [...g.values()].map(evs => { const ts = [...new Set(evs.map(evName))], lab = ts.length === 1 ? ts[0] : ((S.series[evs[0].seriesId]||{}).name || ts[0]);
    return {lab, lines: evs.map(e => termLine(e) + (evName(e) !== lab ? " (" + termPart(evName(e)) + ")" : ""))}; });
}
/* Teil eines Titels wie „Die Psyche stärken – Einführung (Resilienz)“ → „Einführung“ */
const termPart = t => { const m = String(t).match(/[–-]\s*([^()–]+?)\s*(\(|$)/); return m ? m[1] : t; };
/* Gruppen (Selbsthilfe, Orga-Team): Ihr-Form, Anrede mit Vornamen der Kontaktperson, sonst „Hallo zusammen“ */
const isGroup = r => /team/i.test(r.name||"") || /Selbsthilfe/i.test(r.role||"");
const termGreet = r => { const fn = firstName(r); return fn ? (MALE.test(fn) ? "Lieber " : "Liebe ") + fn + "," : "Hallo zusammen,"; };
const termList = gs => gs.length === 1 ? gs[0].lines.join("\n") : gs.map(g => "„" + g.lab + "“\n" + g.lines.join("\n")).join("\n\n");
const termSig = sender => { if (!sender) return "Herzliche Grüße\n[Name]\nSURVIVORS HOME"; return "Herzliche Grüße\n" + sigName(sender).split(/\s+/)[0] + "\nSURVIVORS HOME"; };
function termText(r, sender, list, okList){
  const ok = okList || [];
  const team = isGroup(r), gs = list ? pGroups(list.concat(ok)) : termGroups(r), one = gs.length === 1, n = (list || termOf(r)).length;
  const ms = msgsOf(r.id), answered = ms.some(m => m.dir === "in"), known = ms.length > 0;
  const du = (a, b) => team ? b : a; /* du-Form bzw. ihr-Form */
  const names = gs.map(g => "„" + g.lab + "“").join(" und ");
  const subj = "SURVIVORS HOME – " + du("deine", "eure") + " Termine " + YEAR + ": passt das so?";
  const P = [];
  if (known){
    P.push(answered
      ? du("vielen Dank für deine Rückmeldung in der letzten Runde! Wir haben deine Verfügbarkeiten in die Planung übernommen und hoffen, dass wir dabei nichts übersehen haben.", "vielen Dank für eure Rückmeldung in der letzten Runde! Wir haben eure Verfügbarkeiten in die Planung übernommen und hoffen, dass wir dabei nichts übersehen haben.")
      : du("wir haben die Planung für " + YEAR + " ein gutes Stück vorangebracht und uns dabei an den Zeiten orientiert, die sich bei dir bisher bewährt haben.", "wir haben die Planung für " + YEAR + " ein gutes Stück vorangebracht und uns dabei an den Zeiten orientiert, die sich bei euch bisher bewährt haben."));
    P.push(du("Vielleicht hast du es bei unserer letzten Mail schon bemerkt: Für " + YEAR + " planen wir mit einem neuen Planungstool. Damit können wir die Räume und Kapazitäten im Home besser nutzen. Wundere dich also nicht, wenn manche Termine etwas anders liegen als gewohnt.",
      "Vielleicht habt ihr es bei unserer letzten Mail schon bemerkt: Für " + YEAR + " planen wir mit einem neuen Planungstool. Damit können wir die Räume und Kapazitäten im Home besser nutzen. Wundert euch also nicht, wenn manche Termine etwas anders liegen als gewohnt."));
  } else {
    P.push(du("wir freuen uns sehr, dass du " + YEAR + " bei uns im Home dabei bist!", "wir freuen uns sehr, dass ihr " + YEAR + " bei uns im Home dabei seid!"));
  }
  P.push((known ? "Diesmal kommen die konkreten Termine aus unserer Vorplanung " : "Aus unserer Vorplanung haben wir ") + (one ? du("für dein Angebot ", "für euer Angebot ") + names : du("für deine Angebote", "für eure Angebote")) + (known ? ":" : (n === 1 ? " folgenden Termin vorgesehen:" : " folgende Termine vorgesehen:")));
  P.push(list ? pList(list, ok) : termList(gs));
  P.push(du("Passen dir die Termine? Wenn ein Termin nicht geht oder noch unsicher ist, schreib es einfach dazu, ein kurzes „passt nicht“ oder „noch offen“ reicht. Wenn du selbst einen anderen Termin vorschlagen möchtest, schau am besten vorher in unseren Belegungsplan: " + BELEG_URL + ". Dort siehst du, wann im Home noch Platz ist. Sonst suchen wir einen neuen Termin für dich.",
    "Passen euch die Termine? Wenn ein Termin nicht geht oder noch unsicher ist, schreibt es einfach dazu, ein kurzes „passt nicht“ oder „noch offen“ reicht. Wenn ihr selbst einen anderen Termin vorschlagen möchtet, schaut am besten vorher in unseren Belegungsplan: " + BELEG_URL + ". Dort seht ihr, wann im Home noch Platz ist. Sonst suchen wir einen neuen Termin für euch.").replace(n === 1 ? /Passen (dir|euch) die Termine\?/ : /^$/, (m, p) => "Passt " + p + " der Termin?").replace(n === 1 ? "Wenn ein Termin nicht geht" : "§", "Wenn er nicht geht").replace(ok.length ? /die Termine\?|der Termin\?/ : /^$/, m => m === "der Termin?" ? "der noch offene Termin?" : "die noch offenen Termine?"));
  P.push(du("Wir freuen uns, wenn du dich bald meldest. Die endgültige Bestätigung schicken wir dir in der nächsten Runde, denn vielleicht müssen wir noch etwas umstellen, wenn alle Antworten da sind.",
    "Wir freuen uns, wenn ihr euch bald meldet. Die endgültige Bestätigung schicken wir euch in der nächsten Runde, denn vielleicht müssen wir noch etwas umstellen, wenn alle Antworten da sind."));
  P.push(du("Von Herzen danke, dass du " + (one ? "dein Angebot " + names : "deine Angebote") + " ins Home bringst und dich so für unsere Gäste einsetzt. Und danke, dass du uns bei der Jahresplanung so gut unterstützt. Ohne Menschen wie dich wäre das Home nicht, was es ist.",
    "Von Herzen danke, dass ihr " + (one ? "euer Angebot " + names : "eure Angebote") + " ins Home bringt und euch so für unsere Gäste einsetzt. Und danke, dass ihr uns bei der Jahresplanung so gut unterstützt. Ohne Menschen wie euch wäre das Home nicht, was es ist."));
  return {subj, body: termGreet(r) + "\n\n" + P.join("\n\n") + "\n\n" + termSig(sender)};
}
function termNachfass(r, sender){
  const team = isGroup(r), n = termOf(r).length;
  const body = termGreet(r) + "\n\n"
    + (team ? "kurze Erinnerung an unsere Nachricht zu euren Terminen " + YEAR + ": " + (n === 1 ? "Passt euch der Termin?" : "Passen euch die Termine?") + " Ein kurzes „passt“, „passt nicht“ oder „noch offen“ reicht völlig. Hier noch einmal die Übersicht:"
            : "kurze Erinnerung an meine Nachricht zu deinen Terminen " + YEAR + ": " + (n === 1 ? "Passt dir der Termin?" : "Passen dir die Termine?") + " Ein kurzes „passt“, „passt nicht“ oder „noch offen“ reicht völlig. Hier noch einmal die Übersicht:")
    + "\n\n" + termList(termGroups(r)) + "\n\n" + termSig(sender);
  return {subj: "Erinnerung: SURVIVORS HOME – " + (team ? "eure" : "deine") + " Termine " + YEAR, body};
}
/* Anrede: „Liebe Sabine“ / „Lieber Armin“ – Vornamen mit männlicher Anrede */
const MALE = /^(Armin|Günter|Guenter|Thomas|Manuel|Jörg|Joerg|Johann|Marco|Tobias|Sebastian|Uwe)$/i;
let BELEG_URL = "https://belegung.survivors-home.de/"; /* Einstellungen */
/* Mailtext je Rundentyp */
const roundText = (r, sender, rd, remind) => rdType(rd) === "term" ? (remind ? termNachfass(r, sender) : termText(r, sender)) : (remind ? nachfassText(r, sender) : verfText(r, sender));
const msgsOf = (rid, roundId) => Object.values(S.msgs||{}).filter(m => m.ref === rid && (!roundId || m.round === roundId)).sort((a,b) => (a.at||"").localeCompare(b.at||""));
function roundState(r, rd){
  const ms = msgsOf(r.id, rd.id), outs = ms.filter(m => m.dir === "out"), ins = ms.filter(m => m.dir === "in");
  if (ins.some(m => m.applied)) return {k:"done", t:"ausgewertet", d:ins[ins.length-1].at};
  if (ins.length) return {k:"in", t:"Antwort da – auswerten", d:ins[ins.length-1].at};
  if (outs.length){ const last = outs[outs.length-1], days = Math.floor((Date.now() - new Date(last.at).getTime()) / 864e5);
    return days >= NACHFASS_TAGE ? {k:"late", t:"nachfassen (seit " + days + " Tagen keine Antwort)", d:last.at} : {k:"sent", t:(last.channel === "Mail" ? "versendet" : last.channel === "Telefon" ? "angerufen" : "übergeben") + " – wartet", d:last.at}; }
  return {k:"open", t:"offen", d:""};
}
const fmtAt = at => at ? fmtY(at.slice(0,10)) + " " + at.slice(11,16) : "";
async function logMsg(o){
  const id = newId("msgs"); o.id = id; o.at = o.at || new Date().toISOString().slice(0,19); o.by = o.by || senderName();
  if (o.text && o.text.length > 6000) { o.text = o.text.slice(0, 6000) + "\n[… gekürzt]"; }
  S.msgs = Object.assign({}, S.msgs || {}, {[id]: o});
  if (db){ try { await db.collection("msgs").doc(id).set(o); } catch(e){ toast("Verlauf nicht gespeichert"); } } else offTouch();
  render(); return id;
}
/* ---------- Mails als HTML (Rich Text) für die Zwischenablage ----------
   Aus dem Mailtext wird HTML: Absätze, Terminlisten als Tabelle je Veranstaltung, Links anklickbar, Zeilenumbrüche erhalten. */
const MAIL_CSS = {body:"font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#3C3C3B;line-height:1.4",
  p:"margin:0 0 12px 0", h:"margin:14px 0 4px 0;font-weight:bold;color:#662483",
  table:"border-collapse:collapse;margin:0 0 12px 0;font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#3C3C3B",
  th:"text-align:left;padding:4px 14px 4px 0;border-bottom:1px solid #AC3F90;font-weight:bold;color:#662483",
  td:"padding:4px 14px 4px 0;border-bottom:1px solid #E2DBE8;vertical-align:top", ok:"color:#2E7D4F"};
const linkify = s => esc(s).replace(/(https?:\/\/[^\s<]+?)(?=[.,;:!?)]?(\s|$))/g, u => `<a href="${u}" style="color:#662483">${u}</a>`);
function mailHtml(text){
  const rowRe = /^- (\S+) (\d\d\.\d\d\.\d{4}), (ganztägig|Uhrzeit folgt|[^–]*?Uhr|\d\d:\d\d–\d\d:\d\d Uhr)(.*)$/;
  const table = rows => { const ps = rows.map(l => { const m = l.match(rowRe); if (!m) return null; const rest = m[4].replace(/^\s*–\s*/, "").trim(); return [m[1] + " " + m[2], m[3], rest]; });
    if (ps.some(x => !x)) return null;
    const note = ps.some(x => x[2]);
    return `<table style="${MAIL_CSS.table}"><tr><th style="${MAIL_CSS.th}">Datum</th><th style="${MAIL_CSS.th}">Uhrzeit</th>${note ? `<th style="${MAIL_CSS.th}">Hinweis</th>` : ""}</tr>`
      + ps.map(x => `<tr><td style="${MAIL_CSS.td}">${esc(x[0])}</td><td style="${MAIL_CSS.td}">${esc(x[1])}</td>${note ? `<td style="${MAIL_CSS.td}${/zugesagt/.test(x[2]) ? ";" + MAIL_CSS.ok : ""}">${esc(/zugesagt/.test(x[2]) ? "✓ " + x[2] : x[2])}</td>` : ""}</tr>`).join("") + `</table>`; };
  const out = String(text).split(/\n{2,}/).map(par => {
    const lines = par.split("\n");
    const head = lines.length > 1 && /^„.*“$/.test(lines[0]) && lines.slice(1).every(l => l.startsWith("- ")) ? lines[0] : null;
    const items = head ? lines.slice(1) : lines.every(l => l.startsWith("- ")) ? lines : null;
    if (items){ const t = table(items); if (t) return (head ? `<p style="${MAIL_CSS.h}">${esc(head)}</p>` : "") + t;
      return (head ? `<p style="${MAIL_CSS.h}">${esc(head)}</p>` : "") + `<ul style="${MAIL_CSS.p}">${items.map(l => `<li>${linkify(l.slice(2))}</li>`).join("")}</ul>`; }
    return `<p style="${MAIL_CSS.p}">${lines.map(linkify).join("<br>")}</p>`;
  }).join("");
  return `<div style="${MAIL_CSS.body}">${out}</div>`;
}
/* Rich Text in die Zwischenablage (HTML + Text); Rückfall: markierten HTML-Block kopieren */
async function copyRich(html, text){
  try { if (navigator.clipboard && window.ClipboardItem){ await navigator.clipboard.write([new ClipboardItem({"text/html": new Blob([html], {type:"text/html"}), "text/plain": new Blob([text], {type:"text/plain"})})]); return true; } } catch(e){}
  try { const d = document.createElement("div"); d.contentEditable = "true"; d.innerHTML = html; d.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0"; document.body.appendChild(d);
    const rg = document.createRange(); rg.selectNodeContents(d); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); const ok = document.execCommand("copy"); sel.removeAllRanges(); d.remove(); if (ok) return true; } catch(e){}
  return copyText(text);
}
/* Mail öffnen: Empfänger und Betreff im Mailprogramm, Text mit Formatierung in der Zwischenablage */
async function openMailRich(to, subj, text){
  const ok = await copyRich(mailHtml(text), text);
  const a = document.createElement("a"); a.href = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subj); a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
  toast(ok ? "Mail geöffnet – Text mit Formatierung liegt in der Zwischenablage: in die Mail einfügen (Strg+V / ⌘V), senden, dann „versendet“ klicken" : "Mail geöffnet – Kopieren nicht möglich, bitte „Text kopieren“ nutzen");
}
/* Nach „… öffnen“: Nachfrage, ob die Mail versendet wurde – damit „versendet“ nicht vergessen wird */
function askSent(r, m){
  let d = document.getElementById("sentask"); if (!d){ d = document.createElement("div"); d.id = "sentask"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true"); document.body.appendChild(d); }
  const n = (m.events || []).length;
  d.innerHTML = `<div class="sa-bg"></div><div class="sa-box"><h3>Wurde die Mail versendet?</h3>
    <p><b>${esc(m.label)}</b> an <b>${esc(r.name)}</b>${r.email ? " (" + esc(r.email) + ")" : ""}<br><span class="notes">Betreff: ${esc(m.subj)}${n ? " · " + n + " Termin" + (n === 1 ? "" : "e") : ""}</span></p>
    <p class="notes">Der Text liegt in der Zwischenablage: im Mailprogramm einfügen (Strg+V / ⌘V) und senden. Danach hier bestätigen – dann steht die Mail im Verlauf${m.kind === "term" ? " und die Termine gehen auf „angefragt“" : ""}.</p>
    <div class="sa-act"><button class="btn primary" data-sentyes="${esc(r.id)}">Ja, versendet</button><button class="btn" data-sentno="1">Noch nicht</button></div></div>`;
  d.hidden = false; const b = d.querySelector("[data-sentyes]"); if (b) b.focus();
}
const closeSentAsk = () => { const d = document.getElementById("sentask"); if (d) d.hidden = true; };
async function copyText(txt){
  try { await navigator.clipboard.writeText(txt); return true; } catch(e){}
  try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch(e){ return false; }
}
function openMail(to, subj, body){
  let url = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body.replace(/\n/g, "\r\n"));
  let copied = false;
  if (url.length > 1900){ url = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subj); copied = true; copyText(body); }
  const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
  toast(copied ? "Mail geöffnet – Text ist in der Zwischenablage, bitte einfügen" : "Mail in Outlook geöffnet – nach dem Senden „versendet“ klicken");
}
/* Kontakt als Links: E-Mail öffnet das Mailprogramm, Telefon wählt (mehrere Nummern mit „·“ getrennt) */
const mailLink = m => m ? `<a class="clink" href="mailto:${esc(m)}">${esc(m)}</a>` : "";
const telLinks = t => String(t||"").split("·").map(x => x.trim()).filter(Boolean).map(x => `<a class="clink" href="tel:${esc(x.replace(/[^\d+]/g, ""))}">${esc(x)}</a>`).join(" · ");
const contactCell = r => (r.email ? mailLink(r.email) : `<span class="lv warn">keine E-Mail</span>`) + (r.phone ? `<div class="notes">${telLinks(r.phone)}</div>` : "");
/* ---------- Terminabstimmung pro Person ----------
   Jede Person hat ihren eigenen Stand, abgeleitet aus ihren Terminen und dem Nachrichtenverlauf:
   - Antwort je Termin und Person im Termin: e.refAns[refId] = {a:"ja"|"nein"|"offen", date, start, at, note}
   - versendete Mails: msgs {dir:"out", kind:"term"|"remind"|"conf", events:[{id,date,start}]}
   Eine Antwort oder Abfrage gilt nur, solange Datum und Uhrzeit des Termins unverändert sind. */
const SETTLED = ["zugesagt","fix","in WP angelegt","veröffentlicht"];
const P_LAB = {ok:"zugesagt", asked:"angefragt", nein:"passt nicht", neu:"noch nicht angefragt"};
const sameSlot = (x, e) => !!x && x.date === e.date && (x.start || "") === (e.start || "");
const pMsgs = r => msgsOf(r.id).filter(m => !m.round);
const pOuts = r => pMsgs(r).filter(m => m.dir === "out" && m.kind);
const personEvs = r => evList().filter(e => e.kind === "va" && e.status !== "abgesagt" && e.date.startsWith(String(YEAR)) && (e.refs||[]).includes(r.id)).sort(sortEv);
function evSt(e, r){
  if (e.fixed) return "ok";
  const a = (e.refAns || {})[r.id];
  /* zugesagt, danach aber verschoben → neu abfragen (außer schon fix/online) */
  if (a && !sameSlot(a, e) && ["Idee","Option","angefragt","zugesagt"].includes(e.status)) return pOuts(r).some(m => (m.kind === "term" || m.kind === "remind") && (m.events||[]).some(x => x.id === e.id && sameSlot(x, e))) ? "asked" : "neu";
  if (SETTLED.includes(e.status)) return "ok";
  if (sameSlot(a, e)) return a.a === "ja" ? "ok" : a.a === "nein" ? "nein" : "asked";
  return pOuts(r).some(m => (m.kind === "term" || m.kind === "remind") && (m.events||[]).some(x => x.id === e.id && sameSlot(x, e))) ? "asked" : "neu";
}
const P_STATES = {
  ans:{t:"Antwort auswerten", c:"in"}, neu:{t:"neu anzuschreiben", c:"open"}, wait:{t:"wartet auf Antwort", c:"sent"},
  late:{t:"nachfassen", c:"late"}, replan:{t:"Neuplanung nötig", c:"late"}, conf:{t:"alles zugesagt – Bestätigung senden", c:"in"}, done:{t:"bestätigt", c:"done"}
};
function personInfo(r){
  const evs = personEvs(r), by = {ok:[], asked:[], nein:[], neu:[]};
  evs.forEach(e => by[evSt(e, r)].push(e));
  const outs = pOuts(r), lastOut = outs[outs.length-1] || null;
  const ins = pMsgs(r).filter(m => m.dir === "in" && m.kind === "term"), lastIn = ins[ins.length-1] || null;
  const day = s => String(s || "").slice(0, 10);
  const pendIn = lastIn && !lastIn.applied && (!lastOut || day(lastIn.at) >= day(lastOut.at));
  const lastAsk = [...outs].reverse().find(m => m.kind === "term" || m.kind === "remind");
  const since = [lastAsk && lastAsk.at, lastIn && lastIn.at].filter(Boolean).sort().pop();
  const days = since ? Math.floor((Date.now() - new Date(since).getTime()) / 864e5) : 0;
  const partial = !!(lastIn && lastIn.applied && lastAsk && day(lastIn.at) >= day(lastAsk.at));
  const confSnap = lastOut && lastOut.kind === "conf" ? (lastOut.events||[]) : null;
  const confOk = confSnap && evs.filter(e => e.date >= todayStr()).every(e => confSnap.some(x => x.id === e.id && sameSlot(x, e)));
  let state;
  if (pendIn) state = "ans";
  else if (by.neu.length) state = "neu";
  else if (by.asked.length) state = days >= NACHFASS_TAGE ? "late" : "wait";
  else if (by.nein.length) state = "replan";
  else state = confOk ? "done" : "conf";
  return {evs, by, outs, lastOut, lastIn, state, days, partial, asked: outs.some(m => m.kind === "term")};
}
/* Wen betrifft die Terminabstimmung: alle mit Terminen im Planungsjahr (ohne SURVIVORS HOME Team) */
const personRefs = () => Object.values(S.referents).filter(r => !isTeamInternal(r) && personEvs(r).length).sort(byRefName);

/* Mailtexte (immer Du- bzw. Ihr-Form) */
const pGroups = (evs, okIds) => { const g = new Map();
  evs.slice().sort(sortEv).forEach(e => { const k = e.seriesId || ("t:" + evName(e)); if (!g.has(k)) g.set(k, []); g.get(k).push(e); });
  return [...g.values()].map(es => { const ts = [...new Set(es.map(evName))], lab = ts.length === 1 ? ts[0] : ((S.series[es[0].seriesId]||{}).name || ts[0]);
    return {lab, lines: es.map(e => termLine(e) + (evName(e) !== lab ? " (" + termPart(evName(e)) + ")" : "") + (okIds && okIds.has(e.id) ? " – bereits zugesagt" : ""))}; }); };
const pList = (evs, ok) => termList(pGroups(ok && ok.length ? evs.concat(ok) : evs, ok && ok.length ? new Set(ok.map(e => e.id)) : null));
const pNames = evs => pGroups(evs).map(g => "„" + g.lab + "“").join(" und ");
function pMail(r, sender){
  const I = personInfo(r), team = isGroup(r), du = (a, b) => team ? b : a, hi = termGreet(r) + "\n\n", sig = "\n\n" + termSig(sender);
  const ask = I.by.neu.concat(I.by.asked).sort(sortEv), okF = I.by.ok.filter(e => e.date >= todayStr()); /* zugesagt und noch nicht vorbei */
  const snap = es => es.map(e => ({id:e.id, date:e.date, start:e.start||""}));
  if (I.state === "neu"){
    if (!I.asked){ const m = termTextFor(r, sender, ask, okF); return {kind:"term", label:"Terminabfrage", subj:m.subj, body:m.body, events:snap(ask)}; }
    const one = ask.length === 1, P = [];
    const answered = pMsgs(r).some(m => m.dir === "in" && m.kind === "term");
    P.push(answered ? du("vielen Dank für deine Rückmeldung zu unseren Terminvorschlägen!", "vielen Dank für eure Rückmeldung zu unseren Terminvorschlägen!") : du("wir haben unsere Planung für " + YEAR + " noch einmal überarbeitet.", "wir haben unsere Planung für " + YEAR + " noch einmal überarbeitet."));
    P.push((okF.length ? (one ? "Für den noch offenen Termin haben wir noch einmal geplant. Hier die Übersicht, die schon zugesagten Termine sind vermerkt:" : "Für die noch offenen Termine haben wir noch einmal geplant. Hier die Übersicht, die schon zugesagten Termine sind vermerkt:") : (one ? "Hier unser Vorschlag:" : "Hier unsere Vorschläge:")) + "\n\n" + pList(ask, okF));
    P.push(du((one ? "Passt dir der " + (okF.length ? "noch offene " : "") + "Termin? Wenn er nicht geht" : "Passen dir die " + (okF.length ? "noch offenen " : "") + "Termine? Wenn ein Termin nicht geht") + " oder noch unsicher ist, schreib es einfach dazu. Für eigene Vorschläge hilft ein Blick in unseren Belegungsplan: " + BELEG_URL,
      (one ? "Passt euch der " + (okF.length ? "noch offene " : "") + "Termin? Wenn er nicht geht" : "Passen euch die " + (okF.length ? "noch offenen " : "") + "Termine? Wenn ein Termin nicht geht") + " oder noch unsicher ist, schreibt es einfach dazu. Für eigene Vorschläge hilft ein Blick in unseren Belegungsplan: " + BELEG_URL));
    P.push(du("Danke für deine Geduld bei der Abstimmung – wir freuen uns auf ein schönes Jahr mit dir im Home!", "Danke für eure Geduld bei der Abstimmung – wir freuen uns auf ein schönes Jahr mit euch im Home!"));
    return {kind:"term", label:"neue Vorschläge", subj:"SURVIVORS HOME – " + du("deine", "eure") + " Termine " + YEAR + ": " + (one ? "neuer Vorschlag" : "neue Vorschläge"), body: hi + P.join("\n\n") + sig, events:snap(ask)};
  }
  if (I.state === "wait" || I.state === "late"){
    const es = I.by.asked, one = es.length === 1;
    const o = okF.length ? (one ? "noch offene " : "noch offenen ") : "";
    const body = hi + du("kurze Erinnerung an meine Nachricht zu deinen Terminen " + YEAR + ": " + (one ? "Passt dir der " + o + "Termin?" : "Passen dir die " + o + "Termine?"), "kurze Erinnerung an unsere Nachricht zu euren Terminen " + YEAR + ": " + (one ? "Passt euch der " + o + "Termin?" : "Passen euch die " + o + "Termine?"))
      + " Ein kurzes „passt“, „passt nicht“ oder „noch offen“ reicht völlig. Hier noch einmal die Übersicht" + (okF.length ? ", die schon zugesagten Termine sind vermerkt" : "") + ":\n\n" + pList(es, okF) + sig;
    return {kind:"remind", label:"Erinnerung", subj:"Erinnerung: SURVIVORS HOME – " + du("deine", "eure") + " Termine " + YEAR, body, events:snap(es)};
  }
  if (I.state === "conf" || I.state === "done"){
    const es = I.evs.filter(e => e.date >= todayStr()), one = es.length === 1;
    const P = [du("schön, dass alles passt! ", "schön, dass alles passt! ") + (one ? "Hier dein Termin " + YEAR + ", so steht er jetzt fest in unserem Programm:" : du("Hier noch einmal alle deine Termine " + YEAR + " im Überblick, so stehen sie jetzt fest in unserem Programm:", "Hier noch einmal alle eure Termine " + YEAR + " im Überblick, so stehen sie jetzt fest in unserem Programm:")),
      pList(es),
      du("Sollte sich bei dir etwas ändern, gib uns bitte so früh wie möglich Bescheid. Etwa acht Wochen vor jedem Termin veröffentlichen wir ihn auf unserer Website.", "Sollte sich bei euch etwas ändern, gebt uns bitte so früh wie möglich Bescheid. Etwa acht Wochen vor jedem Termin veröffentlichen wir ihn auf unserer Website."),
      du("Von Herzen danke, dass du " + (pGroups(es).length === 1 ? "dein Angebot " + pNames(es) : "deine Angebote") + " ins Home bringst. Wir freuen uns auf ein schönes Jahr mit dir!", "Von Herzen danke, dass ihr " + (pGroups(es).length === 1 ? "euer Angebot " + pNames(es) : "eure Angebote") + " ins Home bringt. Wir freuen uns auf ein schönes Jahr mit euch!")];
    return {kind:"conf", label:"Bestätigung", subj:"SURVIVORS HOME – " + du("deine", "eure") + " Termine " + YEAR + " stehen fest", body: hi + P.join("\n\n") + sig, events:snap(es)};
  }
  return null;
}
/* Erste Terminabfrage: Text wie abgestimmt (termText), mit der übergebenen Terminliste */
const termTextFor = (r, sender, evs, ok) => termText(r, sender, evs, ok);

/* Ansicht */
function viewPersonen(head){
  const all = personRefs().map(r => ({r, I:personInfo(r)}));
  const none = Object.values(S.referents).filter(r => !isTeamInternal(r) && !personEvs(r).length).sort(byRefName);
  const n = k => k === "ohne" ? none.length : all.filter(x => x.I.state === k).length;
  if (UI.pFilt && UI.pFilt !== "alle" && !n(UI.pFilt)) UI.pFilt = "alle"; /* leerer Filter → zurück auf „Alle“ */
  const f = UI.pFilt || "alle";
  /* Filter ohne Treffer werden ausgeblendet */
  const fb = (k, l) => k !== "alle" && !n(k) ? "" : `<button class="btn ${f === k ? "primary" : ""}" data-pfilt="${k}">${l} (${k === "alle" ? all.length : n(k)})</button>`;
  const list = all.filter(x => f === "alle" || x.I.state === f);
  if (f === "ohne") return head + `<div class="filters">${fb("alle","Alle mit Terminen")}${fb("neu","neu anzuschreiben")}${fb("wait","wartet")}${fb("late","nachfassen")}${fb("ans","Antwort auswerten")}${fb("replan","Neuplanung nötig")}${fb("conf","Bestätigung senden")}${fb("done","bestätigt")}${fb("ohne","ohne Termine " + YEAR)}</div><div class="scroll"><table class="list"><thead><tr><th>Name</th><th>Reihen</th><th>Kontakt</th></tr></thead><tbody>${none.map(r => `<tr class="click" data-ref="${r.id}"><td><b>${esc(r.name)}</b><div class="notes">${esc(r.role||"")}</div></td><td>${esc(Object.values(S.series).filter(s => (s.refs||[]).includes(r.id)).map(s => s.name + (s.active === false ? " (pausiert)" : "")).join(", ") || "–")}</td><td class="ccell">${r.email ? mailLink(r.email) : "–"}${r.phone ? "<br>" + telLinks(r.phone) : ""}</td></tr>`).join("")}</tbody></table></div>`;
  const cnt = I => ["ok","asked","nein","neu"].filter(k => I.by[k].length).map(k => `${I.by[k].length} ${P_LAB[k]}`).join(" · ");
  const chip = (e, st, rid) => `<span class="lv ${st === "ok" ? "info" : st === "nein" ? "err" : st === "neu" ? "warn" : ""}" style="${st === "ok" ? "color:var(--ok)" : st === "asked" ? "background:var(--surface-2)" : ""}" title="${esc(evName(e) + " · " + P_LAB[st] + (((e.refAns||{})[rid]||{}).note ? " · " + e.refAns[rid].note : ""))}">${st === "ok" ? "✓ " : st === "nein" ? "✗ " : st === "neu" ? "● " : "… "}${esc(WD[wdOf(e.date)] + " " + fmt(e.date) + (e.start ? " " + e.start : ""))}</span>`;
  const rows = list.map(({r, I}) => {
    const mail = !!r.email, st = P_STATES[I.state], pm = ["neu","wait","late","conf","done"].includes(I.state);
    const lab = I.state === "neu" ? (I.asked ? "neue Vorschläge" : "Terminabfrage") : I.state === "conf" || I.state === "done" ? "Bestätigung" : "Erinnerung";
    const nxt = ["neu","late","conf"].includes(I.state); /* Mail ist der nächste Schritt */
    const mailGrp = pm ? `<span class="pgrp${nxt ? " nxt" : ""}" title="${esc(lab + ": öffnen bzw. kopieren, nach dem Senden „" + (mail ? "versendet" : "angerufen") + "“ klicken")}">${[
      mail ? `<button class="btn sm" data-pmail="${r.id}">${lab} öffnen</button>` : "",
      `<button class="btn sm" data-pcopy="${r.id}">Text kopieren</button>`,
      `<button class="btn sm" data-psent="${r.id}" data-ch="${mail ? "Mail" : "Telefon"}" title="${esc(lab + " als versendet eintragen")}">✓ ${mail ? "versendet" : "angerufen"}</button>`,
      !mail ? `<button class="btn sm" data-psent="${r.id}" data-ch="Ausdruck">✓ übergeben</button>` : ""
    ].join("")}</span>` : `<span class="pgrp empty"></span>`;
    const act = `<div class="ract">${mailGrp}<button class="btn sm${I.state === "ans" ? " nxt" : ""}" data-pans="${r.id}">${I.state === "ans" ? "Antwort auswerten" : "Antwort einfügen"}</button><button class="btn sm" data-rhist="${r.id}" aria-expanded="${UI.histOpen === r.id}">Verlauf (${msgsOf(r.id).length})</button></div>`;
    const when = I.state === "ans" ? I.lastIn.at : I.lastOut ? I.lastOut.at : "";
    return `<tbody class="prs${UI.pOpen === r.id || UI.histOpen === r.id ? " open" : ""}"><tr><td class="pcell" data-ref="${r.id}" role="button" tabindex="0" title="Person öffnen: Kontakt, Einstellungen, Termine, Verlauf"><b class="rlink">${esc(r.name)}</b><div class="notes">${esc([...new Set(I.evs.map(e => (S.series[e.seriesId]||{}).name || evName(e)))].join(", "))}</div></td><td class="ccell">${contactCell(r)}</td>
      <td><span class="rst ${st.c}">${esc((I.state === "wait" || I.state === "late") && I.partial ? "Rückmeldung da – " + I.by.asked.length + " noch offen" + (I.state === "late" ? ", nachfassen" : "") : I.state === "late" ? "nachfassen (seit " + I.days + " Tagen)" : st.t)}</span>${when ? `<div class="notes">${esc((I.state === "ans" ? "Antwort " : I.lastOut.kind === "conf" ? "Bestätigung " : I.lastOut.kind === "remind" ? "Erinnerung " : "angefragt ") + fmtAt(when))}</div>` : ""}<button class="btn sm pevs" data-pevs="${r.id}" aria-expanded="${UI.pOpen === r.id}" title="Termine ${YEAR} mit Abstimmungsstand ein-/ausblenden">${UI.pOpen === r.id ? "▾" : "▸"} Termine: ${esc(cnt(I) || "keine")}</button></td><td>${act}</td></tr>
      ${UI.pOpen === r.id ? `<tr class="rhist"><td colspan="4"><div class="iss">${I.evs.map(e => chip(e, evSt(e, r), r.id)).join(" ")}</div>${I.evs.some(e => ((e.refAns||{})[r.id]||{}).note) ? `<div class="notes" style="margin-top:6px">${I.evs.filter(e => ((e.refAns||{})[r.id]||{}).note).map(e => esc(fmt(e.date) + ": " + e.refAns[r.id].note)).join(" · ")}</div>` : ""}</td></tr>` : ""}
      ${UI.histOpen === r.id ? `<tr class="rhist"><td colspan="4">${histHtml(r)}</td></tr>` : ""}</tbody>`;
  }).join("");
  return head + `<div class="filters">${fb("alle","Alle mit Terminen")}${fb("neu","neu anzuschreiben")}${fb("wait","wartet")}${fb("late","nachfassen")}${fb("ans","Antwort auswerten")}${fb("replan","Neuplanung nötig")}${fb("conf","Bestätigung senden")}${fb("done","bestätigt")}${fb("ohne","ohne Termine " + YEAR)}</div>`
    + (list.length ? `<div class="scroll"><table class="list rtab ptab"><colgroup><col class="c-p"><col class="c-k"><col class="c-s"><col class="c-a"></colgroup><thead><tr><th>Person / Angebote</th><th>Kontakt</th><th>Stand ${YEAR}</th><th>Aktionen</th></tr></thead>${rows}</table></div>` : `<div class="empty">Niemand in dieser Auswahl.</div>`);
}

/* Versand eintragen: Mail mit Terminliste im Verlauf, abgefragte Termine auf „angefragt“ */
async function pSent(r, ch){
  const m = pMail(r, senderName()); if (!m) return;
  await logMsg({round:"", ref:r.id, dir:"out", kind:m.kind, channel:ch, subject:m.subj, text:m.body, events:m.events});
  if (m.kind === "term") for (const x of m.events){ const e = S.events[x.id]; if (e && ["Idee","Option"].includes(e.status)){ const o = Object.assign({}, e, {status:"angefragt"}); if (await put("events", e.id, o)) S.events[e.id] = o; } }
  render(); toast(m.label + (ch === "Mail" ? " als versendet" : ch === "Telefon" ? " als Anruf" : " als Übergabe") + " eingetragen" + (m.kind === "term" ? " – Termine stehen jetzt auf „angefragt“" : ""));
}

/* Antwort-Dialog: Antwort je Termin (Claude kann vorbelegen) */
function pansForm(rid){
  const r = S.referents[rid], I = personInfo(r), es = I.evs.filter(e => evSt(e, r) !== "ok" || ((e.refAns||{})[rid]));
  const pre = UI.pPre || {};
  const row = e => { const cur = pre[e.id] || (sameSlot((e.refAns||{})[rid], e) ? e.refAns[rid] : null), a = cur ? cur.a : "", nt = cur ? (cur.note || cur.notiz || "") : "";
    return `<div class="avr" style="flex-wrap:wrap"><span style="min-width:12em"><b>${esc(WD[wdOf(e.date)] + " " + fmtY(e.date))}</b> ${esc(e.start || "")}<br><span class="notes">${esc(evName(e))} · ${esc(P_LAB[evSt(e, r)])}</span></span>
      <span class="seg" role="group">${[["ja","passt"],["nein","passt nicht"],["offen","offen"]].map(([k, l]) => `<label class="btn sm" style="margin:0"><input type="radio" name="pa_${e.id}" value="${k}" ${a === k ? "checked" : ""}> ${l}</label>`).join("")}</span>
      <input class="in" data-pnote="${e.id}" placeholder="Notiz / Alternativvorschlag" value="${esc(nt)}" style="flex:1;min-width:12em"></div>`; };
  const body = `<div class="notes"><b>So geht’s:</b> <b>1.</b> Antwort-Mail (oder Notiz zum Telefonat) hineinkopieren. <b>2.</b> „Claude auswerten lassen“ setzt je Termin passt / passt nicht / offen vor – das ist nur ein Vorschlag, gespeichert wird noch nichts; prüfen oder selbst anklicken. <b>3.</b> „Auswertung übernehmen“ speichert Antwort <i>und</i> Auswahl: „passt“ macht den Termin „zugesagt“ (bei mehreren Referenten, sobald alle zugesagt haben), „passt nicht“ erscheint in der Prüfung zum Neuplanen. Erst dann ändert sich der Status.<br>Keine Zeit zum Auswerten? „Nur Text ablegen“ speichert die Mail im Verlauf, die Termine bleiben unverändert und die Person steht auf „Antwort auswerten“, bis sie übernommen ist.</div>
   <form class="form" id="fa"><label class="full">Antworttext<textarea id="aText" rows="7">${esc(UI.pText || (I.lastIn && !I.lastIn.applied ? I.lastIn.text : ""))}</textarea></label>
   <label>Eingang am<input type="date" id="aDate" value="${esc(todayStr())}"></label><label>Art<select id="aCh">${opt(["Mail","Telefon","persönlich"], "Mail")}</select></label></form>
   <div class="ansbar"><button type="button" class="btn" data-pparse="1">Claude auswerten lassen</button><span class="notes" style="align-self:center">setzt die Auswahl unten vor – speichert noch nichts</span></div>
   ${UI.pSum ? `<div class="notes"><b>Claude:</b> ${esc(UI.pSum)}</div>` : ""}
   <div class="pres" style="padding:0">${es.length ? es.map(row).join("") : `<div class="notes">Keine offenen Termine.</div>`}</div>
   <div class="ansbar"><button type="button" class="btn primary" data-papply="1">Auswertung übernehmen</button><button type="button" class="btn" data-psave="1">Nur Text ablegen, später auswerten</button></div>`;
  return shell("Antwort von " + (r ? r.name : ""), body, `<button class="btn ghost" data-close="1">Schließen</button>`);
}
const P_PROMPT = (r, list, text) => `Du wertest die Antwort von ${r.name} auf Terminvorschläge für ${YEAR} aus. Heute: ${todayStr()}.
Vorgeschlagene Termine (id | Datum | Zeit | Veranstaltung):
${list.map(e => e.id + " | " + WD[wdOf(e.date)] + " " + fmtY(e.date) + " | " + (e.start || "") + " | " + evName(e)).join("\n")}
Ordne jedem Termin zu: "ja" (passt), "nein" (passt nicht) oder "offen" (unsicher oder nicht erwähnt). Schreibt die Person, dass alles passt, sind alle "ja". Nichts erfinden.
Antworte ausschließlich mit JSON: {"antworten":[{"id":"…","a":"ja"|"nein"|"offen","notiz":"kurz, z. B. Grund oder Alternativvorschlag, sonst leer"}],"zusammenfassung":"ein Satz"}

Antworttext:
"""${text}"""`;
async function pParse(){
  const rid = UI.drawer.id, r = S.referents[rid], text = $("#aText").value.trim(); if (!text) return toast("Bitte zuerst den Antworttext einfügen");
  const es = personInfo(r).evs.filter(e => evSt(e, r) !== "ok" || ((e.refAns||{})[rid]));
  const sample = window.claude && window.claude.use ? await window.claude.use("sample").catch(() => null) : null;
  if (!sample) return toast("Vorbelegen hier nicht verfügbar – bitte je Termin selbst auswählen");
  toast("Claude liest die Antwort …");
  try { const res = await sample.json(P_PROMPT(r, es, text), {modelTier:"default"}) || {}; UI.pPre = {}; (res.antworten||[]).forEach(x => { if (x && x.id) UI.pPre[x.id] = {a:["ja","nein","offen"].includes(x.a) ? x.a : "offen", note:x.notiz || ""}; });
    UI.pSum = res.zusammenfassung || ""; UI.pText = text; $("#drawer").innerHTML = pansForm(rid); }
  catch(e){ toast("Auswertung fehlgeschlagen – bitte je Termin selbst auswählen"); }
}
async function pApply(save){
  const rid = UI.drawer.id, r = S.referents[rid], text = $("#aText").value.trim(), at = ($("#aDate").value || todayStr()) + "T" + new Date().toTimeString().slice(0,8);
  const picks = {}; document.querySelectorAll("#drawer input[type=radio]:checked").forEach(x => { picks[x.name.slice(3)] = {a:x.value}; });
  document.querySelectorAll("#drawer [data-pnote]").forEach(x => { const id = x.dataset.pnote; if (x.value.trim()){ picks[id] = picks[id] || {a:"offen"}; picks[id].note = x.value.trim(); } });
  if (!save && !Object.keys(picks).length) return toast("Bitte je Termin passt / passt nicht / offen wählen");
  if (!text && save) return toast("Kein Text");
  if (!save){ for (const [id, p] of Object.entries(picks)){ const e = S.events[id]; if (!e) continue;
      const o = Object.assign({}, e, {refAns: Object.assign({}, e.refAns || {}, {[rid]: {a:p.a, date:e.date, start:e.start || "", at, note:p.note || ""}})});
      const refs = (o.refs||[]).filter(x => S.referents[x] && !isTeamInternal(S.referents[x]));
      if (DISCUSS.includes(o.status) && refs.length && refs.every(x => sameSlot(o.refAns[x], o) && o.refAns[x].a === "ja")) o.status = "zugesagt";
      if (await put("events", id, o)) S.events[id] = o; } }
  const nJa = Object.values(picks).filter(p => p.a === "ja").length, nNo = Object.values(picks).filter(p => p.a === "nein").length;
  const mo = {round:"", ref:rid, dir:"in", kind:"term", channel:$("#aCh").value, text: text || "(ohne Text eingetragen)", at, applied:!save, answers: save ? null : picks,
    summary: save ? "" : (UI.pSum ? UI.pSum + " · " : "") + nJa + " passt, " + nNo + " passt nicht, " + (Object.keys(picks).length - nJa - nNo) + " offen"};
  const li = personInfo(r).lastIn;
  if (li && !li.applied && li.text === mo.text){ const o = Object.assign({}, li, mo, {id:li.id, at:li.at, by:li.by || senderName()}); if (await put("msgs", li.id, o)) S.msgs = Object.assign({}, S.msgs, {[li.id]: o}); }
  else await logMsg(mo);
  UI.pPre = null; UI.pSum = ""; UI.pText = ""; closeDrawer(); render(); toast(save ? "Antworttext abgelegt – Status „Antwort auswerten“, bis die Auswertung übernommen ist" : "Auswertung übernommen: " + nJa + " passt, " + nNo + " passt nicht");
}

/* Reiter „Referenten“: Abstimmung (Standard) · Stammdaten · Verfügbarkeitsabfrage */
function viewReferenten(){
  const mode = UI.anfMode === "verf" ? "verf" : "pers";
  const seg = `<span class="seg" role="group" aria-label="Ansicht"><button class="btn ${mode === "pers" ? "primary" : ""}" data-amode="pers">Terminabstimmung</button><button class="btn ${mode === "verf" ? "primary" : ""}" data-amode="verf">Vorabfrage Verfügbarkeit</button></span>`;
  const sender = `<label class="notes">Absender <select class="in" id="fSender"><option value="">– wählen –</option>${opt(["Kati","Sebastian"], UI.sender)}</select></label>`;
  if (mode === "verf") return viewRunden(seg);
  const help = `<b>Referenten – Terminabstimmung</b><ul><li>Klick auf den Namen öffnet die Person in einem großen Dialog: Kontakt, Anrede, Einschränkungen, Verfügbarkeiten, Termine ${YEAR} mit Abstimmungsstand und Nachrichtenverlauf. „+ Referent“ legt eine neue Person an.</li><li>„Vorabfrage Verfügbarkeit“ zeigt die Runde vom Jahresbeginn (wann jemand nicht kann).</li><li>Der Zähler am Reiter zeigt, wie viele Personen gerade einen Schritt brauchen (neu anzuschreiben, nachfassen, Antwort auswerten).</li><li>Jede Person hat ihren eigenen Stand – er ergibt sich aus ihren Terminen ${YEAR} und dem Verlauf. Der nächste Schritt ist <b>violett gefüllt</b>; steht jemand nur auf „wartet“, bleiben alle Knöpfe weiß.</li><li><b>„▸ Termine: …“</b> unter dem Stand klappt die Termine ${YEAR} mit Abstimmungsstand auf, „Verlauf“ die Nachrichten. Aufgeklapptes hängt grau hinterlegt mit violettem Balken links an der Person.</li><li>Die drei verbundenen Knöpfe gehören zur Mail: <b>öffnen</b> (oder <b>Text kopieren</b>), senden, dann <b>„✓ versendet“</b>.</li><li><b>neu anzuschreiben</b>: Termine, die noch nie abgefragt wurden oder seit der letzten Mail verschoben wurden. „Terminabfrage öffnen“ erzeugt die Mail mit genau diesen Terminen; nach einer ersten Antwort heißen sie „neue Vorschläge“ und die bereits zugesagten Termine stehen zur Bestätigung mit drin.</li><li>Nach dem Senden <b>„versendet“</b> klicken: die Mail kommt in den Verlauf, die Termine gehen von Idee/Option auf „angefragt“.</li><li><b>wartet</b> / <b>nachfassen</b> (nach ${NACHFASS_TAGE} Tagen): fertige Erinnerung mit den offenen Terminen.</li><li><b>Antwort einfügen</b>: Text hineinkopieren, „Claude auswerten lassen“ setzt je Termin passt / passt nicht / offen vor (speichert noch nichts) – prüfen, dann „Auswertung übernehmen“. Erst damit ändert sich der Stand der Person. „Nur Text ablegen“ speichert die Mail ohne Auswertung; die Person steht dann auf „Antwort auswerten“. passt → Termin „zugesagt“ (bei mehreren Referenten, wenn alle zugesagt haben). passt nicht → Fehler in der Prüfung „neu planen“, die Person steht auf „Neuplanung nötig“.</li><li>Nach einem Planungslauf: verschobene Termine gelten wieder als „neu“, die Person erscheint unter „neu anzuschreiben“.</li><li><b>Bestätigung senden</b>: wenn alle Termine einer Person zugesagt sind – Mail mit allen Terminen ${YEAR}. Ändert sich danach etwas, erscheint sie wieder.</li><li>Nur Termine mit Status Idee, Option oder angefragt werden abgefragt; zugesagte, fixe, veröffentlichte und als „fester Termin“ markierte gelten als zugesagt.</li></ul>`;
  const head = `<div class="head"><h2>Referenten ${qh(help)}</h2><div class="tools">${seg}${sender}<button class="btn primary" data-newref="1">+ Referent</button></div></div>`;
  return viewPersonen(head);
}
function viewRunden(seg){
  const rounds = Object.values(S.rounds||{}).sort((a,b) => (b.created||"").localeCompare(a.created||""));
  if (!UI.round || !S.rounds[UI.round]) UI.round = rounds[0] ? rounds[0].id : null;
  const rd = UI.round && S.rounds[UI.round];
  const help = `<b>Vorabfrage Verfügbarkeit</b><ul><li>Runde für alle zu Jahresbeginn – fragt vorab, wann jemand nicht kann. Die Abstimmung konkreter Termine läuft unter „Terminabstimmung“ pro Person.</li><li><b>Absender</b> oben wählen – er steht unter jeder Mail und im Verlauf.</li><li><b>Mail öffnen</b> öffnet in Outlook eine fertige Mail (Empfänger, Betreff, Text). Ist der Text zu lang für den Mail-Link, liegt er in der Zwischenablage zum Einfügen.</li><li>Nach dem Senden <b>„versendet“</b> klicken – erst dann steht die Nachricht im Verlauf.</li><li>Ohne E-Mail-Adresse: <b>Text kopieren</b> für Anruf oder Ausdruck, danach „angerufen“ bzw. „übergeben“.</li><li><b>Antwort einfügen</b>: Text der Antwort (oder Gesprächsnotiz) hineinkopieren, Claude schlägt Abwesenheiten, Einschränkungen und Wunschanzahl vor; prüfen und übernehmen. Übernommene Einschränkungen prüft das Tool ab dann bei jedem Termin.</li><li><b>nachfassen</b>: ${NACHFASS_TAGE} Tage nach dem Versand ohne Antwort – mit fertiger Erinnerungsmail.</li><li><b>Verlauf</b>: alle gesendeten und empfangenen Nachrichten je Person mit Datum und Absender (auch im Referenten-Dialog).</li></ul>`;
  const head = `<div class="head"><h2>Referenten ${qh(help)}</h2><div class="tools">${seg}<label class="notes">Absender <select class="in" id="fSender"><option value="">– wählen –</option>${opt(["Kati","Sebastian"], UI.sender)}</select></label>${rounds.length ? `<select class="in" id="fRound">${rounds.map(x => `<option value="${x.id}" ${x.id===UI.round?"selected":""}>${esc(x.name)}</option>`).join("")}</select>` : ""}<button class="btn primary" data-newround="verf">+ Runde Verfügbarkeit</button></div></div>`;
  if (!rd) return head + `<div class="empty">Noch keine Runde angelegt. „+ Runde Verfügbarkeit“ legt die Vorabfrage für ${YEAR} an.</div>`;
  const refs = roundRefs(rd), st = refs.map(r => ({r, s:roundState(r, rd)}));
  const cnt = k => st.filter(x => x.s.k === k).length;
  const rows = st.map(({r, s}) => {
    const mail = !!r.email, tel = r.phone || "";
    const act = [
      mail ? `<button class="btn sm" data-rmail="${r.id}">Mail öffnen</button>` : "",
      `<button class="btn ghost sm" data-rcopy="${r.id}">Text kopieren</button>`,
      `<button class="btn ghost sm" data-rsent="${r.id}" data-ch="${mail ? "Mail" : "Telefon"}">${mail ? "versendet" : "angerufen"}</button>`,
      !mail ? `<button class="btn ghost sm" data-rsent="${r.id}" data-ch="Ausdruck">übergeben</button>` : "",
      s.k === "late" ? `<button class="btn ghost sm" data-rremind="${r.id}">Erinnerung</button>` : "",
      `<button class="btn ghost sm" data-rans="${r.id}">Antwort einfügen</button>`,
      `<button class="btn ghost sm" data-rhist="${r.id}">Verlauf (${msgsOf(r.id).length})</button>`
    ].join("");
    return `<tr><td><b>${esc(r.name)}</b><div class="notes">${esc(refSeries(r).join(", ") || "Einzeltermine")}${rdType(rd) === "term" ? " · " + termOf(r).length + " Termin" + (termOf(r).length === 1 ? "" : "e") + " zur Besprechung" : ""}</div></td><td class="ccell">${contactCell(r)}</td><td><span class="rst ${s.k}">${esc(s.t)}</span>${s.d ? `<div class="notes">${esc(fmtAt(s.d))}</div>` : ""}</td><td><div class="ract">${act}</div></td></tr>
      ${UI.histOpen === r.id ? `<tr class="rhist"><td colspan="4">${histHtml(r)}</td></tr>` : ""}`;
  }).join("");
  return head + `<div class="filters"><span class="notes"><b>${esc(rd.name)}</b> (${esc(RTYPES[rdType(rd)] || "")}) · angelegt ${esc(fmtAt(rd.created))}${rd.by ? " von " + esc(rd.by) : ""} · ${refs.length} Personen${[["open","offen"],["sent","wartet"],["late","nachfassen"],["in","Antwort da"],["done","ausgewertet"]].filter(([k]) => cnt(k)).map(([k, l], i) => (i ? " · " : ": ") + (k === "late" ? `<b class="rlate">${cnt(k)} ${l}</b>` : cnt(k) + " " + l)).join("")}</span></div>
  <div class="scroll"><table class="list rtab"><thead><tr><th>Person / Reihen</th><th>Kontakt</th><th>Stand</th><th>Aktionen</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function histHtml(r){
  const ms = msgsOf(r.id);
  if (!ms.length) return `<div class="notes">Noch keine Nachrichten.</div>`;
  return `<div class="hist">${ms.map(m => `<div class="hm ${m.dir}"><div class="hmh"><b>${m.dir === "out" ? "→ " + esc(m.channel || "Mail") : m.dir === "in" ? "← Antwort" : "Notiz"}</b> · ${esc(fmtAt(m.at))}${m.by ? " · " + esc(m.by) : ""}${m.round && S.rounds[m.round] ? " · " + esc(S.rounds[m.round].name) : ""}${m.applied ? ' · <span class="lv info">ausgewertet</span>' : ""}</div>${m.subject ? `<div class="notes">${esc(m.subject)}</div>` : ""}<details><summary>${esc((m.summary || m.text || "").slice(0, 140))}${(m.summary || m.text || "").length > 140 ? "…" : ""}</summary><pre class="hmt">${esc(m.text || "")}</pre></details></div>`).join("")}</div>`;
}
/* Antwort-Dialog */
function ansForm(rid, msgId){
  const r = S.referents[rid], m = msgId && S.msgs[msgId];
  const body = `<div class="notes">Antwort-Mail (oder Notiz zum Telefonat) hier hineinkopieren. Claude schlägt daraus Abwesenheiten, Einschränkungen und Wunschanzahl vor – du prüfst und übernimmst.</div>
   <form class="form" id="fa"><label class="full">Antworttext<textarea id="aText" rows="10">${esc(m ? m.text : "")}</textarea></label>
   <label>Eingang am<input type="date" id="aDate" value="${esc(m ? m.at.slice(0,10) : todayStr())}"></label>
   <label>Art<select id="aCh">${opt(["Mail","Telefon","persönlich"], m ? m.channel : "Mail")}</select></label></form>
   <div class="ansbar"><button type="button" class="btn primary" data-aparse="1">Mit Claude auswerten</button><button type="button" class="btn" data-asave="1">Nur speichern (ohne Auswertung)</button></div>
   <div id="aRes"></div>`;
  return shell("Antwort von " + (r ? r.name : ""), body, `<button class="btn ghost" data-close="1">Schließen</button>`);
}
const AVAIL_PROMPT = (r, text) => `Du wertest eine Antwort auf eine Verfügbarkeitsabfrage für Veranstaltungen im Jahr ${YEAR} aus.
Person: ${r.name}. Heute: ${todayStr()}. Wochentage als Zahlen: 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa, 7=So.
Extrahiere NUR, was ausdrücklich in der Antwort steht. Nichts erfinden. Unklare Angaben in "unklar" aufführen.
Antworte ausschließlich mit JSON in genau diesem Format:
{"abwesend":[{"von":"YYYY-MM-DD","bis":"YYYY-MM-DD","notiz":""}],
 "regeln":[{"art":"nicht" oder "nur","von":"YYYY-MM-DD oder null","bis":"YYYY-MM-DD oder null","wochentage":[Zahlen],"ab":"HH:MM oder null","bis_uhr":"HH:MM oder null","notiz":"kurz, was gemeint ist"}],
 "wunsch_anzahl": Zahl oder null,
 "bevorzugt": "Lieblingstage/-zeiten als kurzer Text oder leer",
 "sonstiges": "kurz oder leer",
 "unklar": ["…"],
 "zusammenfassung": "ein Satz"}
Hinweise: "im ersten Halbjahr" = ${YEAR}-01-01 bis ${YEAR}-06-30. "Sommerferien" ohne Datum -> in "unklar". "frühestens ab 17 Uhr" = regel art "nur", ab "17:00". "Mittwochs nie" = art "nicht", wochentage [3].

Antworttext:
"""${text}"""`;
function availLabel(a){
  const wd = (a.weekdays||[]).length ? a.weekdays.map(x => WD[x]).join("/") : "";
  const per = a.from || a.to ? (a.from ? fmtY(a.from) : "…") + "–" + (a.to ? fmtY(a.to) : "…") : "";
  const tm = a.timeFrom || a.timeTo ? ((a.timeFrom ? "ab " + a.timeFrom : "") + (a.timeTo ? " bis " + a.timeTo : "")).trim() : "";
  const k = {abwesend:"abwesend", nicht:"kann nicht", nur:"kann nur"}[a.kind] || a.kind;
  return [k, wd, tm, per].filter(Boolean).join(" ") + (a.note ? " – " + a.note : "");
}
function renderParse(res){
  UI.parse = res; const items = [];
  (res.abwesend||[]).forEach(a => items.push({kind:"abwesend", from:a.von, to:a.bis || a.von, note:a.notiz || ""}));
  (res.regeln||[]).forEach(a => items.push({kind:a.art === "nur" ? "nur" : "nicht", from:a.von || "", to:a.bis || "", weekdays:(a.wochentage||[]).map(Number).filter(x => x>=1 && x<=7).map(x => x % 7), timeFrom:a.ab || "", timeTo:a.bis_uhr || "", note:a.notiz || ""}));
  UI.parseItems = items;
  $("#aRes").innerHTML = `<div class="sec pres"><b>Vorschlag aus der Antwort</b>${res.zusammenfassung ? `<div class="notes">${esc(res.zusammenfassung)}</div>` : ""}
   ${items.length ? items.map((a,i) => `<label class="cb"><input type="checkbox" data-pi="${i}" checked> ${esc(availLabel(a))}</label>`).join("") : `<div class="notes">Keine Einschränkungen erkannt.</div>`}
   ${res.wunsch_anzahl != null ? `<label class="cb"><input type="checkbox" id="pWish" checked> Wunschanzahl ${YEAR}: ${esc(res.wunsch_anzahl)}</label>` : ""}
   ${res.bevorzugt ? `<label class="cb"><input type="checkbox" id="pPref" checked> Bevorzugt: ${esc(res.bevorzugt)}</label>` : ""}
   ${res.sonstiges ? `<label class="cb"><input type="checkbox" id="pOther" checked> Sonstiges: ${esc(res.sonstiges)}</label>` : ""}
   ${(res.unklar||[]).length ? `<div class="lv warn">Unklar – bitte selbst klären: ${esc(res.unklar.join(" · "))}</div>` : ""}
   <div class="ansbar"><button type="button" class="btn primary" data-aapply="1">Ausgewählte übernehmen</button></div></div>`;
}
async function ansParse(){
  const rid = UI.drawer.id, r = S.referents[rid], text = $("#aText").value.trim(); if (!text) return toast("Bitte zuerst den Antworttext einfügen");
  const sample = window.claude && window.claude.use ? await window.claude.use("sample").catch(() => null) : null;
  if (!sample){ toast("Auswertung hier nicht verfügbar – Antwort wird nur gespeichert"); return ansSave(false); }
  $("#aRes").innerHTML = `<div class="notes">Claude liest die Antwort …</div>`;
  try { const res = await sample.json(AVAIL_PROMPT(r, text), {modelTier:"default"}); renderParse(res || {}); }
  catch(e){ $("#aRes").innerHTML = `<div class="lv warn">Auswertung fehlgeschlagen (${esc(e && (e.code || e.message) || "Fehler")}). Antwort kannst du trotzdem speichern.</div>`; }
}
async function ansSave(applied, extra){
  const rid = UI.drawer.id, text = $("#aText").value.trim(); if (!text) return toast("Kein Text");
  const at = ($("#aDate").value || todayStr()) + "T" + new Date().toTimeString().slice(0,8);
  const res = UI.parse || null;
  await logMsg(Object.assign({round: UI.round || "", ref: rid, dir:"in", channel: $("#aCh").value, text, at, summary: res && res.zusammenfassung || "", applied: !!applied}, extra || {}));
  UI.parse = null; closeDrawer(); toast(applied ? "Antwort gespeichert und übernommen" : "Antwort gespeichert");
}
async function ansApply(){
  const rid = UI.drawer.id, r = Object.assign({}, S.referents[rid]); if (!r.id) return;
  const pick = [...document.querySelectorAll("[data-pi]")].filter(x => x.checked).map(x => UI.parseItems[+x.dataset.pi]);
  const src = "Abfrage " + todayStr().split("-").reverse().join(".");
  r.avail = (r.avail || []).concat(pick.map(a => Object.assign({}, a, {src})));
  const res = UI.parse || {}, add = [];
  if ($("#pWish") && $("#pWish").checked) r.wish = res.wunsch_anzahl;
  if ($("#pPref") && $("#pPref").checked) add.push("Bevorzugt: " + res.bevorzugt);
  if ($("#pOther") && $("#pOther").checked) add.push("Sonstiges: " + res.sonstiges);
  if (add.length) r.notes = ((r.notes || "") + "\n" + src + ": " + add.join(" · ")).trim();
  if (await put("referents", rid, r)){ S.referents[rid] = r; await ansSave(true, {result: {items: pick, wish: r.wish ?? null}}); render(); }
}
/* Verfügbarkeitsregeln prüfen (aus der Abfrage) */
function availIssues(e, r, st, en, add){
  for (const a of (r.avail || [])){
    const inPer = (!a.from || e.date >= a.from) && (!a.to || e.date <= a.to);
    if (!inPer) continue;
    const w = wdOf(e.date), wdOk = !(a.weekdays||[]).length || a.weekdays.includes(w);
    if (a.kind === "abwesend"){ add(e,"err",r.name+" abwesend ("+availLabel(a)+")"); continue; }
    const tf = a.timeFrom ? t2m(a.timeFrom) : null, tt = a.timeTo ? t2m(a.timeTo) : null;
    if (a.kind === "nicht"){
      const timeHit = st == null || ((tf == null || en > tf) && (tt == null || st < tt));
      if (wdOk && timeHit) add(e,"err",r.name+": "+availLabel(a));
    } else if (a.kind === "nur"){
      const okT = st == null || ((tf == null || st >= tf) && (tt == null || en <= tt));
      if (!wdOk || !okT) add(e,"err",r.name+": "+availLabel(a));
    }
  }
}

/* ---------- Rendern ---------- */
const VIEWS = {jahr:viewJahr, woche:viewWoche, liste:viewListe, pruefung:viewPruefung, reihen:viewReihen, referenten:viewReferenten, uebernachtung:viewStays, reinigung:viewReinigung, creinigung:viewCleanSet, abwesend:viewAbwesend, anfragen:viewReferenten, sicherung:viewSicherung, kalender:viewKalender, zeiten:viewZeiten, kontakte:viewKontakte};
let rq = 0;
function render(){
  { const tip = document.getElementById("qtip"); if (tip) tip.hidden = true; const zp = document.getElementById("zpop"); if (zp) zp.hidden = true; } cancelAnimationFrame(rq); rq = requestAnimationFrame(() => {
  recompute(); renderKpis(); errBadge();
  const curTab = isSetView(UI.view) ? "einstellungen" : UI.view;
  document.querySelectorAll("#tabs button").forEach(b => { if (b.dataset.view === curTab) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); });
  document.body.classList.toggle("vjahr", UI.view === "jahr" && !UI.mob);
  if (UI.view === "woche" && !UI.dayOnly && UI.week){ try { localStorage.setItem("shp-week", UI.week); } catch(e){} }
  const y = window.scrollY;
  $("#app").innerHTML = S.loaded ? (UI.mob ? viewMobil() : VIEWS[UI.view]()) : $("#app").innerHTML;
  { const wb = $("#wsslot"), h = S.loaded && !UI.mob ? wsBar() : ""; if (wb){ wb.hidden = !h; wb.innerHTML = h; } }
  { const hs = $("#hslot"), on = S.loaded && UI.view === "jahr" && !UI.mob; hs.hidden = !on; hs.innerHTML = on ? UI.yHead || "" : "";
    if (on){ const a = $("#app .ybody"), b = hs.querySelector(".yhs"); if (a && b){ b.scrollLeft = a.scrollLeft; a.onscroll = () => { b.scrollLeft = a.scrollLeft; }; } } }
  window.scrollTo(0, y);
  if (UI.restoreY != null){ window.scrollTo(0, UI.restoreY); UI.restoreY = null; }
  if (UI.yRestore && S.loaded && UI.view === "jahr" && !UI.mob){ UI.yRestore = false; if (UI.yPos) yScrollTo(UI.yPos, false); }
  markSel();
  if (UI.altFlash){ const h = document.querySelector(`[data-wday="${UI.altFlash}"]`); UI.altFlash = null; if (h){ h.classList.remove("aflash"); void h.offsetWidth; h.classList.add("aflash"); } }
  if (UI.mob){ mobFit(); mobHeadH(); }
  if (UI.drawer) refreshLive(true);
}); }
/* Markierung des geöffneten Termins im Kalender; bei Termin-Navigation in den sichtbaren Bereich holen */
function markSel(){
  document.querySelectorAll(".sel").forEach(x => x.classList.remove("sel"));
  if (UI.drawer && UI.drawer.kind === "ser" && UI.drawer.id){ const tr = document.querySelector(`tr[data-ser="${CSS.escape(UI.drawer.id)}"]`); if (tr){ tr.classList.add("sel"); tr.scrollIntoView({block:"nearest"}); } }
  const e = UI.selEv && S.events[UI.selEv]; if (!e) return;
  const els = [...document.querySelectorAll(`[data-ev="${CSS.escape(e.id)}"]`)], cell = document.querySelector(`.dcell[data-goweek="${e.date}"]`);
  els.forEach(x => x.classList.add("sel")); if (cell) cell.classList.add("sel");
  if (UI.scrollSel){ UI.scrollSel = false; const t = els[0] || cell; if (t){ t.scrollIntoView({block:"center", inline:"center", behavior:"smooth"}); } }
}
/* Reiter „Einstellungen“: Unterreiter sind eigene Ansichten; der Reiter öffnet den zuletzt benutzten */
const SET_VIEWS = [["kalender","Kalender"],["zeiten","Zeiten & Fristen"],["kontakte","Kontakte & Adressen"],["creinigung","Reinigung"],["abwesend","Abwesenheiten"],["sicherung","Sicherung"]];
const isSetView = v => SET_VIEWS.some(x => x[0] === v);
function setNav(){ return `<nav class="setnav" aria-label="Einstellungen"><span class="seg" role="group">${SET_VIEWS.map(([k, l]) => `<button class="btn ${UI.view === k ? "primary" : ""}" data-view="${k}"${UI.view === k ? ' aria-current="page"' : ""}>${l}</button>`).join("")}</span></nav>`; }
function go(view){
  if (view === "einstellungen"){ let l = null; try { l = localStorage.getItem("shp-eset"); } catch(e){} view = isSetView(l) ? l : SET_VIEWS[0][0]; }
  if (isSetView(view)){ try { localStorage.setItem("shp-eset", view); } catch(e){} }
  if (view !== "uebernachtung"){ UI.stayBack = null; UI.stayEdit = null; }
  UI.dayOnly = null; UI.view0 = null; if (view === "jahr") UI.yRestore = true; UI.view = view; try { localStorage.setItem("shp-view", view); } catch(e){} window.scrollTo(0,0); render(); }

/* ---------- Schreiben ---------- */
async function put(col, id, data){
  if (OFFLINE){ if (BK_COLS.includes(col)){ S[col] = S[col] || {}; S[col][id] = Object.assign({}, data, {id}); } offTouch(); return true; }
  if (!db){ toast("Speichern nicht möglich: Datenbank nicht verfügbar"); return false; }
  try { await db.collection(col).doc(id).set(data); return true; }
  catch(e){ toast(e && e.code === "invalid_argument" ? "Keine Schreibrechte für diese Ansicht" : "Speichern fehlgeschlagen – bitte erneut versuchen"); return false; }
}
async function del(col, id){ if (OFFLINE){ if (S[col]) delete S[col][id]; offTouch(); return; } if (!db) return; try { await db.collection(col).doc(id).delete(); } catch(e){ toast("Löschen fehlgeschlagen"); } }
const newId = col => db ? db.collection(col).doc().id : "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
/* Einstellungen speichern (meta/settings): leere Werte entfallen (= Standard) */
async function saveSettings(patch, msg){
  const nx = Object.assign({}, S.settings || {}, patch);
  Object.keys(nx).forEach(k => { if (nx[k] === null || nx[k] === undefined || nx[k] === "") delete nx[k]; });
  nx.set = localIso(); S.settings = nx; applySettings(); render();
  if (!db){ offTouch(); if (msg) toast(msg); return true; }
  try { await db.doc("meta/settings").set(nx); if (msg) toast(msg); return true; } catch(e){ toast("Einstellungen nicht gespeichert – bitte erneut versuchen"); return false; }
}
async function setWeek(key, val){
  S.weeks[key] = val; render();
  if (!db){ offTouch(); return; }
  try { await db.doc("meta/weeks").update({status:{[key]:val}}); }
  catch(e){ try { await db.doc("meta/weeks").set({status:{...S.weeks}}); } catch(e2){ toast("Wochenstatus nicht gespeichert"); } }
}

/* ---------- Formulare ---------- */
const wdBoxes = (name, vals, days) => `<div class="wds">${(days||[1,2,3,4,5,6]).map(d => `<label><input type="checkbox" name="${name}" value="${d}" ${(vals||[]).includes(d)?"checked":""}>${WD[d]}</label>`).join("")}</div>`;
const opt = (list, v) => list.map(x => Array.isArray(x) ? `<option value="${esc(x[0])}" ${x[0]===v?"selected":""}>${esc(x[1])}</option>` : `<option ${x===v?"selected":""}>${esc(x)}</option>`).join("");
const refOpts = sel => Object.values(S.referents).sort(byRefName).map(r => `<option value="${r.id}" ${(sel||[]).includes(r.id)?"selected":""}>${esc(r.name)}</option>`).join("");
const serOpts = v => `<option value="">– keine Reihe –</option>` + Object.values(S.series).filter(s => s.active!==false || s.id===v).sort((a,b) => a.name.localeCompare(b.name,"de")).map(s => `<option value="${s.id}" ${s.id===v?"selected":""}>${esc(s.name)}</option>`).join("");
function fd(form){
  const f = new FormData(form), o = {};
  for (const el of form.elements){
    if (!el.name) continue;
    if (el.type === "checkbox" && el.closest(".wds")) o[el.name] = f.getAll(el.name).map(Number);
    else if (el.type === "checkbox") o[el.name] = el.checked;
    else if (el.multiple) o[el.name] = [...el.selectedOptions].map(x => x.value);
    else if (el.type === "number") o[el.name] = el.value === "" ? null : +el.value;
    else o[el.name] = el.value.trim();
  }
  return o;
}
function openDrawer(kind, id, preset, back){ UI.altFrom = null;
  if (kind === "ev" && UI.week0 == null) UI.week0 = UI.week || "";
  UI.drawer = {kind, id, preset, back}; UI.dirty = false; UI.dirtyOk = false;
  UI.selEv = kind === "ev" && id ? id : (back && back.kind === "ev" ? back.id : null); markSel();
  const dr = $("#drawer"); dr.hidden = false; $("#scrim").hidden = false; document.body.classList.add("dopen"); document.body.classList.toggle("dwide", kind === "ser" || kind === "ev" || kind === "ref"); document.body.classList.toggle("dref", kind === "ref"); document.body.classList.toggle("dev", kind === "ev"); dr.classList.add("dser");
  if (kind === "ev") dr.innerHTML = evForm(id ? S.events[id] : Object.assign({id:null, kind:"va", status:"Idee", dur:90}, preset||{}));
  if (kind === "ser") dr.innerHTML = serForm(id ? S.series[id] : {id:null, quiet:"nein", active:true});
  if (kind === "ref") dr.innerHTML = refForm(id ? S.referents[id] : {id:null});
  if (kind === "ans") dr.innerHTML = ansForm(id);
  if (kind === "pans") dr.innerHTML = pansForm(id);
  applySecs(dr, kind); hintsToHelp(dr); syncFurn(dr); endSync(); snapForm();
  const first = dr.querySelector("input,select,textarea"); if (first) first.focus({preventScroll:true});
  refreshLive(); if (kind === "ev" && preset && preset.__dup) weekPreview(true);
}
/* Ungespeicherte Änderungen im Dialog markieren (Felder, Bereiche, Zähler im Fuß) */
const fval = el => el.type === "checkbox" || el.type === "radio" ? (el.checked ? "1" : "0") : el.multiple ? [...el.selectedOptions].map(o => o.value).join("|") : el.value;
function snapForm(){ const f = $("#drawer #f"); if (!f) return; f.querySelectorAll("input,select,textarea").forEach(el => { if (!el.classList.contains("dhm") && !el.classList.contains("endt")) el.dataset.orig = fval(el); }); markChanges(); }
/* v110: Feld „Ende“ = Beginn + Dauer (nur Anzeige/Eingabe, gespeichert wird die Dauer) */
function endSync(f){ f = f || $("#drawer #f"); const en = f && f.querySelector(".endt"); if (!en || document.activeElement === en) return;
  const st = f.elements.start, du = f.elements.dur, ad = f.elements.allDay && f.elements.allDay.checked;
  const sv = st && st.value ? t2m(st.value) : null, dv = du && du.value !== "" ? +du.value : null;
  en.value = !ad && sv != null && dv != null && sv + dv < 24*60 ? m2t(sv + dv) : ""; en.classList.remove("bad");
  en.disabled = !!ad; const l = en.closest("label"); if (l && f.elements.allDay) l.classList.toggle("off", !!ad); }
/* Eingabe im Feld „Ende“: Dauer = Ende − Beginn; Rückgabe Text = nicht übernehmbar. Während der Eingabe (final=false) still,
   geprüft und gemeldet wird erst beim Verlassen des Feldes (sonst bricht z. B. die erste Ziffer „1“ = 01:00 die Eingabe ab) */
function endApply(f, en, final){
  const st = f.elements.start, du = f.elements.dur; if (!du) return true;
  if (!en.value){ if (final) endSync(f); return true; }
  if (!st || !st.value) return "Bitte zuerst den Beginn eintragen";
  const d = t2m(en.value) - t2m(st.value);
  if (d <= 0) return "Das Ende muss nach dem Beginn liegen";
  if (+du.value !== d){ du.value = d; du.dispatchEvent(new Event("input", {bubbles:true})); }
  return true; }
function markChanges(){
  const dr = $("#drawer"), f = dr && dr.querySelector("#f"); if (!f) return 0;
  let n = 0; f.querySelectorAll(".chg").forEach(x => x.classList.remove("chg"));
  f.querySelectorAll("input,select,textarea").forEach(el => {
    if (el.dataset.orig === undefined || fval(el) === el.dataset.orig) return; n++;
    (el.closest(".dpair") || el).classList.add("chg"); const lab = el.closest("label"); if (lab) lab.classList.add("chg");
    const wl = el.closest(".wds") && el.closest(".wds").closest("label"); if (wl) wl.classList.add("chg"); });
  f.querySelectorAll("details.sec").forEach(d => d.classList.toggle("chg", !!d.querySelector(".chg")));
  const df = dr.querySelector(".df"); if (df){ let c = df.querySelector(".chgcount"); if (!c){ c = document.createElement("span"); c.className = "chgcount"; df.appendChild(c); }
    c.textContent = n ? "● " + n + " ungespeicherte Änderung" + (n > 1 ? "en" : "") : ""; }
  UI.dirty = n > 0; return n;
}
function hintsToHelp(root){
  root.querySelectorAll("span.hint:not(.keep)").forEach(h => {
    const t = h.textContent.trim().replace(/^\((.*)\)$/s, "$1"); if (!t) return;
    if (h.previousSibling && h.previousSibling.nodeName === "BR") h.previousSibling.remove();
    const w = document.createElement("span"); w.innerHTML = qh(esc(t)); const q = w.firstChild; h.replaceWith(q);
    /* Symbol in dieselbe Zeile wie den Feldnamen setzen */
    const prev = q.previousSibling;
    if (prev && (prev.nodeType === 3 ? prev.textContent.trim() : !/^(INPUT|SELECT|TEXTAREA|DIV)$/.test(prev.nodeName))){
      const lt = document.createElement("span"); lt.className = "lt"; q.before(lt); lt.append(prev, q);
    }
  });
}
/* Möblierung nur wählbar, wenn der Workshopraum genutzt wird (Raum, Raum außerhalb der Saison oder Ausweichraum) */
const wsrIn = r => !!r && (r === "Gesamtes EG" || String(r).split(" + ").includes("Workshopraum"));
function syncFurn(dr){
  const f = dr && dr.querySelector("#f"); if (!f) return;
  /* Online: Ablauf-Felder im Haus nicht relevant */
  const online = f.elements.room && f.elements.room.value === "online";
  const sec = f.querySelector(".s-d");
  if (sec) sec.querySelectorAll("input,select,textarea").forEach(x => { if (x.name === "room") return; x.disabled = online; const l = x.closest("label"); if (l) l.classList.toggle("off", online); });
  if (sec) sec.classList.toggle("onl", online);
  /* Ganztägig: Uhrzeiten nicht relevant */
  if (f.elements.allDay){ const ad = f.elements.allDay.checked;
    [f.elements.start, ...f.querySelectorAll('.s-b .dpair input')].forEach(x => { if (!x) return; x.disabled = ad; const l = x.closest("label"); if (l) l.classList.toggle("off", ad); }); }
  /* Außenbereich: Ausweichraum, Raum außerhalb der Saison und Saison nur bei Raum draußen relevant */
  if (!online && f.elements.room){ const outdoor = OUTROOMS.includes(f.elements.room.value);
    ["backupRoom","roomOff","seasonFrom","seasonTo","season"].forEach(n => { const x = f.elements[n]; if (!x) return; x.disabled = !outdoor; const l = x.closest("label"); if (l) l.classList.toggle("off", !outdoor);
      x.title = outdoor ? "" : "Nur relevant, wenn als Raum ein Außenbereich (Innenhof oder unterwegs) gewählt ist"; }); }
  if (online || !f.elements.furn) return;
  const el = n => f.elements[n] ? f.elements[n].value : "";
  const out = OUTROOMS.includes(el("room")), on = wsrIn(el("room")) || (out && (wsrIn(el("roomOff")) || wsrIn(el("backupRoom")))); /* Ausweich-/Winterraum zählt nur bei Raum draußen */
  f.elements.furn.disabled = !on; const lab = f.elements.furn.closest("label"); if (lab) lab.classList.toggle("off", !on);
  f.elements.furn.title = on ? "" : "Nur wählbar, wenn als Raum der Workshopraum gewählt ist (bei Innenhof/unterwegs auch, wenn der Workshopraum Ausweich- oder Winterraum ist)";
}
/* Auf-/Zugeklappt-Zustand der Abschnitte je Dialogart merken */
const secKey = (kind, det) => { const sm = det.querySelector(":scope>summary"); return kind + ":" + (sm && sm.firstChild ? sm.firstChild.textContent.trim() : ""); };
function loadSecs(){ if (UI.secs) return UI.secs; try { UI.secs = JSON.parse(localStorage.getItem("shp-secs") || "{}"); } catch(e){ UI.secs = {}; } return UI.secs; }
function applySecs(dr, kind){
  const m = loadSecs(); UI.secApplying = true;
  dr.querySelectorAll("details.sec").forEach(d => { const k = secKey(kind, d); if (k in m) d.open = !!m[k]; d.dataset.seck = k; });
  setTimeout(() => UI.secApplying = false, 0);
}
/* Quick-Help: eine schwebende Box für alle Hilfe-Symbole */
let QT = null;
function showTip(el){
  const t = el.querySelector("template.qht"), tip = $("#qtip"); if (!t || !tip) return;
  clearTimeout(QT); tip.innerHTML = t.innerHTML; tip.hidden = false; tip.classList.toggle("wide", t.innerHTML.includes("qcols"));
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  let x = r.left, y = r.bottom + 6; if (x + w > innerWidth - 12) x = Math.max(12, innerWidth - 12 - w); if (y + h > innerHeight - 12) y = Math.max(12, r.top - 6 - h);
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
const hideTip = () => { clearTimeout(QT); QT = setTimeout(() => { const tip = $("#qtip"); if (tip) tip.hidden = true; }, 180); };
document.addEventListener("mouseover", ev => { const hb = ev.target.closest && ev.target.closest(".wgrid [data-ev]"); document.querySelectorAll(".wgrid .hov").forEach(x => x.classList.remove("hov")); if (hb) document.querySelectorAll(`.wgrid [data-ev="${CSS.escape(hb.dataset.ev)}"]`).forEach(x => x.classList.add("hov")); });
document.addEventListener("mouseover", ev => { const q = ev.target.closest(".qh"); if (q) return showTip(q); if (ev.target.closest("#qtip")) return clearTimeout(QT); hideTip(); });
document.addEventListener("focusin", ev => { const q = ev.target.closest(".qh"); if (q) showTip(q); });
document.addEventListener("focusout", ev => { if (ev.target.closest(".qh")) hideTip(); });
/* Feld „Ende“: Dauer beim Betreten merken; beim Verlassen prüfen, bei ungültiger Eingabe Meldung und alte Dauer zurück */
document.addEventListener("focusin", ev => { if (ev.target.classList && ev.target.classList.contains("endt")){ const f0 = ev.target.closest("#f"); ev.target.dataset.d0 = f0 && f0.elements.dur ? f0.elements.dur.value : ""; } });
document.addEventListener("focusout", ev => { const en = ev.target; if (!en.classList || !en.classList.contains("endt")) return; const f0 = en.closest("#f"); if (!f0) return;
  const r = endApply(f0, en, true);
  if (r !== true){ toast(r); const du = f0.elements.dur; if (du && en.dataset.d0 !== undefined && du.value !== en.dataset.d0){ du.value = en.dataset.d0; du.dispatchEvent(new Event("input", {bubbles:true})); } }
  setTimeout(() => endSync(f0), 0); });
document.addEventListener("click", ev => { const q = ev.target.closest(".qh"); if (q){ ev.preventDefault(); showTip(q); } }, true);
document.addEventListener("keydown", ev => { if (ev.key === "Escape"){ const tip = $("#qtip"); if (tip) tip.hidden = true; } });
document.addEventListener("toggle", ev => {
  const d = ev.target; if (!(d instanceof HTMLDetailsElement) || !d.dataset.seck || UI.secApplying) return;
  const m = loadSecs(); m[d.dataset.seck] = d.open; try { localStorage.setItem("shp-secs", JSON.stringify(m)); } catch(e){}
}, true);
const WIDE = () => window.matchMedia("(min-width:1400px)").matches;
function closeDrawer(saved, keep){ UI.altFrom = null;
  const had = !!PREV; PREV = null;
  const retY = UI.dayOnly && !keep && UI.view0 === "liste" ? UI.retY : null; UI.retY = null;
  const fromPr = UI.dayOnly && !keep; if (fromPr){ UI.dayOnly = null; if (UI.view0) UI.view = UI.view0; UI.view0 = null; saved = false; }
  if (!saved){ if (UI.week0 != null && UI.week0 !== "") UI.week = UI.week0; if (UI.view0 != null) UI.view = UI.view0; }
  UI.week0 = null; UI.view0 = null; if (had || fromPr) render();
  document.body.classList.remove("dopen","dwide","dev","dref"); UI.drawer = null; UI.selEv = null; markSel(); $("#drawer").hidden = true; $("#scrim").hidden = true; $("#drawer").innerHTML = ""; if (retY != null) UI.restoreY = retY; }
function shell(title, body, foot, tag){ return `<div class="dh${tag ? " dupd" : ""}"><h3>${tag ? `<span class="dupb">${esc(tag)}</span>` : ""}${esc(title)}</h3><button class="btn ghost" data-close="1" aria-label="Schließen">✕</button></div><div class="db">${body}</div><div class="df">${foot}</div>`; }
function delBtn(){ return `<button type="button" class="btn danger" data-del="1">Löschen</button><button type="button" class="btn danger" data-delok="1" hidden>Wirklich löschen</button>`; }

function serNav(e){
  const s = e.id && e.seriesId && S.series[e.seriesId]; if (!s) return "";
  const list = evList().filter(x => x.seriesId === e.seriesId).sort(sortEv), i = list.findIndex(x => x.id === e.id);
  const prev = list[i-1], next = list[i+1], lab = x => x ? WD[wdOf(x.date)]+" "+fmt(x.date) : "";
  return `<div class="sernav"><button type="button" class="btn" data-evnav="${prev?prev.id:""}" ${prev?"":"disabled"} title="${esc(prev?"Vorheriger Termin: "+lab(prev):"Kein früherer Termin")}">← ${esc(lab(prev)||"vorheriger")}</button><span class="pos"><b>${i+1}</b> von ${list.length}<br><span class="notes">${esc(s.name)}</span></span><button type="button" class="btn" data-evnav="${next?next.id:""}" ${next?"":"disabled"} title="${esc(next?"Nächster Termin: "+lab(next):"Kein späterer Termin")}">${esc(lab(next)||"nächster")} →</button><button type="button" class="btn ghost" data-openser="${s.id}">Reihe bearbeiten</button></div>`;
}
/* v112: Angaben der Website zum Termin (nur Anzeige) */
function webInfo(e){
  const w = e.web; if (!w || !w.url) return "";
  const at = w.at ? WD[wdOf(w.at.slice(0, 10))] + " " + fmtY(w.at.slice(0, 10)) + " " + w.at.slice(11) : "";
  return `<div class="full notes webinfo">${w.src === "manuell" ? "manuell eingetragen" : "automatisch zugeordnet"}${w.title ? " · „" + esc(w.title) + "“" : ""}${at ? " · Website: " + esc(at) : ""} · <a class="clink" href="${esc(w.url)}" target="_blank" rel="noopener">öffnen ↗</a></div>`;
}
function evForm(e){
  const ser = serOf(e), has = v => v != null && v !== "";
  const fromSer = (v, fmtv) => ser.id ? (has(v) ? "leer = aus Reihe: " + (fmtv ? fmtv(v) : v) : "leer = aus Reihe (nicht gesetzt)") : "";
  const hm = v => fmtHM(+v) + " h";
  const ciLab = {vorher:CI_MIN + " Min vor Beginn", durchgehend:"durchgehend", keiner:"kein Check-in"};
  const serCi = ser.checkin || (isBeratung(Object.assign({}, e, {kind:"va"})) ? "durchgehend" : "vorher");
  const dupOf = e.__dup && S.events[e.__dup];
  const dupBar = e.__dup ? `<div class="dupbar"><b>Duplikat – noch nicht gespeichert.</b> Alle Einstellungen sind übernommen${dupOf ? " von " + esc(WD[wdOf(dupOf.date)] + " " + fmtY(dupOf.date)) : ""}. Bitte eine neue <b>Startzeit</b> eintragen (Pflichtfeld) und Datum, Status und Referenten prüfen.</div>` : "";
  const body = dupBar + serNav(e) + `<form class="form" id="f">
  <details class="sec full s-a" open><summary>Grunddaten</summary><div class="form">
   <label class="full">Reihe<select name="seriesId" id="fSer">${serOpts(e.seriesId)}</select></label>
   <label class="full">Titel <span class="hint">leer = Name der Reihe</span><input name="title" value="${esc(e.title||"")}"></label>
   <label>Themenbereich<select name="theme"><option value="">–</option>${opt(Object.keys(THEMES), e.theme)}</select></label>
   <label>Art<select name="kind">${opt(Object.entries(KINDS), e.kind||"va")}</select></label>
   <label>Status <span class="hint">Idee: nur denkbar · Option: intern vorgemerkt · angefragt: Referent gefragt · zugesagt: Referent hat bestätigt · fix: intern freigegeben, alle Angaben komplett · in WP angelegt · veröffentlicht. Frist: ${WARN_DAYS/7} Wochen vorher mind. fix (sonst Vorwarnung), ${ON_DAYS/7} Wochen vorher veröffentlicht (sonst Fehler).</span><select name="status">${opt(STATUS, e.status)}</select></label>
   <label class="full">Link auf survivors-home.de <span class="hint">setzt der Website-Abgleich automatisch; nur eintragen, wenn er fehlt oder falsch ist (wird dann nicht mehr überschrieben). Leeren = beim nächsten Abgleich neu zuordnen.</span><input type="url" name="webUrl" value="${esc((e.web||{}).url||"")}" placeholder="https://survivors-home.de/veranstaltung/…"></label>${webInfo(e)}
   <label class="cb"><input type="checkbox" name="fixed" ${e.fixed?"checked":""}> fester Termin <span class="hint">Datum und Zeit sind von außen vorgegeben (z. B. Partner, Referent): Die Jahresplanung verschiebt oder ersetzt diesen Termin nie; Hinweise zu ruhiger Woche, Programmpause und Dachgeschoss entfallen.</span></label>
   <label class="full">Referenten (Strg/⌘ für mehrere)<select name="refs" multiple>${refOpts(e.refs)}</select></label>
  </div></details>
  <details class="sec full s-b" open><summary>Wann</summary><div class="form">
   <label>Datum<input type="date" name="date" value="${esc(e.date||"")}" required></label>
   <label>Start${e.__dup ? ' <span class="req keep">neu eintragen</span>' : ""}<input type="time" name="start" step="900" value="${esc(e.start||"")}"${e.__dup ? " required" : ""}></label>
   <label>Dauer${durPair(`name="dur" step="15"`, e.dur||"", "Dauer")}</label>
   <label>Ende <span class="hint">Ende der Veranstaltung (ohne Nachlauf Gäste, inkl. Abschluss). Eingabe berechnet die Dauer. Wird danach der Beginn oder die Dauer geändert, verschiebt sich das Ende.</span><input type="time" class="endt" step="300" aria-label="Ende"></label>
   <label class="cb"><input type="checkbox" name="allDay" ${e.allDay?"checked":""}> ganztägig</label>
  </div></details>
  <details class="sec full s-d" open><summary>Raum und Ablauf</summary><div class="form">
   <label class="full">Raum<select name="room"><option value="">offen</option>${opt(ROOMS, e.room)}</select></label>
   <label class="full">Möblierung Workshopraum <span class="hint">${esc(ser.id ? "leer = aus Reihe: " + (ser.furn || "nicht festgelegt") : "nur bei Nutzung des Workshopraums")}</span><select name="furn"><option value="">${ser.id ? "aus Reihe" : "–"}</option>${opt(FURN, e.furn)}</select></label>
   <label class="cb"><input type="checkbox" name="hybrid" ${e.hybrid?"checked":""}> Hybrid / Live</label><input type="hidden" name="sebAuto" value="${e.sebAuto ? "1" : ""}">
   <div class="invbox full" data-invbox="1"${e.hybrid ? "" : " hidden"}><a class="btn" data-invite="1" href="#" target="_blank" rel="noopener">Termineinladung</a><label class="cb"><input type="checkbox" name="invSent" ${e.invSent && !e.__dup ? "checked" : ""}> Einladung verschickt</label>${qh(INV_HELP)}<span class="invhint" aria-live="polite"></span></div>
   <label class="cb full"><input type="checkbox" name="kitchenClean" ${e.kitchenClean?"checked":""}> Küchenreinigung <span class="hint">Küche wird genutzt und muss danach gereinigt werden; für die spätere Einsatzplanung der Reinigungskräfte, wird derzeit nicht ausgewertet (bei neuem Termin aus der Reihe übernommen)</span></label>
   <label class="full">Parallelbetrieb im EG <span class="hint">${esc((ser.id ? "leer = aus Reihe: Stufe " + serLevel(ser) + " · " : "") + EGL_HELP)}</span><select name="egLevel">${ser.id ? `<option value="">aus Reihe: ${esc(serLevel(ser) + " · " + eglName(serLevel(ser)))}</option>` : ""}${opt(EGL.map(x => [String(x[0]), x[0] + " · " + x[1]]), +e.egLevel ? String(e.egLevel) : (ser.id ? "" : String(e.excl ? 3 : 1)))}</select></label>
   <label>Draußen <span class="hint">${esc(ser.id ? "leer = aus Reihe: " + (ser.outdoor ? "ja" : "nein") : "")} – steuert die Prüfung auf Sonnenuntergang</span><select name="outdoor"><option value="">${ser.id ? "aus Reihe" : "–"}</option>${opt([["ja","findet (teilweise) draußen statt"],["nein","drinnen"]], e.outdoor === true ? "ja" : e.outdoor)}</select></label>
   <label>Check-in<select name="checkin"><option value="">${esc(ser.id ? "aus Reihe: " + ciLab[serCi] : "Standard (" + CI_MIN + " Min vor Beginn)")}</option>${opt([["vorher","30 Min vor Beginn"],["durchgehend","durchgehend: " + CI_MIN + " Min vorher und während der ganzen Veranstaltung"],["keiner","kein Check-in"]], e.checkin)}</select></label>
   <label>Aufbau vor Beginn <span class="hint">${esc(fromSer(ser.setup, hm) || "leer = 5:00 h bei Hybrid, sonst 0")}${e.allDay ? " · bei ganztägig ohne Wirkung" : ""}</span>${durPair(`name="setup" placeholder="${esc(has(ser.setup) ? ser.setup : "")}" step="15"`, e.setup, "Aufbau")}</label>
   <label>Nachlauf Gäste <span class="hint">${esc((fromSer(ser.after, hm) || "leer = 0") + " · Zeit nach dem offiziellen Ende, in der Gäste noch im Raum sind")}</span>${durPair(`name="after" placeholder="${esc(has(ser.after) ? ser.after : "")}" step="5"`, e.after, "Nachlauf")}</label>
   <label>Abbau nach Ende <span class="hint">${esc(fromSer(ser.teardown, hm) || "leer = 0")}</span>${durPair(`name="teardown" placeholder="${esc(has(ser.teardown) ? ser.teardown : "")}" step="15"`, e.teardown, "Abbau")}</label>
   <label>Ausweichraum bei Schlechtwetter <span class="hint">${esc((fromSer(ser.backupRoom) || "") + " · nur bei Raum Innenhof oder unterwegs – sonst ausgegraut")}</span><select name="backupRoom"><option value="">–</option>${opt(EG.filter(r => r !== "Innenhof"), e.backupRoom)}</select></label>
   <label>Abschluss in anderem Raum <span class="hint">${esc(fromSer(ser.endRoom))}</span><select name="endRoom"><option value="">–</option>${opt(ROOMS.filter(r => r !== "online" && r !== "unterwegs"), e.endRoom)}</select></label>
   <label>Abschluss-Dauer <span class="hint">${esc((fromSer(ser.endMin, hm) || "") + " · Teil der Dauer")}</span>${durPair(`name="endMin" placeholder="${esc(has(ser.endMin) ? ser.endMin : "")}" step="5"`, e.endMin, "Abschluss-Dauer")}</label>
  </div></details>
  <details class="sec full s-e"${WIDE() ? " open" : ""}><summary>Notiz${has(e.note) ? ' <span class="hint keep">(vorhanden)</span>' : ""}</summary><div class="form">
   <label class="full">Notiz<textarea name="note" rows="3">${esc(e.note||"")}</textarea></label>
  </div></details>
  </form><div class="live" id="live"></div>`;
  const foot = `<button class="btn primary" data-save="ev">Speichern</button>${e.id?`<button class="btn" data-dup="1">Duplizieren</button>`+delBtn():""}<button class="btn ghost" data-close="1">Abbrechen</button>`;
  return shell(e.id || e.__dup ? evName(e) : "Neuer Termin", body, foot, e.__dup ? "Duplikat" : "");
}
function serForm(s){
  const back = UI.drawer && UI.drawer.back && S.events[UI.drawer.back.id];
  const backBar = back ? `<div class="sernav"><button type="button" class="btn" data-back="1">← zurück zum Termin ${esc(WD[wdOf(back.date)]+" "+fmt(back.date))}</button><span class="notes">Nach dem Speichern geht es automatisch zum Termin zurück.</span></div>` : "";
  const g = s.id ? serGaps(s) : null;
  const gbox = g && (g.miss.length || g.prop.length || s.basis) ? `<div class="gapbox">${g.miss.length?`<div><span class="lv err">Fehlt</span> ${esc(g.miss.join(", "))}</div>`:""}${g.prop.length?`<div><span class="lv warn">Vorschlag</span> ${esc(g.prop.join(", "))} aus den Daten abgeleitet – mit „Speichern“ bestätigt.</div>`:""}${s.basis?`<div class="notes">Grundlage: ${esc(s.basis)}</div>`:""}</div>` : "";
  const has = v => v != null && v !== "" && !(Array.isArray(v) && !v.length);
  const body = backBar + serListNav(s) + gbox + `<form class="form" id="f">
  <details class="sec full s-a" open><summary>Grunddaten</summary><div class="form">
   <label class="full">Name<input name="name" value="${esc(s.name||"")}" required></label>
   <label>Themenbereich<select name="theme"><option value="">–</option>${opt(Object.keys(THEMES), s.theme)}</select></label>
   <label>Veranstaltungsform<select name="form"><option value="">–</option>${opt(FORMS, s.form)}</select></label>
   <label class="full">Referenten (Strg/⌘ für mehrere)<select name="refs" multiple>${refOpts(s.refs)}</select></label>
   <label class="cb"><input type="checkbox" name="refsVary" ${s.refsVary?"checked":""}> Referenten wechseln je Termin</label>
   <label>Status ${YEAR}<select name="activeSel">${opt([["aktiv","aktiv"],["pausiert","pausiert"]], s.active===false?"pausiert":"aktiv")}</select></label>
  </div></details>
  <details class="sec full s-b" open><summary>Wann – Tage und Zeiten</summary><div class="form">
   <div class="full lbl">Mögliche Wochentage <span class="hint">(gilt für Reihe und Referent; leer = alle)</span>${wdBoxes("weekdays", s.weekdays)}</div>
   <label>Übliche Startzeit<input type="time" name="start" step="900" value="${esc(s.start||"")}"></label>
   <label>Dauer${durPair(`name="dur" step="15"`, s.dur||"", "Dauer")}</label>
   <label>Übliches Ende <span class="hint">Ende der Veranstaltung (ohne Nachlauf Gäste, inkl. Abschluss). Eingabe berechnet die Dauer. Wird danach der Startzeit oder die Dauer geändert, verschiebt sich das Ende.</span><input type="time" class="endt" step="300" aria-label="Übliches Ende"></label>
   <label>Frühester Beginn <span class="hint">(leer = offen)</span><input type="time" name="earliest" step="900" value="${esc(s.earliest||"")}"></label>
   <label>Spätestes Ende <span class="hint">(leer = offen)</span><input type="time" name="latestEnd" step="900" value="${esc(s.latestEnd||"")}"></label>
   <label class="cb"><input type="checkbox" name="noFerien" ${s.noFerien?"checked":""}> nicht in den Berliner Schulferien</label>
   <label>In ruhiger Woche<select name="quiet">${opt([["ja","erlaubt"],["ausnahme","nur Ausnahme"],["nein","nein"]], s.quiet||"nein")}</select></label>
   <label class="full">Saison <span class="hint">(Text, z. B. März–November)</span><input name="season" value="${esc(s.season||"")}"></label>
  </div></details>
  <details class="sec full s-c" open><summary>Anzahl und Intervall</summary><div class="form">
   <label>Anzahl ${YEAR} (Soll)<input type="number" name="count" min="0" value="${esc(s.count==null?"":s.count)}"></label>
   <div class="lbl">Intervall <span class="hint">(berechnet, ruhige Wochen und Ferien zählen mit, Pausen nicht)</span><div class="notes" id="ivShow">${esc(ivText(s))}</div></div>
   <label class="cb full"><input type="checkbox" name="individual" ${s.individual?"checked":""}> <span>Termine individuell (kein fester Rhythmus)<br><span class="hint">Termine werden einzeln gesetzt, nicht automatisch vorgeplant; Wochentag, Referenten, Startzeit und Anzahl sind dann keine Pflichtangaben, kein Intervall.</span></span></label>
  </div></details>
  <details class="sec full s-d" open><summary>Raum und Ablauf</summary><div class="form">
   <label class="full">Raum<select name="room"><option value="">offen</option>${opt(ROOMS, s.room)}</select></label>
   <label class="full">Möblierung Workshopraum <span class="hint">(nur wenn die Reihe den Workshopraum nutzt; die Jahresplanung legt Termine mit gleicher Möblierung möglichst hintereinander, um Umbauten zu sparen)</span><select name="furn"><option value="">– nicht festgelegt –</option>${opt(FURN, s.furn)}</select></label>
   <label class="cb"><input type="checkbox" name="hybrid" ${s.hybrid?"checked":""}> Hybrid / Live</label><input type="hidden" name="sebAuto" value="${s.sebAuto ? "1" : ""}">
   <label class="full">Parallelbetrieb im EG <span class="hint">${esc(EGL_HELP)}</span><select name="egLevel">${opt(EGL.map(x => [String(x[0]), x[0] + " · " + x[1]]), String(serLevel(s)))}</select></label>
   <label class="cb full"><input type="checkbox" name="outdoor" ${s.outdoor?"checked":""}> findet (teilweise) draußen statt</label>
   <label class="cb full"><input type="checkbox" name="kitchenClean" ${s.kitchenClean?"checked":""}> Küchenreinigung <span class="hint">Küche wird genutzt und muss danach gereinigt werden; für die spätere Einsatzplanung der Reinigungskräfte, wird derzeit nicht ausgewertet; Vorgabe für neue Termine der Reihe</span></label>
   <label class="full">Check-in<select name="checkin">${opt([["vorher",CI_MIN + " Min vor Beginn"],["durchgehend","durchgehend: " + CI_MIN + " Min vorher und während der ganzen Veranstaltung"],["keiner","kein Check-in"]], s.checkin || (s.form==="Beratung" ? "durchgehend" : "vorher"))}</select></label>
   <label>Aufbau vor Beginn <span class="hint">(leer = 5:00 h bei Hybrid)</span>${durPair(`name="setup" step="15"`, s.setup, "Aufbau")}</label>
   <label>Nachlauf Gäste <span class="hint">(nach offiziellem Ende)</span>${durPair(`name="after" step="5"`, s.after, "Nachlauf")}</label>
   <label>Abbau nach Ende${durPair(`name="teardown" step="15"`, s.teardown||"", "Abbau")}</label>
   <span></span>
   <label>Ausweichraum bei Schlechtwetter <span class="hint">(nur bei Raum Innenhof oder unterwegs – sonst ausgegraut)</span><select name="backupRoom"><option value="">–</option>${opt(EG.filter(r => r !== "Innenhof"), s.backupRoom)}</select></label>
   <label>Raum außerhalb der Saison <span class="hint">(leer = dann keine Termine; nur bei Raum Innenhof oder unterwegs – sonst ausgegraut)</span><select name="roomOff"><option value="">–</option>${opt(ROOMS.filter(r => !OUTROOMS.includes(r) && r !== "online"), s.roomOff)}</select></label>
   <label>Draußen-Saison von <span class="hint">(TT.MM., leer = 15.03.)</span><input name="seasonFrom" placeholder="15.03." value="${esc(md2de(s.seasonFrom))}"></label>
   <label>Draußen-Saison bis <span class="hint">(TT.MM., leer = 15.10.)</span><input name="seasonTo" placeholder="15.10." value="${esc(md2de(s.seasonTo))}"></label>
   <label>Abschluss in anderem Raum<select name="endRoom"><option value="">–</option>${opt(ROOMS.filter(r => r !== "online" && r !== "unterwegs"), s.endRoom)}</select></label>
   <label>Abschluss-Dauer <span class="hint">(Teil der Dauer)</span>${durPair(`name="endMin" step="5"`, s.endMin||"", "Abschluss-Dauer")}</label>
   <label class="full">Gemeinsamer Abschluss mit Reihe <span class="hint">(fallen beide Reihen auf denselben Tag, enden sie bewusst zusammen im Abschluss-Raum – keine Doppelbelegung, kein Fehler beim Startabstand)</span><select name="shareEnd"><option value="">–</option>${Object.values(S.series).filter(x => x.id !== s.id).sort((a,b) => a.name.localeCompare(b.name,"de")).map(x => `<option value="${x.id}" ${s.shareEnd===x.id?"selected":""}>${esc(x.name)}</option>`).join("")}</select></label>
  </div></details>
  <details class="sec full s-e"${WIDE() ? " open" : ""}><summary>Regeln und Notizen${has(s.rules)||has(s.notes) ? ' <span class="hint keep">(vorhanden)</span>' : ""}</summary><div class="form">
   <label class="full">Regeln / Abhängigkeiten <span class="hint">(Freitext; wird bei der Planung durch Claude gelesen und umgesetzt – die automatische Prüfung im Tool wertet ihn nicht aus)</span><textarea name="rules" rows="3">${esc(s.rules||"")}</textarea></label>
   <label class="full">Notizen <span class="hint">(intern; Claude liest sie bei der Planung mit, z. B. die „Basis“ für die Verteilung auf Wochentage)</span><textarea name="notes" rows="3">${esc(s.notes||"")}</textarea></label>
  </div></details>
  </form>
  ${s.id ? `<details class="sec gen"><summary>Terminvorschläge berechnen</summary><div class="form">
   <label>von<input type="date" id="gFrom" value="${YEAR}-01-01"></label><label>bis<input type="date" id="gTo" value="${YEAR}-12-31"></label>
   <label>Anzahl <span class="hint">(Soll minus vorhandene ${YEAR})</span><input type="number" id="gN" min="1" value="${esc(Math.max(1, (+s.count||0) - evList().filter(e => e.seriesId === s.id && e.date.startsWith(String(YEAR)) && e.status !== "abgesagt").length) || 1)}"></label>
   <label>Wochentag<select id="gWd">${[1,2,3,4,5,6].map(d => `<option value="${d}" ${(s.weekdays||[])[0]===d?"selected":""}>${WD[d]}</option>`).join("")}</select></label>
   <label>Start<input type="time" id="gStart" step="900" value="${esc(s.start||"16:00")}"></label>
   <label class="cb full"><input type="checkbox" id="gQuiet" checked> <span>gleichmäßig über die Wochen ohne Pause verteilen; fällt ein Termin auf eine nicht erlaubte Woche (ruhige Woche${s.quiet==="ja"?"":" ohne Freigabe"}, Schulferien bei „nicht in Ferien“, Feiertag), rückt er in die nächstgelegene erlaubte Woche</span></label>
   <div class="full"><button type="button" class="btn" data-gen="1">Vorschläge berechnen</button></div></div><div id="cands"></div></details>` : ""}`;
  const nx = s.id && UI.serOrder ? S.series[UI.serOrder[UI.serOrder.indexOf(s.id)+1]] : null;
  const foot = `<button class="btn primary" data-save="ser">Speichern</button>${nx?`<button class="btn" data-save="ser" data-then="${nx.id}" title="${esc("Speichern und weiter zu: "+nx.name)}">Speichern + nächste →</button>`:""}${s.id?delBtn():""}<button class="btn ghost" data-close="1">Abbrechen</button>`;
  return shell(s.id ? s.name : "Neue Reihe", body, foot);
}
function refForm(r){
  const body = `<form class="form" id="f">
   <label class="full">Name<input name="name" value="${esc(r.name||"")}" required></label>
   <label class="full">Rolle<input name="role" value="${esc(r.role||"")}"></label>
   <label>E-Mail<input type="email" name="email" value="${esc(r.email||"")}"></label>
   <label>Telefon<input name="phone" value="${esc(r.phone||"")}"></label>
   <label>Anrede<select name="salutation">${opt(["Du","Sie"], r.salutation||"Du")}</select></label>
   <label>Kontaktweg<select name="contact">${opt(["Mail","Telefon"], r.contact||"Mail")}</select></label>
   <details class="sec full"${(r.only||[]).length||(r.blocked||[]).length||(r.noMorning||[]).length||r.evening||r.noFerien ? " open" : ""}><summary>Einschränkungen der Person <span class="hint">(nur nötig, wenn sie in mehreren Reihen oder im Wechsel auftritt – sonst Tage/Zeiten in der Reihe pflegen)</span></summary><div class="form">
   <div class="full lbl">Kann nur an (leer = alle Tage)${wdBoxes("only", r.only)}</div>
   <div class="full lbl">Kann nie an${wdBoxes("blocked", r.blocked)}</div>
   <div class="full lbl">Nicht vormittags an${wdBoxes("noMorning", r.noMorning)}</div>
   <label class="cb"><input type="checkbox" name="evening" ${r.evening?"checked":""}> nur abends (ab 17 Uhr)</label>
   <label class="cb"><input type="checkbox" name="noFerien" ${r.noFerien?"checked":""}> nicht in Berliner Schulferien</label>
   </div></details>
   <label class="full">Notizen<textarea name="notes" rows="3">${esc(r.notes||"")}</textarea></label>
  </form>
  ${r.id ? `<details class="sec full"${(r.avail||[]).length ? " open" : ""}><summary>Verfügbarkeit ${YEAR} aus Abfragen${(r.avail||[]).length ? ' <span class="hint keep">(' + r.avail.length + ')</span>' : ""}</summary>
   ${(r.avail||[]).length ? (r.avail||[]).map((a,i) => `<div class="avr"><span>${esc(availLabel(a))}</span><span class="notes">${esc(a.src||"")}</span><button type="button" class="btn ghost sm" data-delavail="${r.id}|${i}">entfernen</button></div>`).join("") : `<div class="notes">Noch keine Angaben – kommen über „Referenten“ → „Vorabfrage Verfügbarkeit“ → „Antwort einfügen“.</div>`}
   ${r.wish != null ? `<div class="notes">Wunschanzahl ${YEAR}: ${esc(r.wish)}</div>` : ""}</details>
  ${personEvs(r).length ? `<details class="sec full" open><summary>Termine ${YEAR} <span class="hint keep">(${esc(P_STATES[personInfo(r).state].t)})</span></summary><div class="iss" style="padding:4px 0">${personEvs(r).map(e => { const st = evSt(e, r), a = (e.refAns||{})[r.id]; return `<span class="lv ${st === "ok" ? "info" : st === "nein" ? "err" : st === "neu" ? "warn" : ""}" style="${st === "ok" ? "color:var(--ok)" : st === "asked" ? "background:var(--surface-2)" : ""}" title="${esc(evName(e) + " · " + P_LAB[st] + (a && a.note ? " · " + a.note : ""))}">${st === "ok" ? "✓ " : st === "nein" ? "✗ " : st === "neu" ? "● " : "… "}${esc(WD[wdOf(e.date)] + " " + fmt(e.date) + (e.start ? " " + e.start : "") + " " + evName(e))}</span>`; }).join(" ")}</div></details>` : ""}
  <details class="sec full"><summary>Nachrichtenverlauf <span class="hint keep">(${msgsOf(r.id).length})</span></summary>${histHtml(r)}</details>` : ""}`;
  const foot = `<button class="btn primary" data-save="ref">Speichern</button>${r.id?delBtn():""}<button class="btn ghost" data-close="1">Abbrechen</button>`;
  return shell(r.id ? r.name : "Neue Person", body, foot);
}
function draftEvent(){
  const f = $("#f"); if (!f || UI.drawer.kind !== "ev") return null;
  const o = fd(f); o.id = UI.drawer.id || "__draft"; return o;
}
/* Wochen-Vorschau: Entwurf aus dem Termin-Dialog links in der Wochenansicht */
let PREV = null;
const PREV_FIELDS = ["date","start","dur","allDay","room","endRoom","endMin","setup","after","teardown","backupRoom","egLevel","hybrid","checkin","furn","seriesId"];
function weekPreview(force){
  if (!UI.drawer || UI.drawer.kind !== "ev"){ PREV = null; return; }
  const d = draftEvent(); if (!d || !d.date){ PREV = null; return; }
  const orig = UI.drawer.id && S.events[UI.drawer.id];
  d.id = "__draft"; d.__draft = true;
  if (orig) ["blockDay","outdoor"].forEach(k => { if ((d[k] == null || d[k] === "") && orig[k] != null) d[k] = orig[k]; });
  const list = evList().filter(e => e.id !== UI.drawer.id).concat([d]);
  PREV = {list, iss: markAcc(computeIssues(list)), orig: orig && (orig.date !== d.date || (orig.start||"") !== (d.start||"") || +orig.dur !== +d.dur || (orig.room||"") !== (d.room||"") || !!orig.allDay !== !!d.allDay) ? orig : null};
  if (force && UI.view !== "woche"){ if (UI.view0 == null) UI.view0 = UI.view; UI.view = "woche"; }
  if (UI.view !== "woche") return;
  const [y,w] = isoWeek(d.date), [y0,w0] = UI.week ? isoWeek(UI.week) : [0,0];
  if (y !== y0 || w !== w0) UI.week = d.date;
  if (UI.dayOnly && UI.dayOnly !== d.date) UI.dayOnly = d.date;
  const sy = window.scrollY; $("#app").innerHTML = viewWoche(); window.scrollTo(0, sy); markSel();
  document.querySelectorAll("#tabs button").forEach(b => { if (b.dataset.view === UI.view) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); });
}
function refreshLive(fromRender){
  const box = $("#live"); if (!box) return;
  if (!fromRender) weekPreview();
  const d = draftEvent(); if (!d || !d.date){ box.innerHTML = ""; return; }
  const list = evList().filter(e => e.id !== d.id).concat([d]);
  const iss = markAcc(computeIssues(list)).get(d.id) || [];
  const saved = d.id && S.events[d.id];
  const accBtn = x => saved && (x.l === "err" || x.l === "warn") ? ` <button type="button" class="btn ghost sm" data-acc='${esc(JSON.stringify([d.id, x.t]))}' data-on="${x.acc ? 0 : 1}">${x.acc ? "wieder aktivieren" : "akzeptieren"}</button>` : "";
  const due = S_(D(d.date)-ON_DAYS);
  box.innerHTML = `<div class="notes">${WD[wdOf(d.date)]} · KW ${isoWeek(d.date)[1]} · Woche ${esc(weekStatus(d.date))} · online bis ${fmtY(due)}</div>` + (iss.length ? iss.map(x => `<div><span class="lv ${x.acc ? "warn acc" : x.l}">${x.acc ? "akzeptiert: " : ""}${esc(x.t)}</span>${accBtn(x)}</div>`).join("") : `<div><span class="lv info" style="color:var(--ok)">Keine Konflikte gefunden</span></div>`);
}
async function saveDrawer(kind, then){
  const f = $("#f"); if (!f.reportValidity()) return;
  let o = fd(f); const dr = UI.drawer;
  if (kind === "ev"){
    const id = dr.id || newId("events"); o = Object.assign({}, S.events[id] || (dr.preset && dr.preset.__dup ? dr.preset : {}), o, {id}); delete o.__dup;
    if ("egLevel" in o){ o.egLevel = +o.egLevel || null; o.excl = egLevel(o) >= 3; }
    if (!o.title && o.seriesId) o.title = (S.series[o.seriesId]||{}).name || "";
    o.sebAuto = o.sebAuto === "1" && (o.refs||[]).includes(SEB_ID); o.invSent = !!o.invSent;
    { const cur = (S.events[id] || {}).web, u = o.webUrl || ""; delete o.webUrl;
      if (!u) delete o.web; else if (!cur || u !== (cur.url || "")) o.web = {url:u, src:"manuell"}; else o.web = cur; }
    if (await put("events", id, o)){ S.events[id] = o; closeDrawer(true); toast("Termin gespeichert"); render(); }
  } else if (kind === "ser"){
    const id = dr.id || newId("series"); o = Object.assign({}, S.series[id] || {}, o, {id, unconfirmed: []}); if ("egLevel" in o){ o.egLevel = +o.egLevel || 1; o.excl = o.egLevel >= 3; o.exclStrict = o.egLevel === 4; } o.active = o.activeSel !== "pausiert"; delete o.activeSel; o.seasonFrom = de2md(o.seasonFrom); o.seasonTo = de2md(o.seasonTo); delete o.rhythmWeeks;
    o.sebAuto = o.sebAuto === "1" && (o.refs||[]).includes(SEB_ID);
    if (await put("series", id, o)){ S.series[id] = o; toast("Reihe gespeichert"); if (then && S.series[then]) openDrawer("ser", then); else if (dr.back && S.events[dr.back.id]) openDrawer("ev", dr.back.id); else closeDrawer(); render(); }
  } else {
    const id = dr.id || newId("referents"); o = Object.assign({}, S.referents[id] || {}, o, {id});
    if (await put("referents", id, o)){ S.referents[id] = o; closeDrawer(); toast("Person gespeichert"); render(); }
  }
}
/* v108: Sebastian bei Hybrid automatisch als Referent; Termineinladung über Outlook im Web */
const SEB_ID = "sebastian-roeder";
let SEB_MAIL = "sebastian.roeder@survivors-home.de", INV_LOC = "SURVIVORS HOME Foundation, Hildegardstr. 31, 10715 Berlin"; /* Einstellungen */
const INV_HELP = `<b>Termineinladung (nur bei Hybrid)</b><ul><li>„Termineinladung“ öffnet in Outlook im Web eine neue Besprechung: Titel, Beginn bis Ende, Ort und alle Referenten des Termins mit E-Mail-Adresse als Teilnehmer sind eingetragen. In Outlook prüfen und „Senden“ klicken.</li><li>Verwendet die aktuellen Angaben im Dialog, auch wenn sie noch nicht gespeichert sind.</li><li>„Einladung verschickt“ abhaken, sobald die Einladung raus ist, und den Termin speichern.</li><li>Prüfung: ohne Haken ab Status „fix“ oder „in WP angelegt“ ein Hinweis, bei „veröffentlicht“ ein Fehler (nur kommende Termine).</li><li>Ändern sich Datum, Beginn oder Dauer, wird der Haken entfernt – dann die Einladung neu senden.</li><li>Beim Einschalten von „Hybrid / Live“ wird Sebastian automatisch als Referent ergänzt (beim Ausschalten wieder entfernt, wenn er automatisch ergänzt wurde).</li></ul>`;
function sebSync(f, on){
  const sel = f.elements.refs, au = f.elements.sebAuto; if (!sel) return;
  const o = [...sel.options].find(x => x.value === SEB_ID); if (!o) return;
  if (on && !o.selected){ o.selected = true; if (au) au.value = "1"; toast("Sebastian als Referent ergänzt (Hybrid)"); }
  else if (!on && o.selected && au && au.value === "1"){ o.selected = false; au.value = ""; toast("Sebastian als Referent entfernt"); }
}
function invToggle(f){ const b = f.querySelector("[data-invbox]"); if (b) b.hidden = !(f.elements.hybrid && f.elements.hybrid.checked); }
function berlinOff(d){ try { const t = new Date(Date.UTC(+d.slice(0,4), +d.slice(5,7)-1, +d.slice(8,10), 12)).toLocaleString("en-US", {timeZone:"Europe/Berlin", timeZoneName:"shortOffset"}); const m = /GMT([+-]\d+)/.exec(t); const h = m ? +m[1] : 1; return (h < 0 ? "-" : "+") + pad(Math.abs(h)) + ":00"; } catch(x){ return "+01:00"; } }
function inviteInfo(e){
  if (!e || !e.date || !e.start || e.allDay) return {err:"Für die Einladung Datum und Beginn eintragen (nicht ganztägig)."};
  const s = t2m(e.start), en = s + (+e.dur || 0); if (!(+e.dur > 0)) return {err:"Für die Einladung die Dauer eintragen."};
  const rs = (e.refs||[]).map(id => S.referents[id]).filter(Boolean);
  const mail = r => (r.email || (r.id === SEB_ID ? SEB_MAIL : "")).trim();
  const to = [...new Set(rs.map(mail).filter(Boolean))], miss = rs.filter(r => !mail(r)).map(r => r.name);
  const off = berlinOff(e.date), dt = m => e.date + "T" + m2t(m) + ":00" + off;
  const day = WD[wdOf(e.date)] + "., " + fmtY(e.date) + ", " + e.start + "–" + m2t(en) + " Uhr";
  const subject = evName(e) + " (hybrid)";
  const body = "Einladung zur hybriden Veranstaltung „" + evName(e) + "“ im SURVIVORS HOME (vor Ort mit Live-Übertragung). Termin: " + day + ". Ort: " + INV_LOC + ".";
  const q = {path:"/calendar/action/compose", rru:"addevent", subject, startdt:dt(s), enddt:dt(en), location:INV_LOC, body, to:to.join(",")};
  const url = "https://outlook.office.com/calendar/0/deeplink/compose?" + Object.entries(q).map(([k,v]) => k + "=" + encodeURIComponent(v)).join("&");
  return {url, to, miss};
}
function applySeries(sid){
  const s = S.series[sid], f = $("#f"); if (!s || !f) return;
  const set = (n,v) => { const el = f.elements[n]; if (!el || v == null || v === "") return; if (el.type === "checkbox") el.checked = !!v; else el.value = v; };
  set("title", s.name); set("dur", s.dur); set("room", s.room); set("theme", s.theme);
  if (!f.elements.start.value) set("start", s.start);
  if (f.elements.kitchenClean) f.elements.kitchenClean.checked = !!s.kitchenClean;
  f.elements.hybrid.checked = !!s.hybrid; if (f.elements.egLevel) f.elements.egLevel.value = "";
  [...f.elements.refs.options].forEach(o => o.selected = (s.refs||[]).includes(o.value));
  if (f.elements.sebAuto) f.elements.sebAuto.value = s.hybrid && s.sebAuto ? "1" : "";
  if (s.hybrid) sebSync(f, true); invToggle(f);
}

/* ---------- Terminvorschläge ---------- */
let CANDS = [];
function genCands(){
  const s = S.series[UI.drawer.id]; if (!s) return;
  const from = $("#gFrom").value, to = $("#gTo").value, n = Math.max(1, +$("#gN").value||1), wd = +$("#gWd").value, start = $("#gStart").value, mv = $("#gQuiet").checked;
  if (!from || !to || from > to){ toast("Zeitraum prüfen"); return; }
  /* nutzbare Wochen = ohne Programmpause (und bei Saison-Reihen nur in der Saison); Termine gleichmäßig darüber verteilt → Pausen unterbrechen so kurz wie möglich */
  const U = serWeeks(s, from, to).filter(mo => { const d = S_(D(mo) + wd - 1); return d >= from && d <= to; });
  if (!U.length){ toast("Keine Woche ohne Pause im Zeitraum"); return; }
  if (n > U.length) toast("Nur " + U.length + " Wochen ohne Pause im Zeitraum");
  const N = Math.min(n, U.length), day = i => S_(D(U[i]) + wd - 1);
  const ok = i => { const d = day(i), ws = weekStatus(d); return !(ws === "ruhig" && s.quiet !== "ja") && !(s.noFerien && ferienOn(d)) && !FEIER[d]; };
  const taken = new Set(), idx = [];
  for (let k = 0; k < N; k++){
    let i = Math.min(U.length - 1, Math.floor((k + 0.5) * U.length / N));
    if (mv && !ok(i)){ for (let dd = 1; dd < U.length; dd++){ const c = [i - dd, i + dd].find(j => j >= 0 && j < U.length && !taken.has(j) && ok(j)); if (c != null){ i = c; break; } } }
    if (taken.has(i)) continue; taken.add(i); idx.push(i);
  }
  const out = idx.sort((a, b) => a - b).map((i, k) => ({id:"__c"+k, seriesId:s.id, title:s.name, date:day(i), start, dur:s.dur||90, room:s.room||"", theme:s.theme||"", hybrid:!!s.hybrid, kitchenClean:!!s.kitchenClean, excl:!!s.excl, refs:s.refs||[], sebAuto:!!(s.hybrid && s.sebAuto), status:"Option", kind:"va"}));
  const iss = computeIssues(evList().concat(out));
  CANDS = out.map(c => ({c, iss: iss.get(c.id)||[]}));
  $("#cands").innerHTML = CANDS.length ? CANDS.map((x,i) => { const bad = x.iss.some(z => z.l==="err" || z.t === OPEN_TXT); return `<div class="cand"><input type="checkbox" id="cand${i}" ${bad?"":"checked"} aria-label="Vorschlag übernehmen"><label for="cand${i}"><b class="t">${WD[wdOf(x.c.date)]} ${fmtY(x.c.date)} ${esc(start)}</b> <span class="notes">KW ${isoWeek(x.c.date)[1]} · ${esc(weekStatus(x.c.date))}</span><div class="iss">${x.iss.map(z => `<span class="lv ${z.l}">${esc(z.t)}</span>`).join(" ")}</div></label></div>`; }).join("") + `<div style="margin-top:10px"><button class="btn primary" data-take="1">Ausgewählte als Option anlegen</button></div>` : `<div class="empty">Keine passenden Termine im Zeitraum.</div>`;
}
async function takeCands(){
  const pick = CANDS.filter((x,i) => $("#cand"+i) && $("#cand"+i).checked);
  let n = 0;
  for (const x of pick){ const id = newId("events"); const o = Object.assign({}, x.c, {id}); if (await put("events", id, o)){ S.events[id] = o; n++; } }
  toast(n + " Optionen angelegt"); closeDrawer(); render();
}

/* ---------- Sicherung: Backup-Datei, Offline-Version, Einspielen ---------- */
const BK_FORMAT = "survivors-home-programmplaner-backup", BK_COLS = ["events","series","referents","absences","rounds","msgs"];
const BK_LBL = {events:"Termine", series:"Reihen", referents:"Referenten", absences:"Abwesenheiten", rounds:"Anfrage-Runden", msgs:"Nachrichten"};
const FONT_URL = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Inter:wght@400;500;700&display=swap";
const localIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,19); };
const bkStamp = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()) + "_" + pad(d.getHours()) + pad(d.getMinutes()); };
const bkWhen = s => s ? fmtY(s.slice(0,10)) + (s.length > 10 ? ", " + s.slice(11,16) + " Uhr" : "") : "–";
const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o,k) => { if (v[k] !== undefined) o[k] = sortKeys(v[k]); return o; }, {}) : v;
const bkNorm = o => { const c = Object.assign({}, o); delete c.id; return JSON.stringify(sortKeys(c)); };
function backupObj(){
  const c = {}; BK_COLS.forEach(k => c[k] = JSON.parse(JSON.stringify(S[k] || {})));
  return {format:BK_FORMAT, version:1, created:localIso(), source: OFFLINE ? "offline" : "online", collections:c,
    meta:{accepted:{items:JSON.parse(JSON.stringify(S.accepted || {}))}, weeks:{status:JSON.parse(JSON.stringify(S.weeks || {}))}, settings:JSON.parse(JSON.stringify(S.settings || {})), stays:{items:JSON.parse(JSON.stringify(S.stays || {})), fairs:JSON.parse(JSON.stringify(S.fairs || {}))}, ...(S.websync ? {websync:JSON.parse(JSON.stringify(S.websync))} : {})}};
}
const validBackup = b => !!(b && b.format === BK_FORMAT && b.collections && b.collections.events);
function applyBackupLocal(b){
  BK_COLS.forEach(k => { const m = {}; Object.entries((b.collections || {})[k] || {}).forEach(([id, o]) => { const x = normRooms(Object.assign({}, o)); x.id = id; m[id] = x; }); S[k] = m; });
  S.accepted = Object.assign({}, ((b.meta || {}).accepted || {}).items || {}); S.weeks = Object.assign({}, ((b.meta || {}).weeks || {}).status || {}); S.loaded = true;
  if ((b.meta || {}).websync){ S.websync = b.meta.websync; S.wsLoaded = true; }
  S.settings = Object.assign({}, (b.meta || {}).settings || {}); applySettings();
  { const st = (b.meta || {}).stays || {}; S.stays = Object.assign({}, st.items || {}); S.fairs = Object.assign({}, st.fairs || {}); }
}
async function saveFile(name, text, mime){
  if (downloads){ try { const r = await downloads.save({filename:name, data:text}); return !!(r && r.status === "saved"); } catch(e){ if (e && e.code === "cancelled") return false; } }
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type: mime || "application/octet-stream"})); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return true; }
  catch(e){ toast("Speichern nicht möglich"); return false; }
}
/* Offline-Version: der Planer selbst (gleicher Programmcode) plus eingebettete Daten als eine HTML-Datei */
function offlineHtml(b){
  const data = JSON.stringify(b).replace(/</g, "\\u003c");
  const body = SHP_HEAD + `<main id="app"><div class="empty">Die Offline-Version wird geladen …</div></main><div id="scrim" hidden></div><div id="qtip" role="tooltip" hidden></div><div id="zpop" role="dialog" aria-label="Konflikt" hidden></div><aside id="drawer" hidden aria-label="Bearbeiten"></aside><div id="toast" hidden role="status"></div>`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SURVIVORS HOME Programmplaner (offline)</title><link rel="stylesheet" href="${FONT_URL}"><style>${SHP_CSS}</style></head><body>${body}<script>window.__SHP_OFFLINE=true;window.__SHP_DATA=${data};<\/script><script>${SHP_SRC}<\/script></body></html>`;
}
/* Offline: Zwischenstand im Browser sichern, Hinweisleiste */
function offStore(){ try { localStorage.setItem("shp-offline", JSON.stringify({savedAt:localIso(), dirty:OFF.dirty, src:OFF.src, data:backupObj()})); } catch(e){} }
function offTouch(){ if (!OFFLINE) return; OFF.dirty++; offStore(); offBanner(); }
function offBanner(){ if (!OFFLINE) return; const b = $("#banner"); if (!b) return; b.hidden = false; b.className = "offbar";
  b.innerHTML = `<b>Offline-Version</b> – ohne gemeinsame Datenbank, Änderungen nur in dieser Datei/diesem Browser · ${OFF.src ? "Daten: " + esc(OFF.src) : "noch keine Daten geladen"} · ${OFF.dirty ? `<span class="offd">${OFF.dirty} ungespeicherte Änderung${OFF.dirty === 1 ? "" : "en"}</span>` : "alles als Datei gespeichert"} <button class="btn sm" data-view="sicherung">Sicherung</button>`; }
function offlineInit(){
  if (TEAM){ const t = window.__SHP_DATA || null; if (validBackup(t)) applyBackupLocal(t); else S.loaded = true; MB.mode = "woche"; MB.day = todayStr(); MB.scrollTo = MB.day; render(); return; }
  let b = window.__SHP_DATA || null, src = b ? "eingebettet, Stand " + bkWhen(b.created) : "", dirty = 0, auto = null;
  try { auto = JSON.parse(localStorage.getItem("shp-offline") || "null"); } catch(e){}
  if (auto && validBackup(auto.data) && auto.dirty && (!b || (auto.savedAt || "") > (b.created || ""))){ b = auto.data; dirty = auto.dirty; src = (auto.src ? auto.src + " + " : "") + "Zwischenstand im Browser vom " + bkWhen(auto.savedAt); }
  if (validBackup(b)){ applyBackupLocal(b); OFF.src = src; OFF.dirty = dirty; } else { S.loaded = true; UI.view = "sicherung"; }
  offBanner(); render();
  window.addEventListener("beforeunload", e => { if (OFF.dirty){ e.preventDefault(); e.returnValue = ""; } });
}
/* Unterschiede Backup ↔ aktueller Stand */
function bkDiff(b){
  const out = {cols:{}};
  BK_COLS.forEach(k => { const cur = S[k] || {}, inc = (b.collections || {})[k] || {}, nu = [], ch = [], gone = [];
    for (const [id, o] of Object.entries(inc)){ const x = normRooms(Object.assign({}, o)); x.id = id; if (!cur[id]) nu.push(x); else if (bkNorm(cur[id]) !== bkNorm(x)) ch.push(x); }
    for (const id of Object.keys(cur)) if (!inc[id]) gone.push(cur[id]);
    out.cols[k] = {nu, ch, gone}; });
  const wk = ((b.meta || {}).weeks || {}).status || {}, cw = S.weeks || {};
  out.weeks = [...new Set(Object.keys(wk).concat(Object.keys(cw)))].filter(k => (wk[k] || "") !== (cw[k] || "")).length;
  out.acc = JSON.stringify(sortKeys(((b.meta || {}).accepted || {}).items || {})) !== JSON.stringify(sortKeys(S.accepted || {}));
  out.set = !!(b.meta || {}).settings && JSON.stringify(sortKeys(b.meta.settings)) !== JSON.stringify(sortKeys(S.settings || {})); /* ältere Backups ohne Einstellungen: nicht anfassen */
  out.stays = !!(b.meta || {}).stays && JSON.stringify(sortKeys({i:b.meta.stays.items || {}, f:b.meta.stays.fairs || {}})) !== JSON.stringify(sortKeys({i:S.stays || {}, f:S.fairs || {}})); /* ältere Backups ohne Übernachtungen: nicht anfassen */
  return out;
}
const BK_F = [["date","Datum",v => v ? fmtY(v) : "–"],["start","Start",v => v || "–"],["dur","Dauer",v => v ? v + " Min" : "–"],["room","Raum",v => v || "–"],["status","Status",v => v || "–"],["title","Titel",v => v || "–"]];
function bkEvLine(e, tag){
  let det = ""; const cur = S.events[e.id];
  if (tag === "geändert" && cur){ const f = BK_F.filter(([k]) => (cur[k] ?? "") !== (e[k] ?? "")).map(([k, l, fm]) => l + " " + esc(fm(cur[k])) + " → " + esc(fm(e[k])));
    det = f.length ? " · " + f.join(" · ") : " · sonstige Angaben (Notiz, Referenten, Zeiten …)"; }
  return `<li><span class="lv ${tag === "nur online" ? "warn" : "info"}">${tag}</span> ${e.date ? fmtY(e.date) : ""} ${esc(e.start || "")} <b>${esc(evName(e))}</b>${det}</li>`;
}
function viewSicherung(){
  const help = `<b>Sicherung</b><ul>${OFFLINE ? `<li>Dies ist die <b>Offline-Version</b>: Sie läuft ohne Claude im Browser und prüft mit denselben Regeln wie das Online-Tool. Es gibt keine gemeinsame Datenbank – jede Kopie ist für sich.</li><li><b>Backup-Datei laden</b>: eine JSON-Sicherung öffnen (ersetzt den Stand in dieser Version).</li><li><b>Als Backup-Datei speichern</b>: aktuellen Stand als JSON sichern. Zusätzlich wird nach jeder Änderung ein Zwischenstand im Browser gehalten.</li><li>Zurück ins Online-Tool: dort unter „Einstellungen“ → „Sicherung“ → „Backup einspielen“.</li><li>Nicht verfügbar: Auswertung von Antwortmails durch Claude.</li>` : `<li><b>Backup herunterladen</b>: vollständiger Stand als JSON-Datei (alle Termine, Reihen, Referenten, Nachrichten, Abwesenheiten, Wochenstatus, akzeptierte Konflikte).</li><li><b>Offline-Version herunterladen</b>: der Planer als eine HTML-Datei mit dem aktuellen Stand – öffnet per Doppelklick im Browser, ohne Claude. Bitte nach größeren Änderungen am Tool neu herunterladen.</li><li><b>Backup einspielen</b>: zeigt die Unterschiede zwischen Datei und aktuellem Stand; nach Bestätigung werden sie übernommen. Vorher wird automatisch der aktuelle Stand als Datei gesichert.</li>`}</ul>`;
  const card = (t, inner) => `<section class="bkc"><h3>${t}</h3>${inner}</section>`;
  let html = `${setNav()}<div class="head"><h2>Sicherung ${qh(help)}</h2></div><div class="bkg">`;
  if (OFFLINE){
    html += card("Stand dieser Offline-Version", `<p>${OFF.src ? "Daten: " + esc(OFF.src) : "Noch keine Daten geladen."}</p><p>${OFF.dirty ? `<span class="lv warn">${OFF.dirty} ungespeicherte Änderung${OFF.dirty === 1 ? "" : "en"}</span> – bitte als Backup-Datei speichern.` : `<span class="lv info">alles als Datei gespeichert</span>`}</p>`)
      + card("Backup-Datei laden", `<p>JSON-Sicherung aus dem Online-Tool oder aus dieser Offline-Version öffnen. Der Stand hier wird dabei ersetzt.</p><input type="file" id="bkLoad" accept=".json,application/json">`)
      + card("Speichern", `<p><button class="btn primary" data-bk="json">Als Backup-Datei speichern</button></p><p><button class="btn" data-bk="html">Offline-Version mit aktuellem Stand speichern</button></p><p class="notes">Zurück ins Online-Tool: dort „Einstellungen“ → „Sicherung“ → „Backup einspielen“ und die gespeicherte JSON-Datei wählen.</p>`);
  } else {
    html += card("Backup herunterladen", `<p>Vollständiger Stand als JSON-Datei – zum Aufbewahren (z. B. OneDrive) und zum Wiederherstellen.</p><p><button class="btn primary" data-bk="json">Backup herunterladen</button></p>`)
      + card("Offline-Version herunterladen", `<p>Der Planer als eine HTML-Datei mit dem aktuellen Stand. Öffnet per Doppelklick im Browser, ohne Claude: Wochenansicht, Bearbeiten, Prüfregeln und Alternativen funktionieren; es fehlen nur die gemeinsame Datenbank und die Auswertung von Antwortmails.</p><p><button class="btn primary" data-bk="html">Offline-Version herunterladen</button></p>`)
      + card("Backup einspielen", `<p>Eine JSON-Sicherung (z. B. aus der Offline-Version) zurück in die gemeinsame Datenbank übernehmen. Zuerst werden die Unterschiede angezeigt.</p><input type="file" id="bkFile" accept=".json,application/json">`)
      + card("Team-Seite fürs Handy", `<p>Mobile Monatsansicht als eigene Web-App: <a href="${TEAM_URL}" target="_blank" rel="noopener">${TEAM_URL.replace("https://","")}</a>. Die Daten liegen dort nur verschlüsselt; geöffnet wird mit dem Team-Passwort. Aktualisierung automatisch (werktags 9–19 Uhr alle 2 Std., täglich ca. 5 Uhr).</p>
        <p>${S.teamPass ? `<span class="lv info">Passwort gesetzt${S.teamSet ? " am " + esc(bkWhen(S.teamSet)) : ""}</span> <details style="display:inline-block"><summary class="notes">anzeigen</summary><code>${esc(S.teamPass)}</code></details>` : `<span class="lv warn">noch kein Passwort – Team-Seite wird nicht erzeugt</span>`}</p>
        <p><input class="in" type="text" id="teamPw" autocomplete="off" placeholder="neues Passwort (mind. 12 Zeichen)" style="width:100%"></p><p><button class="btn primary" data-bk="teampw">Passwort speichern</button></p>
        <p class="notes">Lang und nicht erratbar wählen (z. B. vier zufällige Wörter). Nach einer Änderung gilt das neue Passwort ab der nächsten Aktualisierung; alle müssen es dann neu eingeben. Lesbar für alle mit Zugriff auf diesen Planer.</p>`);
  }
  html += `</div>`;
  const imp = UI.imp;
  if (imp && !OFFLINE){ const d = imp.diff, n = k => d.cols[k];
    const rows = BK_COLS.map(k => `<tr><td>${BK_LBL[k]}</td><td>${n(k).nu.length}</td><td>${n(k).ch.length}</td><td>${n(k).gone.length}</td></tr>`).join("");
    const sum = BK_COLS.reduce((a, k) => a + n(k).nu.length + n(k).ch.length, 0), gone = BK_COLS.reduce((a, k) => a + n(k).gone.length, 0);
    const ev = n("events"), lines = [...ev.nu.map(e => bkEvLine(e, "neu")), ...ev.ch.map(e => bkEvLine(e, "geändert")), ...ev.gone.map(e => bkEvLine(e, "nur online"))];
    html += `<section class="bkc bki"><h3>Einspielen: ${esc(imp.name)} <span class="notes">(Stand der Datei: ${esc(bkWhen(imp.b.created))}, ${imp.b.source === "offline" ? "aus der Offline-Version" : "aus dem Online-Tool"})</span></h3>
      <table class="bkt"><thead><tr><th>Bereich</th><th>neu in der Datei</th><th>geändert</th><th>nur online (fehlt in der Datei)</th></tr></thead><tbody>${rows}<tr><td>Wochenstatus</td><td colspan="3">${d.weeks ? d.weeks + " Wochen abweichend" : "gleich"}</td></tr><tr><td>Akzeptierte Konflikte</td><td colspan="3">${d.acc ? "abweichend" : "gleich"}</td></tr><tr><td>Einstellungen</td><td colspan="3">${(imp.b.meta || {}).settings ? (d.set ? "abweichend" : "gleich") : "nicht in der Datei (bleiben unverändert)"}</td></tr><tr><td>Übernachtungen und Messen</td><td colspan="3">${(imp.b.meta || {}).stays ? (d.stays ? "abweichend" : "gleich") : "nicht in der Datei (bleiben unverändert)"}</td></tr></tbody></table>
      ${lines.length ? `<details${lines.length <= 40 ? " open" : ""}><summary>Termine im Einzelnen (${lines.length})</summary><ul class="bkl">${lines.slice(0, 400).join("")}</ul></details>` : `<p class="notes">Keine Unterschiede bei den Terminen.</p>`}
      <div class="bko"><label class="cb"><input type="checkbox" id="impNew" checked> Neue übernehmen</label><label class="cb"><input type="checkbox" id="impCh" checked> Geänderte übernehmen (Stand der Datei gewinnt)</label><label class="cb"><input type="checkbox" id="impDel"> Was in der Datei fehlt, online löschen (${gone})</label><label class="cb"><input type="checkbox" id="impMeta" checked${d.weeks || d.acc || d.set || d.stays ? "" : " disabled"}> Wochenstatus, akzeptierte Konflikte, Einstellungen, Übernachtungen und Messen übernehmen</label></div>
      <p class="notes">Achtung: Wurde ein Termin seit dem Backup online <i>und</i> in der Datei geändert, gewinnt beim Übernehmen die Datei. Vor dem Einspielen wird der aktuelle Online-Stand automatisch als Datei gesichert.</p>
      <p><button class="btn primary" data-bk="apply"${sum || gone || d.weeks || d.acc || d.set || d.stays ? "" : " disabled"}>Einspielen</button> <button class="btn" data-bk="cancel">Abbrechen</button></p></section>`; }
  return html;
}
async function bkApply(){
  const imp = UI.imp; if (!imp || !db){ toast("Einspielen nur im Online-Tool möglich"); return; }
  const o = {nu:$("#impNew").checked, ch:$("#impCh").checked, del:$("#impDel").checked, meta:$("#impMeta").checked && !$("#impMeta").disabled};
  toast("Zuerst wird der aktuelle Stand gesichert …");
  if (!await saveFile(`Programmplaner_vor_Einspielen_${bkStamp()}.json`, JSON.stringify(backupObj(), null, 1), "application/json")){ toast("Abgebrochen: aktueller Stand wurde nicht gesichert"); return; }
  let ok = 0, fail = 0; const d = imp.diff;
  for (const k of BK_COLS){ const c = d.cols[k];
    for (const x of [].concat(o.nu ? c.nu : [], o.ch ? c.ch : [])){ if (await put(k, x.id, x)){ S[k][x.id] = x; ok++; } else fail++; }
    if (o.del) for (const x of c.gone){ await del(k, x.id); delete S[k][x.id]; ok++; } }
  if (o.meta){ const wk = ((imp.b.meta || {}).weeks || {}).status || {}, ac = ((imp.b.meta || {}).accepted || {}).items || {};
    try { await db.doc("meta/weeks").set({status:wk}); S.weeks = Object.assign({}, wk); await db.doc("meta/accepted").set({items:ac}); S.accepted = Object.assign({}, ac);
      if ((imp.b.meta || {}).settings){ await db.doc("meta/settings").set(imp.b.meta.settings); S.settings = Object.assign({}, imp.b.meta.settings); applySettings(); }
      if ((imp.b.meta || {}).stays){ const st = imp.b.meta.stays; await db.doc("meta/stays").set({items:st.items || {}, fairs:st.fairs || {}, set:localIso()}); S.stays = Object.assign({}, st.items || {}); S.fairs = Object.assign({}, st.fairs || {}); } ok++; } catch(e){ fail++; } }
  UI.imp = null; render(); toast(fail ? ok + " übernommen, " + fail + " fehlgeschlagen" : ok + " Änderungen eingespielt");
}
let TEAM_URL = "https://belegung.survivors-home.de/team/"; /* Einstellungen */
async function bkAction(k){
  if (k === "teampw"){ const v = ($("#teamPw").value || "").trim(); if (v.length < 12){ toast("Mindestens 12 Zeichen"); return; } if (!db){ toast("Nur im Online-Tool möglich"); return; }
    try { await db.doc("meta/team").set({pass:v, set:localIso()}); toast("Team-Passwort gespeichert – gilt ab der nächsten Aktualisierung"); } catch(e){ toast("Passwort nicht gespeichert"); } return; }
  if (k === "json"){ const r = await saveFile(`Programmplaner_Backup_${bkStamp()}.json`, JSON.stringify(backupObj(), null, 1), "application/json");
    if (r){ toast("Backup gespeichert"); if (OFFLINE){ OFF.dirty = 0; offStore(); offBanner(); render(); } } return; }
  if (k === "html"){ if (!SHP_SRC || !SHP_CSS){ toast("Offline-Version hier nicht erzeugbar"); return; } const r = await saveFile(`Programmplaner_offline_${bkStamp()}.html`, offlineHtml(backupObj()), "text/html"); if (r) toast("Offline-Version gespeichert"); return; }
  if (k === "apply") return bkApply();
  if (k === "cancel"){ UI.imp = null; return render(); }
}
async function bkReadFile(input){
  const f = input.files && input.files[0]; if (!f) return null;
  try { const b = JSON.parse(await f.text()); if (!validBackup(b)){ toast("Keine Backup-Datei des Programmplaners"); return null; } return {b, name:f.name}; }
  catch(e){ toast("Datei nicht lesbar"); return null; }
  finally { input.value = ""; }
}

/* ---------- CSV ---------- */
async function exportCsv(){
  const rows = [["Datum","Wochentag","Start","Ende","Veranstaltung","Themenbereich","Raum","Hybrid","Status","Online bis","Referenten","Prüfung"]];
  filtered().forEach(e => { const sp = span(e); rows.push([fmtY(e.date), WD[wdOf(e.date)], e.allDay?"ganztägig":(e.start||""), sp&&!e.allDay?m2t(sp.e):"", evName(e), e.theme||"", e.room||"", e.hybrid?"ja":"", e.status||"", e.kind==="va"?fmtY(S_(D(e.date)-ON_DAYS)):"", (e.refs||[]).map(r => (S.referents[r]||{}).name).filter(Boolean).join(", "), issuesOf(e.id).map(x => x.t).join(" | ")]); });
  const csv = "﻿" + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  if (await saveFile(`Programmplanung_${YEAR}.csv`, csv, "text/csv")) toast("CSV gespeichert");
}

/* ---------- Ereignisse ---------- */
document.addEventListener("click", async ev => {
  if (ev.target.closest && ev.target.closest("a.clink")) return;
  { const a = ev.target.closest && ev.target.closest("[data-invite]");
    if (a){ const info = inviteInfo(draftEvent()); if (info.err){ ev.preventDefault(); toast(info.err); return; }
      a.href = info.url; if (info.miss.length) toast("Ohne E-Mail, bitte in Outlook ergänzen: " + info.miss.join(", ")); else if (!info.to.length) toast("Keine Referenten mit E-Mail – Teilnehmer in Outlook eintragen"); return; } }
  const t = ev.target.closest("[data-sentyes],[data-sentno],[data-zone],[data-acc],[data-accg],[data-newround],[data-amode],[data-pfilt],[data-pmail],[data-pcopy],[data-psent],[data-pans],[data-pevs],[data-pparse],[data-papply],[data-psave],[data-rmail],[data-rcopy],[data-rsent],[data-rremind],[data-rans],[data-rhist],[data-aparse],[data-asave],[data-aapply],[data-delavail],[data-ydet],[data-sernav],[data-evnav],[data-openser],[data-back],[data-quick],[data-view],[data-wk],[data-goweek],[data-ev],[data-new],[data-wnav],[data-wtoday],[data-prback],[data-dayweek],[data-ytoday],[data-alt],[data-altgo],[data-altset],[data-altcopy],[data-bk],[data-ser],[data-newser],[data-ref],[data-newref],[data-close],[data-save],[data-del],[data-delok],[data-dup],[data-gen],[data-take],[data-csv],[data-delabs],[data-serf],[data-lpast],[data-ferdel],[data-ferdef],[data-fxdel],[data-setdef],[data-stay],[data-stayed],[data-staybk],[data-staypast],[data-staydel],[data-faired],[data-fairdel]");
  const guard = () => { if (UI.drawer && UI.dirty && !UI.dirtyOk){ UI.dirtyOk = true; clearTimeout(UI.dirtyT); UI.dirtyT = setTimeout(() => UI.dirtyOk = false, 4000); toast("Ungespeicherte Änderungen – zum Verwerfen erneut klicken"); return true; } return false; };
  if (!t) {
    if (UI.drawer && !ev.target.closest("#drawer") && !ev.target.closest("input,select,textarea,label,button,a,summary,.qh,#qtip") && !guard()) closeDrawer();
    return;
  }
  const ds = t.dataset;
  if (!t.closest("#drawer") && (ds.ev || ds.ser || ds.ref || ds.new != null || ds.newser || ds.newref) && guard()) return;
  if (ds.zone != null){ return zonePop(+ds.zone, t); }
  if (ds.newround){ const id = newId("rounds"), ty = ds.newround, base = (ty === "term" ? "Terminabfrage " : "Verfügbarkeit ") + YEAR; const o = {id, type:ty, name:base + (Object.values(S.rounds||{}).some(x => rdType(x) === ty) ? " (" + todayStr().slice(5).split("-").reverse().join(".") + ")" : ""), created:new Date().toISOString().slice(0,19), by:senderName()};
    if (await put("rounds", id, o) || !db){ S.rounds = Object.assign({}, S.rounds, {[id]:o}); UI.round = id; toast("Runde angelegt"); render(); } return; }
  if (ds.rmail || ds.rcopy || ds.rremind){ if (!senderName()) return toast("Bitte oben den Absender wählen");
    const r = S.referents[ds.rmail || ds.rcopy || ds.rremind]; const m = roundText(r, senderName(), S.rounds[UI.round], !!ds.rremind);
    if (ds.rmail || (ds.rremind && r.email)) return openMail(r.email, m.subj, m.body);
    const ok = await copyText(m.subj + "\n\n" + m.body); toast(ok ? "Text kopiert – zum Vorlesen, Ausdrucken oder Einfügen" : "Kopieren nicht möglich"); return; }
  if (ds.rsent){ if (!senderName()) return toast("Bitte oben den Absender wählen"); const r = S.referents[ds.rsent], rd = S.rounds[UI.round]; if (!r || !rd) return;
    const late = roundState(r, rd).k === "late", m = roundText(r, senderName(), rd, late);
    await logMsg({round: rd.id, ref: r.id, dir:"out", channel: ds.ch, subject: m.subj, text: m.body}); toast((ds.ch === "Mail" ? "Als versendet" : ds.ch === "Telefon" ? "Anruf" : "Übergabe") + " im Verlauf eingetragen"); return; }
  if (ds.rans){ UI.parse = null; openDrawer("ans", ds.rans); return; }
  if (ds.sentno){ closeSentAsk(); toast("Okay – „versendet“ in der Zeile klicken, sobald die Mail raus ist"); return; }
  if (ds.sentyes){ closeSentAsk(); if (!senderName()) return toast("Bitte oben den Absender wählen"); const r = S.referents[ds.sentyes]; if (r) await pSent(r, "Mail"); return; }
  if (ds.amode){ UI.anfMode = ds.amode; return render(); }
  if (ds.pfilt){ UI.pFilt = ds.pfilt; return render(); }
  if (ds.pevs){ UI.pOpen = UI.pOpen === ds.pevs ? null : ds.pevs; return render(); }
  if (ds.pmail || ds.pcopy){ if (!senderName()) return toast("Bitte oben den Absender wählen"); const r = S.referents[ds.pmail || ds.pcopy], m = r && pMail(r, senderName()); if (!m) return;
    if (ds.pmail && r.email){ await openMailRich(r.email, m.subj, m.body); return askSent(r, m); }
    const ok = await copyRich(mailHtml(m.body), m.subj + "\n\n" + m.body); toast(ok ? "Text mit Formatierung kopiert – Betreff: „" + m.subj + "“" : "Kopieren nicht möglich"); return; }
  if (ds.psent){ if (!senderName()) return toast("Bitte oben den Absender wählen"); const r = S.referents[ds.psent]; if (r) await pSent(r, ds.ch); return; }
  if (ds.pans){ UI.pPre = null; UI.pSum = ""; UI.pText = ""; openDrawer("pans", ds.pans); return; }
  if (ds.pparse) return pParse();
  if (ds.papply) return pApply(false);
  if (ds.psave) return pApply(true);
  if (ds.rhist){ UI.histOpen = UI.histOpen === ds.rhist ? null : ds.rhist; return render(); }
  if (ds.aparse) return ansParse();
  if (ds.asave) return ansSave(false);
  if (ds.aapply) return ansApply();
  if (ds.delavail){ const [rid, i] = ds.delavail.split("|"); const r = Object.assign({}, S.referents[rid]); r.avail = (r.avail||[]).filter((_,k) => k !== +i); if (await put("referents", rid, r)){ S.referents[rid] = r; openDrawer("ref", rid); render(); } return; }
  if (ds.accg){ ev.stopPropagation(); const on = ds.on === "1", seen = new Set(), mem = []; JSON.parse(ds.accg).forEach(([id, t]) => accMembers(id, t).forEach(q => { const k = q.id + "|" + q.t; if (!seen.has(k)){ seen.add(k); mem.push(q); } })); await setAcc(mem, on); return; }
  if (ds.acc){ ev.stopPropagation(); const [id, ...rest] = JSON.parse(ds.acc); const on = ds.on === "1"; await setAcc(accMembers(id, rest[0]), on); const zp = $("#zpop"); if (zp) zp.hidden = true; return; }
  if (ds.view) return go(ds.view);
  if (ds.serf){ UI.serFilter = ds.serf; return render(); }
  if (ds.lpast != null){ UI.lPast = ds.lpast === "1"; return render(); }
  if (ds.ydet != null){ UI.yOpen = null; UI.yearDetail = ds.ydet === "1"; try { localStorage.setItem("shp-ydet", ds.ydet); } catch(e){} return render(); }
  if (ds.evnav != null || ds.sernav != null || ds.openser || ds.back){
    if (UI.dirty && !UI.dirtyOk){ UI.dirtyOk = true; clearTimeout(UI.dirtyT); UI.dirtyT = setTimeout(() => UI.dirtyOk = false, 4000); toast("Ungespeicherte Änderungen – zum Verwerfen erneut klicken"); return; }
    if (ds.sernav){ if (!S.series[ds.sernav]) return; return openDrawer("ser", ds.sernav); }
    if (ds.evnav){ const e = S.events[ds.evnav]; if (!e) return; openDrawer("ev", e.id); UI.week = e.date; if (UI.dayOnly) UI.dayOnly = e.date; UI.scrollSel = true; return render(); }
    if (ds.openser){ snapSerOrder(ds.openser); const from = UI.drawer && UI.drawer.id; return openDrawer("ser", ds.openser, null, from ? {kind:"ev", id:from} : null); }
    if (ds.back){ const b = UI.drawer && UI.drawer.back; if (b) return openDrawer(b.kind, b.id); return closeDrawer(); }
  }
  if (ds.quick != null){ UI.serQuick = ds.quick === "1"; return render(); }
  if (ds.wk){ const order = ["belebt","ruhig","pause"]; return setWeek(ds.wk, order[(order.indexOf(S.weeks[ds.wk]||"belebt")+1)%3]); }
  if (ds.goweek){ UI.week = ds.goweek; return go("woche"); }
  if (ds.wnav){ UI.week = S_(D(UI.week) + +ds.wnav); return render(); }
  if (ds.prback) return closeDrawer();
  if (ds.dayweek){ UI.dayOnly = null; UI.view0 = null; return render(); }
  if (ds.wtoday){ UI.week = todayStr(); return render(); }
  if (ds.ytoday) return yearToday();
  if (ds.alt){ UI.altOff = !UI.altOff; return render(); }
  if (ds.altgo){ altGo(ds.altgo); return; }
  if (ds.altset){ const [d, st] = ds.altset.split("|"), f = $("#f"); if (!f) return;
    const sd = f.querySelector('input[name="date"]'), ss = f.querySelector('input[name="start"]');
    if (sd){ sd.value = d; sd.dispatchEvent(new Event("input", {bubbles:true})); }
    if (ss){ ss.value = st; ss.dispatchEvent(new Event("input", {bubbles:true})); }
    altGo(d); toast("Übernommen: " + WD[wdOf(d)] + " " + fmtY(d) + ", " + st + " – noch nicht gespeichert"); return; }
  if (ds.altcopy){ const tab = ds.altcopy === "tab", c = tab ? altCopyTable() : altCopyData(); const ok = c ? await copyRich(c.html, c.text) : false; toast(ok ? (tab ? "Mögliche Zeiten als Tabelle kopiert" : "Mögliche Zeiten mit Formatierung kopiert") : "Kopieren nicht möglich"); return; }
  if (ds.bk) return bkAction(ds.bk);
  if (ds.ev === "__draft") return;
  /* Prüfbericht: Termin rechts öffnen, links den betroffenen Tag zeigen (wie Wochenansicht, nur dieser Tag) */
  if (ds.ev && ((UI.view === "pruefung" && t.closest(".iitem")) || (UI.view === "liste" && t.closest("tr[data-ev]"))) && S.events[ds.ev]){ const e = S.events[ds.ev];
    UI.retY = UI.view === "liste" ? window.scrollY : null; UI.view0 = UI.view; UI.view = "woche"; UI.week = e.date; UI.dayOnly = e.date; window.scrollTo(0,0); openDrawer("ev", e.id); UI.week0 = null; return render(); }
  if (ds.ev) return openDrawer("ev", ds.ev);
  if (ds.new) return openDrawer("ev", null, ds.new.length === 10 ? {date:ds.new} : {});
  if (ds.ser){ snapSerOrder(ds.ser); return openDrawer("ser", ds.ser); }
  if (ds.newser) return openDrawer("ser", null);
  if (ds.ref) return openDrawer("ref", ds.ref);
  if (ds.newref) return openDrawer("ref", null);
  if (ds.close) return closeDrawer();
  if (ds.save) return saveDrawer(ds.save, ds.then);
  if (ds.del){ t.hidden = true; $("[data-delok]").hidden = false; return; }
  if (ds.delok){ const d = UI.drawer, col = {ev:"events",ser:"series",ref:"referents"}[d.kind], map = {ev:S.events,ser:S.series,ref:S.referents}[d.kind]; await del(col, d.id); delete map[d.id]; closeDrawer(true); toast("Gelöscht"); return render(); }
  if (ds.dup){ const from = UI.drawer.id, o = Object.assign({}, S.events[from] || {}, draftEvent()); closeDrawer(true, true); delete o.id; o.start = ""; o.invSent = false; delete o.web; o.__dup = from; openDrawer("ev", null, o); const st = $("#drawer input[name=start]"); if (st && !st.disabled) st.focus(); return; }
  if (ds.gen) return genCands();
  if (ds.take) return takeCands();
  if (ds.csv) return exportCsv();
  if ("stay" in ds){ UI.stayEdit = ds.stay; UI.stayPast = !!(S.stays[ds.stay] && S.stays[ds.stay].to < todayStr()); UI.stayBack = UI.view === "woche" ? "woche" : null; UI.stayY = window.scrollY; return go("uebernachtung"); }
  if ("stayed" in ds){ UI.stayEdit = ds.stayed || null; if (!UI.stayEdit && UI.stayBack) return stayReturn(); render(); if (UI.stayEdit) window.scrollTo(0, 0); return; }
  if (ds.staypast){ UI.stayPast = ds.staypast === "1"; UI.stayEdit = null; UI.fairEdit = null; return render(); }
  if (ds.staybk){ UI.stayEdit = null; return stayReturn(); }
  if (ds.staydel){ delete S.stays[ds.staydel]; if (UI.stayEdit === ds.staydel) UI.stayEdit = null; return saveStays("Übernachtung entfernt"); }
  if ("faired" in ds){ UI.fairEdit = ds.faired || null; return render(); }
  if (ds.fairdel){ delete S.fairs[ds.fairdel]; if (UI.fairEdit === ds.fairdel) UI.fairEdit = null; return saveStays("Messe entfernt"); }
  if (ds.delabs){ await del("absences", ds.delabs); delete S.absences[ds.delabs]; return render(); }
  if (ds.ferdel){ const k = ds.ferdel; return saveSettings({ferien: FERIEN.filter(x => JSON.stringify(x) !== k)}, "Ferien entfernt"); }
  if (ds.ferdef) return saveSettings({ferien: null}, "Standardliste der Schulferien wird verwendet");
  if (ds.fxdel){ const ex = ((S.settings || {}).feierExtra || []).filter(x => x[0] !== ds.fxdel); return saveSettings({feierExtra: ex.length ? ex : null}, "Feiertag entfernt"); }
  if (ds.setdef){ const p = {}; SET_F[ds.setdef].forEach(f => p[f[0]] = null); return saveSettings(p, "Standardwerte eingestellt"); }
});
document.addEventListener("input", ev => {
  if (ev.target.classList && ev.target.classList.contains("endt")){ const f0 = ev.target.closest("#f"); if (f0) endApply(f0, ev.target, false); return; }
  const dp = ev.target.closest(".dpair");
  if (dp){ const mi = dp.querySelector('input[type="number"]'), hm = dp.querySelector(".dhm");
    if (ev.target === mi){ hm.value = fmtHM(mi.value); hm.classList.remove("bad"); }
    else { const v = parseHM(hm.value); hm.classList.toggle("bad", v === null); if (v !== null){ mi.value = v; if (mi.closest("#drawer #f")) refreshLive(); } } }
  if (ev.target.name === "count" && $("#ivShow") && UI.drawer && UI.drawer.kind === "ser"){ const f0 = ev.target.closest("#f"), b = Object.assign({}, S.series[UI.drawer.id] || {}, {count: ev.target.value, individual: !!(f0.elements.individual && f0.elements.individual.checked)}); $("#ivShow").textContent = ivText(b); }
  if (ev.target.closest("#drawer #f")){ const f0 = ev.target.closest("#f");
    if (ev.target.name === "hybrid"){ sebSync(f0, ev.target.checked); invToggle(f0); }
    { const nm0 = ev.target.name || (dp && dp.querySelector('input[type="number"]').name), iv = f0.elements.invSent;
      if (iv && iv.checked && ["date","start","dur","allDay"].includes(nm0)){ iv.checked = false; const h = f0.querySelector(".invhint"); if (h) h.textContent = "Zeit geändert – Einladung neu senden"; } } }
  if (ev.target.closest("#drawer #f")){ const nm = ev.target.name || (dp && dp.querySelector('input[type="number"]').name);
    if (UI.view !== "woche" && PREV_FIELDS.includes(nm)) weekPreview(true);
    refreshLive(); markChanges(); }
  if (ev.target.closest("#drawer #f") && ["start","dur","allDay"].includes(ev.target.name || (dp && dp.querySelector('input[type="number"]').name))) endSync(ev.target.closest("#f"));
  if (ev.target.id === "fQ"){ UI.q = ev.target.value; clearTimeout(UI.qt); UI.qt = setTimeout(() => { render(); requestAnimationFrame(() => { const q = $("#fQ"); if (q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }); }, 250); }
});
document.addEventListener("change", async ev => {
  if (ev.target.id === "sFrom" && ev.target.value){ const to = $("#sTo"); if (to && (!to.value || to.value <= ev.target.value)) to.value = S_(D(ev.target.value) + 1); return; }
  if (ev.target.id === "bkFile"){ const r = await bkReadFile(ev.target); if (r){ UI.imp = {b:r.b, name:r.name, diff:bkDiff(r.b)}; render(); } return; }
  if (ev.target.id === "bkLoad"){ const r = await bkReadFile(ev.target); if (!r) return; if (OFF.dirty && !confirm(OFF.dirty + " ungespeicherte Änderung(en) gehen verloren. Trotzdem laden?")) return;
    applyBackupLocal(r.b); OFF.src = r.name + " (Stand " + bkWhen(r.b.created) + ")"; OFF.dirty = 0; offStore(); offBanner(); UI.drawer = null; render(); toast("Backup geladen"); return; }
  if (ev.target.classList && ev.target.classList.contains("endt")) return; /* Prüfung beim Verlassen des Feldes (focusout) */
  if (ev.target.classList && ev.target.classList.contains("dhm")){ const dp = ev.target.closest(".dpair"), mi = dp.querySelector('input[type="number"]'), v = parseHM(ev.target.value);
    if (v === null){ toast("Bitte als Stunden:Minuten eingeben, z. B. 1:30"); return; }
    ev.target.value = fmtHM(v); mi.dispatchEvent(new Event("change", {bubbles:true})); return; }
  const qe = ev.target.closest(".qe");
  if (qe){ const s = S.series[qe.dataset.qs]; if (!s) return; const v = qe.value === "" ? null : Math.max(0, +qe.value);
    const o = Object.assign({}, s, {[qe.dataset.qf]: v}); if (qe.dataset.qf === "after" && (o.unconfirmed||[]).includes("after")) o.unconfirmed = o.unconfirmed.filter(x => x !== "after");
    if (await put("series", s.id, o)){ S.series[s.id] = o; recompute(); toast("Gespeichert: "+s.name); render(); } return; }
  if (ev.target.closest("#drawer #f") && ["room","roomOff","backupRoom","allDay"].includes(ev.target.name)) syncFurn($("#drawer"));
  const id = ev.target.id;
  if (id === "fSer"){ applySeries(ev.target.value); syncFurn($("#drawer")); endSync(); refreshLive(); }
  if (ev.target.closest && ev.target.closest("#drawer #f")) markChanges();
  if (id === "fSender"){ UI.sender = ev.target.value; try { localStorage.setItem("shp-sender", UI.sender); } catch(e){} render(); }
  if (id === "fRound"){ UI.round = ev.target.value; render(); }
  if (id === "fMonth"){ UI.month = ev.target.value; render(); }
  if (id === "fStatus"){ UI.status = ev.target.value; render(); }
  if (id === "fIss"){ UI.onlyIssues = ev.target.checked; render(); }
  if (id === "wkjump" && ev.target.value){ UI.week = ev.target.value; render(); }
  if (ev.target.dataset && ev.target.dataset.wksel) setWeek(ev.target.dataset.wksel, ev.target.value);
});
/* Übernachtung aus der Wochenansicht geöffnet: nach Speichern/Abbrechen zurück (v121) */
function stayReturn(){ const v = UI.stayBack || "uebernachtung"; UI.stayBack = null; UI.stayEdit = null; go(v); if (v === "woche" && UI.stayY != null) UI.restoreY = UI.stayY; }
document.addEventListener("submit", async ev => {
  ev.preventDefault();
  if (ev.target.id === "blkForm"){
    const o = {block:true, person:"", from:$("#bFrom").value, to:$("#bTo").value || $("#bFrom").value, note:$("#bNote").value.trim()};
    if (!o.from) return; if (o.to < o.from) o.to = o.from;
    const id = newId("absences"); o.id = id;
    if (await put("absences", id, o)){ S.absences[id] = o; toast("Sperrtag eingetragen"); render(); }
  }
  if (ev.target.id === "stayForm"){
    const o = {name:$("#sName").value.trim(), persons:+$("#sPers").value || 1, from:$("#sFrom").value, fromT:$("#sFromT").value || STAY_IN, to:$("#sTo").value, toT:$("#sToT").value || STAY_OUT, status:$("#sStatus").value, note:$("#sNote").value.trim()};
    if (!o.name || !o.from || !o.to) return;
    if (o.to + " " + o.toT <= o.from + " " + o.fromT){ toast("Abreise muss nach der Anreise liegen"); return; }
    const id = UI.stayEdit && S.stays[UI.stayEdit] ? UI.stayEdit : "st" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); o.id = id;
    S.stays[id] = o; UI.stayEdit = null; const cl = stayClash(o);
    await saveStays(cl.length ? "Gespeichert – überschneidet sich mit " + cl.map(stayName).join(", ") : "Übernachtung gespeichert"); if (UI.stayBack) stayReturn(); return;
  }
  if (ev.target.id === "fairForm"){
    const o = {from:$("#mFrom").value, to:$("#mTo").value || $("#mFrom").value, name:$("#mName").value.trim(), note:$("#mNote").value.trim()};
    if (!o.from || !o.name) return; if (o.to < o.from) o.to = o.from;
    const id = UI.fairEdit && S.fairs[UI.fairEdit] ? UI.fairEdit : "fa" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); o.id = id;
    S.fairs[id] = o; UI.fairEdit = null; await saveStays("Messe gespeichert"); return;
  }
  if (ev.target.id === "absForm"){
    const o = {person:$("#aPerson").value.trim(), from:$("#aFrom").value, to:$("#aTo").value || $("#aFrom").value, note:$("#aNote").value.trim()};
    if (!o.person || !o.from) return;
    const id = newId("absences"); o.id = id;
    if (await put("absences", id, o)){ S.absences[id] = o; toast("Abwesenheit eingetragen"); render(); }
  }
  if (ev.target.id === "ferForm"){
    const f = [$("#fFrom").value, $("#fTo").value || $("#fFrom").value, $("#fName").value.trim()];
    if (!f[0] || !f[2]) return; if (f[1] < f[0]) f[1] = f[0];
    return saveSettings({ferien: FERIEN.concat([f]).sort((a,b) => a[0].localeCompare(b[0]))}, "Ferien eingetragen");
  }
  if (ev.target.id === "fxForm"){
    const f = [$("#xDate").value, $("#xName").value.trim()]; if (!f[0] || !f[1]) return;
    const ex = ((S.settings || {}).feierExtra || []).filter(x => x[0] !== f[0]).concat([f]).sort((a,b) => a[0].localeCompare(b[0]));
    return saveSettings({feierExtra: ex}, "Feiertag eingetragen");
  }
  if (ev.target.id === "wkForm"){ const d = $("#wDate").value, v = $("#wVal").value; if (!d) return; await setWeek(weekKey(d), v); return toast(wkLabel(weekKey(d)) + ": " + (v === "pause" ? "Programmpause" : "ruhig")); }
  if (ev.target.id === "setForm"){
    const f = ev.target, p = {}, err = [];
    for (const [k, l, , ty, mn, mx] of SET_F[f.dataset.kind]){
      const raw = (f.elements[k].value || "").trim(); let v = raw === "" ? null : ty === "number" ? +raw : raw;
      if (v !== null && ty === "number" && (isNaN(v) || (mn !== "" && v < +mn) || (mx !== "" && v > +mx))) err.push(l + ": " + mn + "–" + mx);
      if (v !== null && ty === "time" && !/^\d\d:\d\d$/.test(v)) err.push(l + ": Uhrzeit");
      if (v !== null && String(v) === String(SET_DEF[k])) v = null;
      p[k] = v;
    }
    const g = k => p[k] !== undefined ? (p[k] === null ? SET_DEF[k] : p[k]) : setv(k);
    if (f.dataset.kind === "zeiten"){
      if (t2m(g("openFrom")) >= t2m(g("openTo"))) err.push("Kernöffnungszeit: „von“ muss vor „bis“ liegen");
      if (+g("warnWeeks") <= +g("onlineWeeks")) err.push("Vorwarnung muss mehr Wochen vorher liegen als die Online-Frist");
      if (![15, 30, 60].includes(+g("altStep"))) err.push("Raster „Mögliche Zeiten“: 15, 30 oder 60 Min");
    }
    if (err.length) return toast("Nicht gespeichert – " + err.join(" · "));
    return saveSettings(p, "Einstellungen gespeichert");
  }
});
document.addEventListener("keydown", ev => { if (ev.key === "Escape"){ const sa = document.getElementById("sentask"); if (sa && !sa.hidden){ closeSentAsk(); return; } if (UI.drawer) closeDrawer(); } });

/* ---------- Mobile Leseansicht (Handy): Tag und Woche, ohne Bearbeitung, ohne personenbezogene Angaben ---------- */
const MB = {mode:"tag", day:null};
const mobPhone = () => { try { return Math.min(screen.width, screen.height) < 600 && matchMedia("(pointer:coarse)").matches; } catch(e){ return false; } };
const mobKey = () => "shp-mob-" + (mobPhone() ? "p" : "d");
function mobInit(){ if (TEAM){ UI.mob = true; document.body.classList.add("team"); mobClass(); return; } try { localStorage.removeItem("shp-mob-p"); localStorage.removeItem("shp-mob-d"); } catch(e){} UI.mob = false; mobClass(); }
function mobClass(){ document.documentElement.classList.toggle("mob", !!UI.mob); document.body.classList.toggle("mobmode", !!UI.mob); }
function mobSet(on){ UI.mob = !!on; try { localStorage.setItem(mobKey(), on ? "1" : "0"); } catch(e){} if (on && UI.drawer) closeDrawer(); mobClass(); window.scrollTo(0,0); render(); }
/* Personennamen (Referenten, Abwesenheiten) aus Prüftexten entfernen */
function mobSan(t){
  let s = String(t || "");
  const names = Object.values(S.referents).map(r => r && r.name).filter(n => n && n.trim().length > 2).sort((a,b) => b.length - a.length);
  names.forEach(n => { s = s.split(n).join("Referent"); });
  Object.values(S.absences).map(a => a && a.person).filter(n => n && n.trim().length > 1).sort((a,b) => b.length - a.length).forEach(n => { s = s.split(n).join("Team"); });
  return s.replace(/^Hybrid nicht möglich: Team abwesend$/, "Hybrid nicht möglich: Technik-Verantwortlicher abwesend");
}
const mobMon = d => S_(D(d) - (wdOf(d)+6)%7);
/* v109 Team-Seite: Warnung bei altem Datenstand. Routine läuft 5:17 und 9:17–19:17 alle 2 h; Warnung, wenn der Stand älter als 4 h ist
   und ein geplanter Lauf (mit 30 Min Spielraum) danach hätte kommen müssen – nachts gilt der Stand von 19:17 als aktuell */
const RUNS = [[5,17],[9,17],[11,17],[13,17],[15,17],[17,17],[19,17]];
function lastRunBefore(t){ for (let k = 0; k < 3; k++){ const d0 = new Date(t.getFullYear(), t.getMonth(), t.getDate() - k);
  for (let i = RUNS.length - 1; i >= 0; i--){ const r = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), RUNS[i][0], RUNS[i][1]); if (r <= t) return r; } } return null; }
function teamStale(){
  if (!TEAM || !window.__SHP_DATA || !window.__SHP_DATA.created) return false;
  const c = new Date(window.__SHP_DATA.created), now = new Date(); if (isNaN(c)) return false;
  const lr = lastRunBefore(new Date(now.getTime() - 30*60e3));
  return now - c > 4*3600e3 && !!lr && c < lr;
}
const staleBar = () => { UI.lastStale = teamStale(); return UI.lastStale ? `<div class="tstale" role="alert">⚠ Daten nicht aktuell · Stand ${esc(bkWhen(window.__SHP_DATA.created))}</div>` : ""; };
if (TEAM){
  let hid = 0;
  document.addEventListener("visibilitychange", () => { if (document.hidden) hid = Date.now(); else if (hid && Date.now() - hid >= 3600e3) location.reload(); else if (teamStale() !== UI.lastStale) render(); });
  window.addEventListener("pageshow", ev => { if (ev.persisted && hid && Date.now() - hid >= 3600e3) location.reload(); });
  setInterval(() => { if (!document.hidden && teamStale() !== UI.lastStale) render(); }, 5*60e3);
}
/* Höhe des festen Kopfbereichs als CSS-Variable (für die klebende Raumzeile der Tagesansicht) */
function mobHeadH(){ const h = document.querySelector(".mhead.por"); document.documentElement.style.setProperty("--mhh", (h ? h.offsetHeight : 0) + "px"); }
function viewMobil(){
  if (!MB.day) MB.day = todayStr();
  if (wdOf(MB.day) === 0 && !(MB.mode === "woche" && mobPortrait())) MB.day = S_(D(MB.day) + 1); /* Tagesansicht ohne Sonntag: auf Montag */
  const d = MB.day, mon = mobMon(d), [, w] = isoWeek(d), st = S.weeks[weekKey(d)] || "belebt", por = mobPortrait();
  const wkDays = [0,1,2,3,4,5].map(i => S_(D(mon)+i));
  const lab = mobMonLab(mon), step = MB.mode === "tag" ? 1 : 7;
  const MON = MB.mode === "woche" && por; /* Hochformat: „Woche“ ist jetzt die Monatsansicht */
  const seg = `<span class="seg" role="group" aria-label="Ansicht"><button class="btn sm" data-mmode="tag" aria-pressed="${MB.mode==="tag"}">Tag</button><button class="btn sm" data-mmode="woche" aria-pressed="${MB.mode==="woche"}">${por ? "Monat" : "Woche " + w}</button></span>`;
  const upd = MB.mode === "woche" && por, la = upd ? "↑" : "←", ra = upd ? "↓" : "→";
  const navb = `<button class="btn" data-mnav="-${step}" aria-label="${step === 1 ? "Voriger Tag" : "Vorige Woche"}">${la}</button><span class="mlab${lab.length > 20 ? " l2" : lab.length > 15 ? " l1" : ""}">${lab}</span><button class="btn" data-mnav="${step}" aria-label="${step === 1 ? "Nächster Tag" : "Nächste Woche"}">${ra}</button>`;
  const tools = `<input class="in" type="date" id="mjump" value="${d}" aria-label="Datum wählen"><button class="btn sm" data-mtoday="1">Heute</button><button class="btn ghost sm mbig" data-mobon="0" title="Zur großen Ansicht mit Bearbeitung">Große Ansicht</button>`;
  if (por){
    const tags = MB.mode === "tag" ? mobTags(d) : "";
    if (MON){
      const head = `<div class="mhead por mon">${staleBar()}<div class="mrow">${seg}<input class="in" type="month" id="mjump" value="${d.slice(0,7)}" aria-label="Monat wählen"><button class="btn sm" data-mtoday="1" aria-pressed="${mobIsToday(d)}">Heute</button></div><div class="mcal" id="mcal">${mobCal()}</div></div>`;
      return head + `<div class="mlist">${mobMonList()}</div>` + `<div class="mfoot"><span class="hint">${TEAM && window.__SHP_DATA ? "Stand " + esc(bkWhen(window.__SHP_DATA.created)) + " · " : ""}Nur lesen · Termin antippen für Details · Kalenderblatt nach oben/unten wischen = nächster/voriger Monat · Tag im Kalender antippen = dorthin springen${TEAM ? ` · <a href="#" data-tlogout="1">Abmelden</a>` : ""}</span><button class="btn ghost sm mbig" data-mobon="0">Große Ansicht</button></div>`;
    }
    const head = `<div class="mhead por">${staleBar()}<div class="mrow">${seg}<input class="in" type="date" id="mjump" value="${d}" aria-label="Datum wählen"><button class="btn sm" data-mtoday="1" aria-pressed="${mobIsToday(d)}">Heute</button></div><div class="mrow mnav">${navb}</div>${MB.mode === "tag" ? mobStrip(d) : ""}${tags ? `<div class="mtags">${tags}</div>` : ""}</div>`;
    return head + (MB.mode === "tag" ? mobDayV(d) : `<div class="wlist">${mobWeekAll()}</div>`) + `<div class="mfoot"><span class="hint">Nur lesen · Termin antippen für Details</span><button class="btn ghost sm mbig" data-mobon="0">Große Ansicht</button></div>`;
  }
  const head = `<div class="mhead">${staleBar()}${seg}<div class="mnav">${navb}</div>${tools}</div>`;
  const banner = st === "ruhig" ? `<div class="wkbanner ruhig" role="note"><b>Ruhige Woche</b><span>So wenig Programm wie möglich.</span></div>` : st === "pause" ? `<div class="wkbanner pause" role="note"><b>Programmpause</b><span>Keine Veranstaltungen – nur feste Termine.</span></div>` : "";
  const body = MB.mode === "tag" ? viewWoche({mob:true, days:[d]}) : viewWoche({mob:true, week:true, days:wkDays});
  return head + banner + `<div class="mbody ${MB.mode}">${body}</div><p class="hint mhint">Nur lesen. Termin antippen für Details. Lücken in den Raumspuren = frei.</p>`;
}
const mobPortrait = () => { try { return matchMedia("(orientation: portrait)").matches; } catch(e){ return false; } };
function mobTags(d, noWk){
  const st = S.weeks[weekKey(d)] || "belebt", notes = evList().filter(e => e.date === d && e.kind === "notiz");
  return [FEIER[d] ? `<span class="lv err">${esc(FEIER[d])}</span>` : "", sperrOn(d) ? `<span class="lv err">Sperrtag: ${esc(sperrOn(d))}</span>` : "", ferienOn(d) ? `<span class="lv info">${esc(ferienOn(d))}</span>` : "",
    noWk ? "" : st === "ruhig" ? `<span class="lv mq">ruhige Woche</span>` : st === "pause" ? `<span class="lv mp">Programmpause</span>` : "",
    ...notes.map(n => `<span class="lv info" data-ev="${n.id}">✎ ${esc(evName(n))}</span>`)].join("") + stayTags(d);
}
/* Übernachtungsgäste (mit Namen, Sebastian 02.11.2026) und Messen als Schilder am Tag (v121) */
const stayTags = d => staysOn(d).map(q => `<span class="lv sty${q.x.status === "gebucht" ? "" : " vm"}" title="${esc(stayTip(q.x))}">${BED}${q.s > 0 ? "ab " + m2t(q.s) + " " : q.e < 1440 ? "bis " + m2t(q.e) + " " : ""}${esc(stayName(q.x))}${+q.x.persons > 1 ? " (" + (+q.x.persons) + ")" : ""}</span>`).join("")
  + fairsOn(d).map(f => `<span class="lv fair">Messe: ${esc(f.name)}</span>`).join("");
/* Hochformat Tag: Räume als Spalten, Zeit senkrecht */
function mobDayV(d){
  const L = evList().filter(e => e.date === d).sort(sortEv), timed = L.filter(e => e.kind !== "notiz" && span(e)), open = L.filter(e => e.kind !== "notiz" && !span(e));
  UMB = umbauMap(evList());
  let lo = Math.floor(t2m(OPEN_FROM)/60)*60, hi = Math.ceil(t2m(OPEN_TO)/60)*60;
  for (const e of timed){ const sp = span(e); lo = Math.min(lo, sp.s - Math.max(setupOf(e), arrives(e) ? CI_MIN : 0)); hi = Math.max(hi, sp.e + (e.allDay ? 0 : afterOf(e) + teardownOf(e))); }
  for (const q of staysOn(d)) if (q.s === 0 && q.e < 1440) lo = Math.min(lo, q.e - 60); /* Abreise sichtbar (v121) */
  const T0 = Math.max(0, Math.floor(lo/60)*60), T1 = Math.min(24*60, Math.ceil(hi/60)*60), TS = T1 - T0;
  const Y = m => ((Math.min(Math.max(m, T0), T1) - T0) / TS * 100).toFixed(3) + "%", H = (a, b) => ((Math.min(b, T1) - Math.max(a, T0)) / TS * 100).toFixed(3) + "%";
  const LBL = {"Workshopraum":"Worksh.","Küche/Esszimmer":"Küche","Wohnzimmer":"Wohnz.","Innenhof":"Hof","DG (Notfall)":"DG","Raum offen":"offen","unterwegs":"unterw."};
  const roomsV = e => { const rs = e.room === "Gesamtes EG" ? EG.slice() : (e.room ? e.room.split(" + ").filter(r => LANES.includes(r)) : []); if (!rs.length && e.room !== "online" && !(e.room||"").includes("unterwegs")) rs.push("Raum offen");
    if ((e.room||"").split(" + ").includes("unterwegs") && !rs.includes("unterwegs")) rs.push("unterwegs"); if (e.room === "online") rs.push("online"); return rs; };
  const phRooms = e => { const ph = endPh(e); return ph ? splitRooms(ph.room).filter(r => LANES.includes(r)) : []; };
  /* sichtbare Spalten: EG-Räume immer, Hof und Sonderspalten nur bei Belegung */
  const used = new Set(); timed.forEach(e => { roomsV(e).forEach(r => used.add(r)); phRooms(e).forEach(r => used.add(r)); }); const sts = staysOn(d); if (sts.length) used.add(STAY_ROOM);
  const lanes = LANES.filter(l => (EG.includes(l) && l !== "Innenhof") || used.has(l));
  const cols = lanes.map(() => []), ci = [];
  /* benachbarte Räume zu einem Block zusammenfassen: [[Startindex, Anzahl], …] */
  const runs = rs => { const ix = [...new Set(rs.map(r => lanes.indexOf(r)).filter(i => i >= 0))].sort((a, b) => a - b), out = [];
    ix.forEach(i => { const l = out[out.length - 1]; if (l && l[0] + l[1] === i) l[1]++; else out.push([i, 1]); }); return out; };
  const wid = n => n > 1 ? `right:auto;width:calc(${n} * 100% + ${2*(n-1) - 4}px);` : "";
  const seps = n => { if (n < 2) return ""; const a = 2*n - 6, sg = a >= 0 ? "-" : "+"; let h = ""; for (let k = 1; k < n; k++) h += `<i class="vsep" style="left:calc((100% ${sg} ${Math.abs(a)}px) * ${k} / ${n} + ${2*k - 3}px)"></i>`; return h; };
  for (const e of timed){
    const sp = span(e), t = theme(e), bg = e.kind === "vermietung" ? "var(--muted)" : t[0], ph = endPh(e), su = e.allDay ? 0 : setupOf(e), af = e.allDay ? 0 : afterOf(e), td = e.allDay ? 0 : teardownOf(e);
    const rs = roomsV(e), mainEnd = ph ? Math.max(sp.s, sp.e - ph.min) : sp.e, cls = `blk vblk${t[1] ? " dark" : ""} ${stCls(e)}${errNoZone(e.id) ? " bad" : ""}`;
    const lab = `<span class="vt">${e.allDay ? "ganzt." : esc(e.start)}</span><span class="vn">${esc(evName(e))}</span>`, tip = esc(evName(e) + " · " + (e.allDay ? "ganztägig" : e.start + "–" + m2t(sp.e)) + " · " + (e.room || "Raum offen") + " · " + (e.status || ""));
    runs(rs).forEach(([i, n]) => {
      if (su > 0) cols[i].push(`<div class="vset" style="${wid(n)}top:${Y(sp.s - su)};height:${H(sp.s - su, sp.s)}" title="Aufbau"></div>`);
      cols[i].push(`<button class="${cls}${n > 1 ? " vspan" : ""}" data-ev="${e.id}" style="${wid(n)}top:${Y(sp.s)};height:${H(sp.s, mainEnd)};background-color:${bg};--c:${bg}" title="${tip}">${seps(n)}${lab}</button>`);
      if (!ph && (af + td) > 0) cols[i].push(`<div class="vtail" style="${wid(n)}top:${Y(sp.e)};height:${H(sp.e, sp.e + af + td)};--c:${bg}" title="${esc("Nachlauf/Abbau bis " + m2t(sp.e + af + td))}"></div>`);
    });
    if (ph) runs(phRooms(e)).forEach(([i, n]) => {
      cols[i].push(`<button class="${cls} vph${n > 1 ? " vspan" : ""}" data-ev="${e.id}" style="${wid(n)}top:${Y(mainEnd)};height:${H(mainEnd, sp.e)};background-color:${bg};--c:${bg}" title="${esc("Abschluss " + evName(e) + " ab " + m2t(mainEnd))}">${seps(n)}<span class="vt">Abschluss</span><span class="vn">${esc(evName(e))}</span></button>`);
      if (af + td > 0) cols[i].push(`<div class="vtail" style="${wid(n)}top:${Y(sp.e)};height:${H(sp.e, sp.e + af + td)};--c:${bg}"></div>`);
    });
    const wi = lanes.indexOf("Workshopraum"), fu = furnOf(e), um = UMB.get(e.id); if (fu && wi >= 0) cols[wi].push(`<span class="vfur${um ? " chg" : ""}${sp.s - Math.max(su, arrives(e) ? 30 : 0) <= T0 ? " t0" : ""}" style="top:${Y(sp.s - Math.max(su, arrives(e) ? 30 : 0))}" title="${esc(um ? "Umbau vorher: " + um.from + " → " + fu : "Möblierung: " + fu)}">${um ? "⇄" : ""}${FURN_SYM[fu]}</span>`);
    const lv = egLevel(e); if (lv >= 2 && e.room !== "Gesamtes EG" && rs.some(r => EG.includes(r))) EG.filter(r => !rs.includes(r)).forEach(r => { const k = lanes.indexOf(r); if (k >= 0) cols[k].push(`<div class="vexcl${lv === 2 ? " ex2" : ""}" style="top:${Y(sp.s)};height:${H(sp.s, sp.e)}" title="${esc(eglName(lv) + ": " + evName(e))}"></div>`); });
    if (arrives(e)){ const s = t2m(e.start); ci.push(`<i style="top:${Y(s - CI_MIN)};height:${H(s - CI_MIN, checkinOf(e) === "durchgehend" ? sp.e : s)}" class="${checkinOf(e) === "durchgehend" ? "run" : ""}" title="${esc("Check-in " + evName(e))}"></i>`); }
  }
  { const k = lanes.indexOf(STAY_ROOM); if (k >= 0) sts.forEach(q => { if (q.e <= T0 || q.s >= T1) return;
      cols[k].push(`<div class="stay vstay${q.x.status === "gebucht" ? "" : " vm"}" style="top:${Y(q.s)};height:${H(q.s, q.e)}" title="${esc(stayTip(q.x))}"><span class="vt">${BED}${q.s > 0 ? "ab " + m2t(q.s) : q.e < 1440 ? "bis " + m2t(q.e) : ""}</span><span class="vn">${esc(stayName(q.x))}</span>${stayOutSat(q, d) ? `<span class="vout">${stayOutSat(q, d)}</span>` : ""}</div>`); }); }
  const hours = []; for (let h = T0/60; h <= T1/60; h++) hours.push(`<span style="top:${Y(h*60)}">${h}</span>`);
  const lines = []; for (let h = T0/60 + 1; h < T1/60; h++) lines.push(`<i style="top:${Y(h*60)}"></i>`);
  const now = d === todayStr() ? (() => { const n = new Date(), m = n.getHours()*60 + n.getMinutes(); return m > T0 && m < T1 ? `<div class="vnow" style="top:${Y(m)}"></div>` : ""; })() : "";
  const head = `<div class="vhead" style="--nl:${lanes.length}"><span></span><span></span>${lanes.map(l => `<span title="${esc(l)}">${esc(LBL[l] || l)}</span>`).join("")}</div>`;
  const body = `<div class="vday" lang="de" style="--nl:${lanes.length}"><div class="vtime">${hours.join("")}</div><div class="vci">${ci.join("")}</div>${lanes.map((l, i) => `<div class="vcol${EG.includes(l) ? "" : " xo"}">${lines.join("")}${cols[i].join("")}${now}</div>`).join("")}</div>`;
  const openH = open.length ? `<div class="vopen">Ohne Startzeit: ${open.map(e => `<button class="lv" data-ev="${e.id}">${esc(evName(e))}</button>`).join(" ")}</div>` : "";
  return openH + head + body;
}
/* Hochformat Woche: kompakte Liste je Tag */
function mobWeekList(days){
  return days.map(d => {
    const evs = evList().filter(e => e.date === d && e.kind !== "notiz").sort(sortEv), tags = mobTags(d, true);
    const rows = evs.map(e => { const sp = span(e), t = theme(e), bg = e.kind === "vermietung" ? "var(--muted)" : t[0];
      return `<button class="wli ${stCls(e)}${errNoZone(e.id) ? " bad" : ""}" data-ev="${e.id}" style="--c:${bg}"><span class="wt">${e.allDay ? "ganzt." : sp ? esc(e.start) + "–" + m2t(sp.e) : "offen"}</span><span class="wn">${esc(evName(e))}</span><span class="wr">${esc(e.room || "Raum offen")} · ${esc(e.status || "–")}</span></button>`; }).join("");
    return `<section class="wday${FEIER[d] || sperrOn(d) ? " hol" : ""}"><h3 data-mday="${d}" role="button" tabindex="0">${WD[wdOf(d)]} ${fmtY(d)} <span class="go" aria-label="Tagesansicht öffnen"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h12M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span></h3>${tags ? `<div class="mtags">${tags}</div>` : ""}${rows || `<p class="hint">keine Termine</p>`}</section>`;
  }).join("");
}
/* Monat(e) einer Woche Mo–Sa ausgeschrieben: „März“ bzw. „März/April“ */
/* „Heute“ ausgewählt: Tag = heute bzw. (Woche) heute liegt in der angezeigten Woche */
const mobIsToday = d => { const t = todayStr(); return MB.mode === "woche" ? mobMon(d) === mobMon(t) : d === t; }; /* Monat: oberste Woche = heutige Woche */
function mobMonLab(mon){ const ma = MONTHS[+mon.slice(5,7)-1], mb = MONTHS[+S_(D(mon)+5).slice(5,7)-1]; return ma === mb ? ma : `${ma}/${mb}`; }
/* Hochformat Woche: alle Wochen untereinander (ab heute bzw. erstem Termin bis zum letzten Termin), Trennlinie je Woche; leere Samstage und Sonntage ausgelassen */
/* ---------- Mobil Hochformat: Monatsansicht (Kalenderblatt oben, Terminliste darunter) ---------- */
const WDK = ["So","Mo","Di","Mi","Do","Fr","Sa"];
const mobCnt = d => evList().filter(e => e.date === d && e.kind !== "notiz").length;
/* Kurzdatum „Mi. 28. Okt.“ (ohne Jahr, v109) */
const mobDLab = d => `${WDK[wdOf(d)]}. ${+d.slice(8)}. ${MON_AB[+d.slice(5,7)-1]}`;
const mobDur = m => { m = +m || 0; const h = Math.floor(m/60), r = m % 60; return h && r ? `${h}h ${r}min` : h ? `${h}h` : `${r}min`; };
/* Zeitraum der Monatsliste: ab Woche des ersten Termins (bzw. heute) bis Ende der Woche des letzten Termins */
function mobRange(){ const ds = evList().map(e => e.date).sort(), t = todayStr();
  let a = mobMon(ds.length && ds[0] < t ? ds[0] : t), z = ds.length && ds[ds.length-1] > t ? ds[ds.length-1] : t;
  if (MB.day && MB.day < a) a = mobMon(MB.day); if (MB.day && MB.day > z) z = MB.day; return [a, S_(D(mobMon(z)) + 6)]; }
/* Kalenderblatt: alle Wochen als Streifen (Mo–So, KW links, Punkte = Anzahl Termine); sichtbar sind 5 Wochen, der Streifen gleitet mit der Liste */
function mobCal(){
  const t = todayStr(), [a, z] = mobRange(), mo = x => x.slice(0,7);
  let rows = "";
  for (let mon = a; mon <= S_(D(z) + 28); mon = S_(D(mon) + 7)){
    const [, w] = isoWeek(mon), st = S.weeks[weekKey(mon)] || "belebt";
    rows += `<div class="mcr${st !== "belebt" ? " " + st : ""}" data-wk="${mon}"><span class="mkw" title="${st === "ruhig" ? "ruhige Woche" : st === "pause" ? "Programmpause" : ""}">${w}</span>` + [0,1,2,3,4,5,6].map(i => {
      const x = S_(D(mon) + i), n = mobCnt(x), hol = FEIER[x] || sperrOn(x), fer = ferienOn(x);
      const ml = i > 0 && mo(x) !== mo(S_(D(x) - 1)), mt = mo(x) !== mo(S_(D(x) - 7)); /* Monatsgrenze: Linie links bzw. oben */
      return `<button class="mcd${x < t ? " past" : ""}${x === t ? " today" : ""}${hol ? " hol" : ""}${fer ? " fer" : ""}${ml ? " ml" : ""}${mt ? " mt" : ""}" data-mjd="${x}" aria-label="${esc(mobDLab(x) + " · " + n + " Termin" + (n === 1 ? "" : "e") + (hol ? " · " + hol : ""))}">${x.slice(8) === "01" ? `<small>${MON3[+x.slice(5,7)-1]}</small>` : ""}<b>${+x.slice(8)}</b><i>${n ? "•".repeat(Math.min(n, 4)) : ""}</i></button>`; }).join("") + `</div>`;
  }
  return `<div class="mcr mch"><span></span>${["M","D","M","D","F","S","S"].map(x => `<span>${x}</span>`).join("")}</div><div class="mcv"><div class="mci" id="mci" data-a="${a}">${rows}</div></div>`;
}
/* Terminliste: Tage mit Terminen, Notizen oder Feiertag; leere Tage als schmaler Platzhalter zusammengefasst */
function mobMonList(){
  const t = todayStr(), tm = S_(D(t) + 1), [a, z] = mobRange();
  let h = "", run = [], lastWk = "", boxWk = "";
  /* v109: jede Woche in einem Rahmen (.mwk); ruhig = violette Umrandung, Pause = gestrichelt grau (wie Hauptplaner) */
  const box = d => { const wk = weekKey(d); if (wk === boxWk) return; if (boxWk) h += `</div>`; boxWk = wk; const st = S.weeks[wk] || "belebt"; h += `<div class="mwk ${st}">`; };
  const stWord = st => st === "ruhig" ? "ruhig" : st === "pause" ? "Pause" : "";
  /* leere Tage: ein Platzhalter je Lauf (nie über eine Wochengrenze), Höhe = Anzahl Tage × halbe Tageshöhe */
  const flush = () => { if (!run.length) return; const a1 = run[0], b1 = run[run.length-1], pz = run.every(x => (S.weeks[weekKey(x)] || "") === "pause"), wk = weekKey(a1), ws = wk !== lastWk; lastWk = wk;
    const sw = ws && !pz ? stWord(S.weeks[wk] || "belebt") : ""; box(a1);
    h += `<div class="mskip${ws ? " wks" : ""}" data-d="${a1}" data-e="${b1}"${ws ? ` data-wk="${mobMon(a1)}"` : ""} style="--n:${run.length}"><span>${mobDLab(a1)}${a1 !== b1 ? " – " + mobDLab(b1) : ""} · ${pz ? "Programmpause" : "keine Termine"}</span>${sw ? `<em>${sw}</em>` : ""}</div>`; run = []; };
  for (let d = a; d <= z; d = S_(D(d) + 1)){
    if (wdOf(d) === 1) flush();
    const evs = evList().filter(e => e.date === d && e.kind !== "notiz").sort(sortEv), notes = evList().filter(e => e.date === d && e.kind === "notiz"), hol = FEIER[d], sp = sperrOn(d), sts = staysOn(d);
    if (!evs.length && !notes.length && !hol && !sp && !sts.length){ run.push(d); continue; }
    flush();
    /* v110: Feiertag ohne Termine in einer Programmpause wie die übrigen Pausentage (halbe Höhe), Text klein */
    if (hol && !sp && !evs.length && !notes.length && (S.weeks[weekKey(d)] || "") === "pause"){ const wk1 = weekKey(d), ws1 = wk1 !== lastWk; lastWk = wk1; box(d);
      h += `<div class="mskip mhol${ws1 ? " wks" : ""}" data-d="${d}" data-e="${d}"${ws1 ? ` data-wk="${mobMon(d)}"` : ""} style="--n:1"><span>${mobDLab(d)} · ${esc(hol)}</span></div>`; continue; }
    const wk = weekKey(d), st = S.weeks[wk] || "belebt", [, w] = isoWeek(d), showKw = wk !== lastWk; lastWk = wk;
    const pre = d === t ? "Heute · " : d === tm ? "Morgen · " : "", fer = ferienOn(d);
    const tags = [hol ? `<span class="lv err">${esc(hol)}</span>` : "", sp ? `<span class="lv err">Sperrtag</span>` : "", fer ? `<span class="lv info">${esc(fer)}</span>` : "", ...notes.map(n => `<span class="lv info" data-ev="${n.id}">✎ ${esc(evName(n))}</span>`)].join("") + stayTags(d);
    const rows = evs.map(e => { const sp2 = span(e), t2 = theme(e), bg = e.kind === "vermietung" ? "var(--muted)" : t2[0];
      return `<button class="mli ${stCls(e)}${errNoZone(e.id) ? " bad" : ""}" data-ev="${e.id}" style="--c:${bg}"><span class="mt"><b>${e.allDay ? "ganztägig" : e.start ? esc(e.start) : "offen"}</b>${!e.allDay && e.start && sp2 ? `<small>${mobDur(sp2.e - sp2.s)}</small>` : ""}</span><i class="md"></i><span class="mn">${esc(evName(e))}</span></button>`; }).join("");
    box(d); h += `<section class="mday${d === t ? " now" : ""}${hol || sp ? " hol" : ""}${showKw ? " wks" : ""}" data-d="${d}" data-e="${d}"${showKw ? ` data-wk="${mobMon(d)}"` : ""}><h3 data-mday="${d}" role="button" tabindex="0"><span class="mdl">${pre}${mobDLab(d)}</span>${tags ? `<span class="mtg">${tags}</span>` : ""}${showKw && stWord(st) ? `<span class="mkwl">${stWord(st)}</span>` : ""}</h3>${rows}</section>`;
  }
  flush(); if (boxWk) h += `</div>`;
  return h;
}
/* Eintrag zum Datum: „contain“ = Eintrag, der den Tag enthält (sonst nächster), „next“ = erster Eintrag ab dem Datum */
function mobListEl(d, how){
  const all = [...document.querySelectorAll(".mlist [data-d]")]; if (!all.length) return null;
  if (how === "contain"){ const c = all.find(x => x.dataset.d <= d && d <= x.dataset.e); if (c) return c; }
  return all.find(x => x.dataset.d >= d) || all[all.length - 1];
}
const MSY = {lock:0};
function mobScrollDate(d, smooth, how){
  const el = mobListEl(d, how || "contain"); if (!el) return false;
  const hd = document.querySelector(".mhead.por"), off = hd ? hd.getBoundingClientRect().height + 4 : 0;
  MB.day = el.dataset.d; mobCalSet(MB.day);
  MSY.lock = Date.now() + (smooth ? 700 : 100);
  window.scrollTo({top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - off), behavior: smooth ? "smooth" : "auto"}); return true;
}
/* Kalenderblatt, Monatsfeld und Heute-Knopf auf das Datum setzen (ohne alles neu zu zeichnen) */
function mobCalSet(d){
  const dj = document.getElementById("mjump"); if (dj && dj.type === "month") dj.value = d.slice(0,7);
  const hb = document.querySelector(".mhead [data-mtoday]"); if (hb) hb.setAttribute("aria-pressed", String(mobIsToday(d)));
}
/* Beim Scrollen: oberster sichtbarer Eintrag bestimmt Kalenderblatt und Monat */
function mobMonSync(){
  if (!UI.mob || MB.mode !== "woche" || !mobPortrait()) return; const hd = document.querySelector(".mhead.por.mon"); if (!hd) return;
  mobCalPos(); if (Date.now() < MSY.lock) return;
  const lim = hd.getBoundingClientRect().bottom + 8; let cur = null;
  for (const s of document.querySelectorAll(".mlist [data-d]")){ if (s.getBoundingClientRect().top <= lim) cur = s; else break; }
  if (!cur) cur = document.querySelector(".mlist [data-d]"); if (!cur) return;
  if (cur.dataset.d !== MB.day){ MB.day = cur.dataset.d; mobCalSet(MB.day); }
}
/* Monat wechseln (Wischen auf dem Kalenderblatt): Liste springt zum 1. des Monats */
/* Kalenderstreifen verschieben: Woche, in der die Liste oben steht, plus Anteil bis zur nächsten Woche (weich, ohne Sprung) */
function mobCalPos(){
  const ci = document.getElementById("mci"), hd = document.querySelector(".mhead.por.mon"); if (!ci || !hd) return;
  const rows = ci.children, rh = rows.length ? rows[0].offsetHeight : 48, L = hd.getBoundingClientRect().bottom + 8, ws = [...document.querySelectorAll(".mlist .wks")];
  let k = -1; for (let i = 0; i < ws.length; i++){ if (ws[i].getBoundingClientRect().top <= L) k = i; else break; }
  /* Woche bleibt ganz sichtbar, bis die Liste die nächste Woche erreicht; dann gleitet das Blatt eine Zeile weiter (CSS-Übergang) */
  const pos = k >= 0 ? Math.round((D(ws[k].dataset.wk) - D(ci.dataset.a)) / 7) : 0;
  if (ci.dataset.pos !== String(pos)){
    if (!ci.dataset.pos){ ci.style.transition = "none"; ci.style.transform = `translateY(${-pos * rh}px)`; void ci.offsetHeight; ci.style.transition = ""; }
    else ci.style.transform = `translateY(${-pos * rh}px)`;
    ci.dataset.pos = pos; [...rows].forEach((r, i) => r.classList.toggle("cur", i === pos)); }
  /* Rahmen um den Tag, der in der Liste oben steht (im Platzhalter: der Tag auf Höhe der Oberkante) */
  let cur = null; for (const s of document.querySelectorAll(".mlist [data-d]")){ if (s.getBoundingClientRect().top <= L) cur = s; else break; }
  if (!cur) cur = document.querySelector(".mlist [data-d]");
  let day = cur ? cur.dataset.d : "";
  if (cur && cur.classList.contains("mskip")){ const n = Math.round((D(cur.dataset.e) - D(cur.dataset.d))) + 1, i = Math.max(0, Math.min(n - 1, Math.floor((L - cur.getBoundingClientRect().top) / Math.max(1, cur.offsetHeight / n)))); day = S_(D(cur.dataset.d) + i); }
  if (ci.dataset.sel !== day){ const o = ci.querySelector(".mcd.sel"); if (o) o.classList.remove("sel"); const nb = day && ci.querySelector(`[data-mjd="${day}"]`); if (nb) nb.classList.add("sel"); ci.dataset.sel = day; }
}
/* Leere Tage: halbe Höhe eines belegten Tages (Kopf + ein Termin) */
function mobListFit(){ const l = document.querySelector(".mlist"); if (!l) return; const li = l.querySelector(".mli"), H = li ? li.offsetHeight : 50;
  l.style.setProperty("--eh", Math.round(H / 2) + "px"); } /* leerer Tag = halbe Höhe einer Terminzeile (3 leere Tage = 1,5 Zeilen) */
function mobMonthStep(n){ const y = +MB.day.slice(0,4), m = +MB.day.slice(5,7) - 1 + n, f = S_(Date.UTC(y, m, 1) / 864e5); mobScrollDate(f, true, "next"); }
function mobWeekAll(){
  const ds = evList().map(e => e.date).sort(), today = todayStr(), has = y => evList().some(e => e.date === y && e.kind !== "notiz");
  let a = mobMon(ds.length && ds[0] < today ? ds[0] : today), z = ds.length && ds[ds.length-1] > today ? ds[ds.length-1] : today;
  if (MB.day < a) a = mobMon(MB.day); if (MB.day > z) z = MB.day;
  let h = "";
  for (let m = a; m <= z; m = S_(D(m) + 7)){
    const [, w] = isoWeek(m), st = S.weeks[weekKey(m)] || "belebt", days = [0,1,2,3,4,5].map(i => S_(D(m)+i)).filter(x => wdOf(x) !== 6 || has(x));
    h += `<div class="wsec" id="wk-${m}" data-mon="${m}"><div class="wsep"><b>Woche ${w}</b><span>${mobMonLab(m)} ${m.slice(0,4)}</span>${st === "ruhig" ? `<span class="lv mq">ruhige Woche</span>` : st === "pause" ? `<span class="lv mp">Programmpause</span>` : ""}</div>${mobWeekList(days)}</div>`;
  }
  return h;
}
/* Wochenliste: beim Scrollen Kopfzeile (Woche, Monat, Datum) auf die oben sichtbare Woche setzen */
function mobWeekSync(){
  if (!UI.mob || MB.mode !== "woche") return; const hd = document.querySelector(".mhead.por"); if (!hd) return;
  const lim = hd.getBoundingClientRect().bottom + 8; let cur = null;
  for (const s of document.querySelectorAll(".wsec")){ if (s.getBoundingClientRect().top <= lim) cur = s; else break; }
  if (!cur) cur = document.querySelector(".wsec"); if (!cur) return;
  const m = cur.dataset.mon; if (mobMon(MB.day) === m) return;
  MB.day = m; mobHeadSet(m);
}
function mobHeadSet(m){ const [, w] = isoWeek(m), lb = document.querySelector(".mhead .mlab"), wb = document.querySelector('.mhead [data-mmode="woche"]'), dj = document.getElementById("mjump");
  if (lb) lb.textContent = mobMonLab(m); if (wb) wb.textContent = "Woche " + w; if (dj) dj.value = m;
  const hb = document.querySelector(".mhead [data-mtoday]"); if (hb) hb.setAttribute("aria-pressed", String(mobIsToday(m))); }
/* Wochensprung mit eigener Animation: schnelles Tippen zählt mit (Ziel wird verschoben, Animation läuft vom aktuellen Punkt weiter, nie Abbruch) */
const MS = {target:null, raf:0, anim:false};
function mobWeekJump(n){
  const base = MS.anim && MS.target ? MS.target : mobMon(MB.day || todayStr()), all = [...document.querySelectorAll(".wsec")]; if (!all.length) return false;
  let t = S_(D(base) + n), el = document.getElementById("wk-" + t);
  if (!el){ el = n > 0 ? all[all.length - 1] : all[0]; t = el.dataset.mon; }
  MS.target = t; MB.day = t; mobHeadSet(t);
  const hd = document.querySelector(".mhead.por"), off = hd ? hd.getBoundingClientRect().height + 4 : 0;
  const from = window.scrollY, to = Math.max(0, el.getBoundingClientRect().top + window.scrollY - off), dist = to - from, dur = 320, t0 = performance.now();
  cancelAnimationFrame(MS.raf); MS.anim = true;
  const ease = p => 1 - Math.pow(1 - p, 3);
  const step = now => { const p = Math.min(1, (now - t0) / dur); window.scrollTo(0, from + dist * ease(p)); if (p < 1) MS.raf = requestAnimationFrame(step); else { MS.anim = false; MS.target = null; } };
  MS.raf = requestAnimationFrame(step); return true;
}
window.addEventListener("scroll", () => { if (UI.mob && MB.mode === "woche" && !MS.anim){ cancelAnimationFrame(mobWeekSync.r); mobWeekSync.r = requestAnimationFrame(() => { if (mobPortrait()) mobMonSync(); else mobWeekSync(); }); } }, {passive:true});
function mobScrollWeek(m, smooth){ const el = document.getElementById("wk-" + mobMon(m)); if (!el) return false; const hd = document.querySelector(".mhead.por"), off = hd ? hd.getBoundingClientRect().height + 4 : 0;
  window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - off, behavior: smooth ? "smooth" : "auto"}); return true; }
/* Kopfzeile mobil: „KW 11 · Mrz '27“, bei Monatswechsel „KW 13 · Mrz/Apr '27“ (Mo–Sa) */
const MON3 = ["Jan","Feb","Mrz","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
function mobKwLab(d){ const a = mobMon(d), b = S_(D(a) + 5), [, w] = isoWeek(d), ma = MON3[+a.slice(5,7)-1], mb = MON3[+b.slice(5,7)-1], ya = "'" + a.slice(2,4), yb = "'" + b.slice(2,4);
  return `KW ${w} · ` + (a.slice(0,7) === b.slice(0,7) ? `${ma} ${ya}` : ya === yb ? `${ma}/${mb} ${yb}` : `${ma} ${ya}/${mb} ${yb}`); }
/* Wochentage Mo–Sa als Kästchen (So nur, wenn ausgewählt); ausgewählter Tag hervorgehoben */
function mobStrip(d){
  const mon = mobMon(d), days = [0,1,2,3,4,5].map(i => S_(D(mon)+i)).filter(x => wdOf(x) !== 6 || x === d || evList().some(e => e.date === x && e.kind !== "notiz"));
  return `<div class="mwd" role="group" aria-label="Wochentag wählen">${days.map(x => { const n = evList().filter(e => e.date === x && e.kind !== "notiz").length, hol = FEIER[x] || sperrOn(x);
    return `<button class="mwdb${x === d ? " on" : ""}${hol ? " hol" : ""}" data-mpick="${x}" aria-pressed="${x === d}" title="${esc(WD[wdOf(x)] + " " + fmtY(x) + (hol ? " · " + hol : "") + " · " + n + " Termin" + (n === 1 ? "" : "e"))}"><b>${WD[wdOf(x)]}</b><span>${+x.slice(8)}.</span><i>${n ? "•".repeat(Math.min(n, 4)) : "&nbsp;"}</i></button>`; }).join("")}</div>`;
}
function mobFit(){ mobListFit(); if (MB.scrollTo && MB.mode === "woche"){ const t = MB.scrollTo; MB.scrollTo = null; if (mobPortrait() && document.querySelector(".mlist")) mobScrollDate(t, false, "contain"); else mobScrollWeek(t, false); }
  if (document.getElementById("mci")) mobCalPos();
  const g = document.querySelector(".vday"); if (!g) return; const top = g.getBoundingClientRect().top + window.scrollY; g.style.height = Math.max(420, window.innerHeight - top - 8) + "px";
  g.querySelectorAll(".vblk").forEach(b => { const vn = b.querySelector(".vn"), vt = b.querySelector(".vt"); if (!vn) return;
    const cs = getComputedStyle(vn), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.15, pad = parseFloat(getComputedStyle(b).paddingTop) + parseFloat(getComputedStyle(b).paddingBottom);
    const avail = b.clientHeight - pad - (vt ? vt.offsetHeight : 0), lines = Math.floor(avail / lh);
    vn.style.display = lines < 1 ? "none" : ""; vn.style.webkitLineClamp = String(Math.max(1, lines)); vn.style.lineClamp = String(Math.max(1, lines)); });
}
(() => { let t = 0, por = null; window.addEventListener("resize", () => { if (!UI.mob) return; clearTimeout(t); t = setTimeout(() => { const p = mobPortrait(); if (p !== por){ por = p; render(); } else mobFit(); }, 150); }); })();

function mobDetail(id){
  const e = S.events[id]; if (!e) return;
  const sp = span(e), ph = endPh(e), t = theme(e), ser = serOf(e), row = (k, v) => v ? `<dt>${esc(k)}</dt><dd>${v}</dd>` : "";
  const s0 = sp ? sp.s : null, su = setupOf(e), af = afterOf(e), td = teardownOf(e), fu = furnOf(e), um = UMB.get(e.id), dl = deadlineOf(e), lv = egLevel(e), bk = backupOf(e);
  const ci = arrives(e) ? (checkinOf(e) === "durchgehend" ? "durchgehend ab " + m2t(s0 - CI_MIN) : "ab " + m2t(s0 - CI_MIN) + " (" + CI_MIN + " Min vorher)") : (sp && !e.allDay ? "keiner" : "");
  const iss = issuesAll(e.id);
  const issH = iss.length ? `<ul class="miss">${iss.map(x => `<li class="${x.l}${x.acc ? " acc" : ""}"><b>${x.l === "err" ? "Fehler" : x.l === "warn" ? "Hinweis" : "Info"}${x.acc ? " (akzeptiert)" : ""}:</b> ${esc(mobSan(x.t))}</li>`).join("")}</ul>` : `<p class="hint">Keine Prüfhinweise.</p>`;
  const html = `<div class="mshd"><i class="sw" style="background:${e.kind === "vermietung" ? "var(--muted)" : t[0]}"></i><h3>${esc(evName(e))}</h3><button class="btn sm" data-mclose="1" aria-label="Schließen">✕</button></div>
  <dl class="mdl">${row("Datum", esc(WD[wdOf(e.date)] + " " + fmtY(e.date)))}${row("Zeit", e.kind === "notiz" ? "Notiz (kein Termin)" : e.allDay ? "ganztägig" : sp ? esc(e.start + "–" + m2t(sp.e) + " Uhr") : "Startzeit offen")}
  ${row("Check-in", esc(ci))}${row("Aufbau", sp && su > 0 && !e.allDay ? esc("ab " + m2t(s0 - su) + " (" + su + " Min)") : "")}${row("Nachlauf", sp && af > 0 && !e.allDay ? esc("bis " + m2t(sp.e + af) + " (" + af + " Min)") : "")}${row("Abbau", td > 0 ? esc(td + " Min") : "")}
  ${row("Raum", esc(e.room || (e.kind === "notiz" ? "" : "Raum offen")))}${row("Abschluss", ph && sp ? esc(ph.room + " ab " + m2t(sp.e - ph.min)) : "")}${row("Ausweichraum", bk ? esc(bk + " (bei Schlechtwetter)") : "")}
  ${row("Bestuhlung", fu ? esc(fu + (um ? " – Umbau vorher (von " + um.from + ")" : "")) : "")}${row("EG-Stufe", e.kind !== "notiz" && sp ? esc(lv + " – " + eglName(lv)) : "")}${row("Hybrid", e.hybrid ? "ja, mit Live-Übertragung" : "")}
  ${row("Status", esc((e.status || "–") + (dl ? " · " + dl.t : "")))}${row("Thema", esc(e.kind === "vermietung" ? "" : (e.theme || "")))}${row("Form", esc(ser.form || e.form || ""))}${row("Art", e.kind && e.kind !== "va" ? esc(KINDS[e.kind] || "") : "")}${row("Reihe", ser.name && ser.name !== evName(e) ? esc(ser.name) : "")}</dl>
  <h4>Prüfung</h4>${issH}${mobNoteBtn(e)}`;
  let sh = $("#msheet"); if (!sh){ sh = document.createElement("div"); sh.id = "msheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-label", "Termindetails"); document.body.appendChild(sh); }
  sh.innerHTML = `<div class="msc" data-mclose="1"></div><div class="msp">${html}</div>`; sh.hidden = false;
}
/* Notiz per E-Mail (das Tool selbst nimmt mobil keine Eingaben an) */
let NOTE_MAIL = "veranstaltung@survivors-home.de"; /* Einstellungen */
function mobNoteBtn(e){
  const when = mobDLab(e.date) + (e.allDay ? ", ganztägig" : e.start ? ", " + e.start + " Uhr" : "");
  const subj = `Notiz zu VA ${evName(e)} (${when})`, body = `Veranstaltung: ${evName(e)}\nDatum: ${when}\n\nNotiz:\n`;
  return `<a class="mnote" href="mailto:${NOTE_MAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}" aria-label="Notiz per E-Mail" title="Notiz per E-Mail"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="2"/></svg></a>`;
}
function mobClose(){ const sh = $("#msheet"); if (sh) sh.hidden = true; }
function mobGo(n){ if (MB.mode === "woche" && mobPortrait() && Math.abs(n) === 7){ if (mobWeekJump(n)){ mobClose(); return; } const t = S_(D(mobMon(MB.day || todayStr())) + n); MB.day = t; MB.scrollTo = t; return render(); }
  let x = S_(D(MB.day || todayStr()) + n); const sg = n < 0 ? -1 : 1, has = y => evList().some(e => e.date === y && e.kind !== "notiz");
  if (Math.abs(n) === 1) for (let k = 0; k < 3 && (wdOf(x) === 0 || (wdOf(x) === 6 && !has(x))); k++) x = S_(D(x) + sg); /* Sonntag und leeren Samstag überspringen */
  else if (wdOf(x) === 0) x = S_(D(x) + sg);
  MB.day = x; mobClose(); render(); }
/* Klicks der mobilen Ansicht vor der Hauptlogik abfangen (keine Bearbeitungsdialoge) */
document.addEventListener("click", ev => {
  const on = ev.target.closest("[data-mobon]"); if (on){ ev.preventDefault(); ev.stopPropagation(); mobClose(); return mobSet(on.dataset.mobon === "1"); }
  if (!UI.mob) return;
  const t = ev.target.closest("[data-mnav],[data-mmode],[data-mtoday],[data-mday],[data-mpick],[data-mjd],[data-mclose],#app [data-ev],#app [data-zone],#app [data-new],#app [data-wk]");
  if (!t) return;
  ev.preventDefault(); ev.stopPropagation();
  const ds = t.dataset;
  if (ds.mclose) return mobClose();
  if (ds.ev) return mobDetail(ds.ev);
  if (ds.mnav) return mobGo(+ds.mnav);
  if (ds.mmode){ MB.mode = ds.mmode; if (ds.mmode === "woche") MB.scrollTo = MB.day; return render(); }
  if (ds.mtoday){ if (MB.mode === "woche" && mobPortrait() && document.querySelector(".mlist")) return mobScrollDate(todayStr(), true, "contain"); MB.day = todayStr(); MB.scrollTo = MB.mode === "woche" ? MB.day : null; return render(); }
  if (ds.mday){ MB.day = ds.mday; MB.mode = "tag"; window.scrollTo(0,0); return render(); }
  if (ds.mpick){ MB.day = ds.mpick; mobClose(); return render(); }
  if (ds.mjd){ mobClose(); return mobScrollDate(ds.mjd, true, "contain"); }
}, true);
document.addEventListener("change", ev => { if (UI.mob && ev.target.id === "mjump" && ev.target.value && ev.target.type === "month"){ if (!mobScrollDate(ev.target.value + "-01", true, "next")){ MB.day = ev.target.value + "-01"; MB.scrollTo = MB.day; render(); } return; }
  if (UI.mob && ev.target.id === "mjump" && ev.target.value){ MB.day = ev.target.value; MB.scrollTo = MB.mode === "woche" ? MB.day : null; render(); } });
document.addEventListener("keydown", ev => { if (UI.mob && ev.key === "Escape") mobClose(); });
/* Notiz-Knopf: mailto in eingebetteten Ansichten (App) zuerst als neues Fenster, sonst im eigenen Rahmen öffnen */
document.addEventListener("click", ev => { const a = ev.target.closest("a.mnote"); if (!a) return; ev.preventDefault(); ev.stopPropagation();
  let w = null; try { w = window.open(a.href, "_blank"); } catch(e){} if (!w){ try { window.location.href = a.href; } catch(e){} } }, true);
/* Wischen: links/rechts = vor/zurück (nicht, wenn die Zeitleiste selbst seitlich scrollt) */
(() => { let x0 = null, y0 = 0, blocked = false, calSw = false;
  document.addEventListener("touchstart", ev => { if (!UI.mob || ev.touches.length !== 1 || !ev.target.closest("#app")) { x0 = null; return; }
    const sc = ev.target.closest(".scroll"); blocked = !!(sc && sc.scrollWidth > sc.clientWidth + 4); calSw = !!ev.target.closest(".mcal"); x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, {passive:true});
  document.addEventListener("touchend", ev => { if (x0 == null || blocked) return; const t = ev.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
    if (MB.mode === "woche" && mobPortrait()){ if (calSw && Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx)) mobMonthStep(dy < 0 ? 1 : -1); return; }
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && !($("#msheet") && !$("#msheet").hidden)) mobGo((dx < 0 ? 1 : -1) * (MB.mode === "tag" ? 1 : 7)); }, {passive:true});
})();

/* ---------- Reinigung (v125): Einsätze der Reinigungskräfte, Aufgaben DG/EG ---------- */
/* Reinigungszeiten (Einstellungen → Reinigung, meta/settings.cleanSlots): Standard Mo und Fr 9–12 Uhr (Sebastian 02.11.2026).
   Fällt ein Einsatz auf einen Feiertag, wird er auf den Tag danach verlegt (Werktag ohne Feiertag), sonst auf den Tag davor. */
const CLEAN = !!window.__SHP_CLEAN; /* CLEAN: Reinigungsseite auf GitHub (nur Ansicht „Reinigung“, Daten eingebettet, ohne Namen) */
let CLEAN_URL = "https://belegung.survivors-home.de/reinigung/"; /* Einstellungen */
const CLEAN_DEF = [{wd:1, from:"09:00", to:"12:00"}, {wd:5, from:"09:00", to:"12:00"}];
const cleanCfg = () => { const v = (S.settings || {}).cleanSlots; const l = Array.isArray(v) ? v.filter(x => x && +x.wd >= 1 && +x.wd <= 6 && /^\d\d:\d\d$/.test(x.from || "") && /^\d\d:\d\d$/.test(x.to || "") && x.from < x.to) : null; return l && l.length ? l : CLEAN_DEF; };
/* Gäste ohne Zwischenreinigung: kommt derselbe Gast direkt wieder (kein anderer Gast dazwischen), muss das DG nicht gereinigt werden (Sebastian 02.11.2026: Nadja) */
const cleanSame = () => (Array.isArray((S.settings || {}).cleanSame) ? S.settings.cleanSame : []).map(n => String(n || "").trim()).filter(Boolean);
const cleanKey = x => stayName(x).toLowerCase();
const workDay = d => wdOf(d) >= 1 && wdOf(d) <= 5 && !FEIER[d];
const stayN = x => Math.min(4, Math.max(1, +x.persons || 1));
const persTxt = n => n + (n === 1 ? " Person" : " Personen");
const absTxt = m => { const d = S_(Math.floor(m / 1440)); return WD[wdOf(d)] + " " + fmtY(d) + " " + m2t(m % 1440); };
function cleanSlots(d0, d1){
  const cfg = cleanCfg(), out = [];
  for (let n = D(d0) - 3; n <= D(d1) + 3; n++){
    const d = S_(n);
    cfg.filter(c => +c.wd === wdOf(d)).forEach(c => {
      let day = d, moved = "";
      if (FEIER[d]){ moved = FEIER[d]; const a = S_(n + 1), b = S_(n - 1); day = workDay(a) ? a : workDay(b) ? b : null; }
      if (!day || day < d0 || day > d1) return;
      out.push({date:day, from:c.from, to:c.to, s:D(day)*1440 + t2m(c.from), e:D(day)*1440 + t2m(c.to), moved, orig:d, dg:[], eg:[]});
    });
  }
  return out.sort((a, b) => a.s - b.s);
}
/* Aufgaben: DG bei Gastwechsel (Reinigen + Betten für die neue Belegung) bzw. nur Betten umstellen, wenn derselbe Gast ohne Zwischenreinigung mit anderer Personenzahl kommt;
   EG nach jeder Veranstaltung mit „Küchenreinigung“. Jede Aufgabe gehört zum ersten Einsatz im möglichen Zeitfenster; gibt es keinen, ist ein Sondereinsatz nötig. */
function cleanPlan(d0, d1){
  const from0 = S_(D(d0) - 90), to0 = S_(D(d1) + 90), slots = cleanSlots(from0, to0), special = [], same = cleanSame().map(n => n.toLowerCase());
  const place = (t, list) => { const sl = slots.find(s => s.e > t.from && s.s < t.to && Math.min(s.e, t.to) - Math.max(s.s, t.from) >= 30); if (sl) sl[list].push(t); else special.push(t); };
  const st = stayList();
  st.forEach((a, i) => {
    const p = i ? st[i - 1] : null, [aS] = stayAbs(a), n = stayN(a), np = p ? stayN(p) : null;
    const keep = p && cleanKey(p) === cleanKey(a) && same.includes(cleanKey(a));
    const kind = !keep ? "dg" : np !== n ? "bett" : null; if (!kind) return;
    place({area:"DG", kind, from:p ? stayAbs(p)[1] : aS - 7*1440, to:aS, stay:a, prev:p, n, np}, "dg");
  });
  evList().filter(e => e.kitchenClean && e.status !== "abgesagt" && e.kind !== "notiz").forEach(e => {
    const sp = span(e); if (!sp) return; const end = D(e.date)*1440 + sp.e;
    place({area:"EG", kind:"eg", from:end, to:Infinity, ev:e, s:D(e.date)*1440 + sp.s}, "eg");
  });
  const inR = m => { const d = S_(Math.floor(m / 1440)); return d >= d0 && d <= d1; };
  return {slots:slots.filter(s => s.date >= d0 && s.date <= d1), special:special.filter(t => inR(t.from === -Infinity ? t.to : t.from) || inR(t.to === Infinity ? t.from : t.to))};
}
/* Gast im DG während des Einsatzes */
const cleanOcc = s => stayList().map(x => ({x, ab:stayAbs(x)})).filter(q => q.ab[0] < s.e && s.s < q.ab[1]);
const vmTag = x => x && x.status !== "gebucht" ? ` <span class="stb vm">vorgemerkt</span>` : "";
function cleanTaskLine(t, s){
  const ab = s && t.from > s.s ? ` <b>ab ${m2t(t.from % 1440)} Uhr</b>` : "";
  if (t.area === "EG"){ const e = t.ev, sp = span(e); return `<li class="cl-eg"><span class="ctag eg">EG</span> Küche/EG reinigen nach Veranstaltung ${WD[wdOf(e.date)]} ${fmtY(e.date)} ${e.allDay ? "ganztägig" : m2t(sp.s) + "–" + m2t(sp.e) + " Uhr"}${e.room ? " · " + esc(e.room) : ""}${ab}</li>`; }
  const a = t.stay, p = t.prev, arr = `Anreise ${absTxt(t.to)}${vmTag(a)}`;
  if (t.kind === "bett") return `<li class="cl-dg"><span class="ctag dg">DG</span> <b>Betten umstellen: ${t.np} → ${persTxt(t.n)}</b> · derselbe Gast kommt wieder, keine Zwischenreinigung nötig · ${arr}${ab}</li>`;
  const bed = p && t.np !== t.n ? ` · <b>Bettenwechsel: ${t.np} → ${persTxt(t.n)}</b>` : ` · Betten für ${persTxt(t.n)}`;
  return `<li class="cl-dg"><span class="ctag dg">DG</span> <b>Gastwechsel – DG reinigen</b>${bed} · ${p ? "Abreise " + absTxt(t.from) + " · " : ""}${arr}${ab}</li>`;
}
function cleanCard(s, today){
  const dg = s.dg.length, eg = s.eg.length, occ = cleanOcc(s);
  const badge = dg && eg ? `<span class="cbadge both">DG und EG</span>` : dg ? `<span class="cbadge dg">DG</span>` : eg ? `<span class="cbadge eg">EG</span>` : `<span class="cbadge free">nach Bedarf</span>`;
  const occL = occ.map(q => { const leave = q.ab[1] > s.s && q.ab[1] < s.e, arrive = q.ab[0] > s.s && q.ab[0] < s.e;
    return `<li class="cl-occ">${BED} ${leave ? `Gast reist um ${m2t(q.ab[1] % 1440)} Uhr ab – DG erst danach betreten` : arrive ? `Gast reist um ${m2t(q.ab[0] % 1440)} Uhr an – DG bis dahin fertig` : `DG belegt (Gast bis ${absTxt(q.ab[1])}) – nicht betreten`}${vmTag(q.x)}</li>`; }).join("");
  const lines = s.dg.map(t => cleanTaskLine(t, s)).join("") + s.eg.map(t => cleanTaskLine(t, s)).join("") + occL;
  const mv = s.moved ? ` <span class="lv warn">verlegt: ${esc(WD[wdOf(s.orig)])} ${fmt(s.orig)} ist ${esc(s.moved)} – bitte absprechen</span>` : "";
  return `<section class="ccard${s.date === today ? " today" : ""}${dg || eg ? "" : " idle"}"><h3><span>${WD[wdOf(s.date)]} ${fmtY(s.date)} · ${s.from}–${s.to} Uhr${s.date === today ? " · heute" : ""}</span>${badge}</h3>${mv}
    ${lines ? `<ul class="clist">${lines}</ul>` : ""}</section>`;
}
function viewReinigung(){
  const today = todayStr(), wk = UI.cleanWeeks || 8, d1 = S_(D(today) + wk * 7), dp = S_(D(today) - 28);
  const plan = cleanPlan(dp, d1), next = plan.slots.filter(s => s.date >= today), past = plan.slots.filter(s => s.date < today).reverse();
  const sp = plan.special.filter(t => (t.to === Infinity ? t.from : t.to) >= D(today)*1440).map(t => `<section class="ccard spec"><h3><span>Sondereinsatz nötig</span><span class="cbadge both">${t.area}</span></h3><p class="notes">Kein regulärer Reinigungstermin im Zeitfenster ${t.from > 0 && t.from !== -Infinity ? "ab " + absTxt(t.from) : ""}${t.to !== Infinity ? " bis " + absTxt(t.to) : ""} – bitte mit SURVIVORS HOME absprechen.</p><ul class="clist">${cleanTaskLine(t, null)}</ul></section>`).join("");
  const cfg = cleanCfg().slice().sort((a, b) => a.wd - b.wd || a.from.localeCompare(b.from)).map(c => WD[c.wd] + " " + c.from + "–" + c.to).join(", ");
  const stays = stayList().filter(x => x.to >= dp);
  const srow = x => `<tr class="${x.to < today ? "past" : ""}"><td class="t">${WD[wdOf(x.from)]} ${fmtY(x.from)}<br><small>${esc(x.fromT || STAY_IN)} Uhr</small></td><td class="t">${WD[wdOf(x.to)]} ${fmtY(x.to)}<br><small>${esc(x.toT || STAY_OUT)} Uhr</small></td><td class="t">${stayNights(x)}</td><td class="t">${stayN(x)}${vmTag(x) ? "<br>" + vmTag(x) : ""}</td></tr>`;
  const help = `<b>Reinigung</b><ul><li>Reinigungstermine: ${esc(cfg)}${CLEAN ? "" : " (änderbar unter Einstellungen → Reinigung)"}. Feiertag: Einsatz am Tag danach, sonst am Tag davor.</li><li><b>DG</b>: bei Gastwechsel reinigen und Betten für die neue Belegung beziehen; ändert sich die Personenzahl, steht „Bettenwechsel“ dabei. Kommt ein Stammgast ohne Zwischenreinigung${CLEAN ? "" : " (Einstellungen → Reinigung)"} direkt wieder, entfällt die Reinigung; nur bei anderer Personenzahl „Betten umstellen“.</li><li><b>EG</b>: nach jeder Veranstaltung mit Haken „Küchenreinigung“.</li><li>Jede Aufgabe steht beim ersten Reinigungstermin nach der Abreise bzw. Veranstaltung. Liegt kein Termin vor der nächsten Anreise: „Sondereinsatz nötig“.</li>${CLEAN ? "" : "<li>Keine Namen: Die Reinigungsseite zeigt nur Zeiten und Personenzahl.</li>"}<li>„nach Bedarf“: keine besondere Aufgabe – EG oder DG nach Bedarf.</li><li>Vorgemerkte Übernachtungen sind noch nicht sicher.</li></ul>`;
  const link = CLEAN ? "" : `<p class="notes">Diese Ansicht sehen die Reinigungskräfte unter <a href="${esc(CLEAN_URL)}" target="_blank" rel="noopener">${esc(CLEAN_URL.replace("https://", ""))}</a> (mit eigenem Passwort, ohne Namen; Aktualisierung mit der Routine).</p>`;
  return `<div class="head"><h2>Reinigung ${qh(help)}</h2><span class="notes">Reinigungstermine: ${esc(cfg)}</span></div>${link}
  ${sp}
  <h3 class="sh">Nächste Reinigungstermine</h3>
  <div class="cgrid">${next.map(s => cleanCard(s, today)).join("") || `<div class="empty">Keine Reinigungstermine im Zeitraum.</div>`}</div>
  <p><button class="btn" data-cmore="1">weitere 8 Wochen anzeigen</button></p>
  ${past.length ? `<details class="pastl"><summary>Vergangene Reinigungstermine (letzte 4 Wochen, ${past.length})</summary><div class="cgrid">${past.map(s => cleanCard(s, today)).join("")}</div></details>` : ""}
  <h3 class="sh">${BED} Belegung Dachgeschoss</h3>
  ${stays.length ? `<div class="scroll"><table class="list stays cstays"><thead><tr><th>Anreise</th><th>Abreise</th><th>Nächte</th><th>Pers.</th></tr></thead><tbody>${stays.map(srow).join("")}</tbody></table></div><p class="notes">„vorgemerkt“ = noch nicht sicher; ohne Kennzeichen = gebucht.</p>` : `<div class="empty">Keine Übernachtungen eingetragen.</div>`}`;
}
/* ---------- Einstellungen: Reinigung ---------- */
function viewCleanSet(){
  const cfg = cleanCfg(), own = Array.isArray((S.settings || {}).cleanSlots) && S.settings.cleanSlots.length, same = cleanSame();
  const rows = cfg.map((c, i) => `<tr><td>${WD[c.wd]}</td><td class="t">${esc(c.from)}–${esc(c.to)} Uhr</td><td><button class="btn ghost" data-cslotdel="${i}">Entfernen</button></td></tr>`).join("");
  const names = [...new Set(stayList().map(stayName).filter(n => n !== "Gast"))].sort((a, b) => a.localeCompare(b, "de"));
  const srows = same.map(n => `<tr><td><b>${esc(n)}</b></td><td><button class="btn ghost" data-csamedel="${esc(n)}">Entfernen</button></td></tr>`).join("");
  const help = `<b>Reinigung</b><ul><li><b>Reinigungstermine</b>: regelmäßige Einsätze der Reinigungskräfte (Standard Mo und Fr 9–12 Uhr). Feiertag: Einsatz am Tag danach, sonst am Tag davor.</li><li><b>Gäste ohne Zwischenreinigung</b>: Kommt dieser Gast direkt wieder (kein anderer Gast dazwischen), wird das DG nicht gereinigt; bei anderer Personenzahl nur „Betten umstellen“. Name genau wie unter „Übernachtungen“.</li><li><b>Reinigungsseite</b>: eigene Seite für die Reinigungskräfte, eigenes Passwort, ohne Namen.</li></ul>`;
  return `${setNav()}<div class="head"><h2>Reinigung ${qh(help)}</h2></div>
  <h3 class="sh">Reinigungstermine</h3>
  <form class="filters" id="cslotForm"><select class="in" id="csWd" aria-label="Wochentag">${opt([1,2,3,4,5,6].map(d => [String(d), WD[d]]), "1")}</select><input class="in" type="time" id="csFrom" value="09:00" step="900" required aria-label="von"><input class="in" type="time" id="csTo" value="12:00" step="900" required aria-label="bis"><button class="btn primary" type="submit">+ Termin</button>${own ? `<button class="btn ghost" type="button" data-cslotdef="1">Standard (Mo und Fr 9–12 Uhr)</button>` : ""}</form>
  <div class="scroll"><table class="list"><thead><tr><th>Wochentag</th><th>Zeit</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>${own ? "" : `<p class="notes">Standard – noch nicht geändert.</p>`}
  <h3 class="sh">Gäste ohne Zwischenreinigung</h3>
  <form class="filters" id="csameForm"><input class="in" id="csName" list="csNames" placeholder="Name wie unter Übernachtungen" required><datalist id="csNames">${names.map(n => `<option>${esc(n)}</option>`).join("")}</datalist><button class="btn primary" type="submit">+ Gast</button></form>
  ${same.length ? `<div class="scroll"><table class="list"><tbody>${srows}</tbody></table></div>` : `<div class="empty">Keine – nach jedem Gast wird das DG gereinigt.</div>`}
  <h3 class="sh">Reinigungsseite</h3>
  <section class="bkc"><p>Seite für die Reinigungskräfte: <a href="${esc(CLEAN_URL)}" target="_blank" rel="noopener">${esc(CLEAN_URL.replace("https://", ""))}</a> – nur Reinigungstermine, Aufgaben und Belegung des DG (Zeiten, Personenzahl), keine Namen, keine Veranstaltungstitel. Aktualisierung mit der Routine.</p>
  <p>${S.cleanPass ? `<span class="lv info">Passwort gesetzt${S.cleanSet ? " am " + esc(bkWhen(S.cleanSet)) : ""}</span> <details style="display:inline-block"><summary class="notes">anzeigen</summary><code>${esc(S.cleanPass)}</code></details>` : `<span class="lv warn">noch kein Passwort – Reinigungsseite wird nicht erzeugt</span>`}</p>
  <p><input class="in" type="text" id="cleanPw" autocomplete="off" placeholder="neues Passwort (mind. 12 Zeichen)" style="width:100%;max-width:420px"></p><p><button class="btn primary" data-cleanpw="1">Passwort speichern</button></p>
  <p class="notes">Anderes Passwort als die Team-Seite wählen. Gilt ab der nächsten Aktualisierung. Lesbar für alle mit Zugriff auf diesen Planer.</p></section>`;
}
async function saveCleanSlots(l, msg){
  const def = JSON.stringify(CLEAN_DEF), v = l.map(c => ({wd:+c.wd, from:c.from, to:c.to})).sort((a, b) => a.wd - b.wd || a.from.localeCompare(b.from));
  return saveSettings({cleanSlots: !v.length || JSON.stringify(v) === def ? null : v}, msg);
}
document.addEventListener("click", async ev => {
  const t = ev.target.closest("[data-cmore],[data-cslotdel],[data-cslotdef],[data-csamedel],[data-cleanpw]"); if (!t) return;
  const ds = t.dataset;
  if (ds.cmore){ UI.cleanWeeks = (UI.cleanWeeks || 8) + 8; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (ds.cslotdel != null){ const l = cleanCfg().filter((_, i) => i !== +ds.cslotdel); if (!l.length){ toast("Mindestens ein Reinigungstermin nötig"); return; } return saveCleanSlots(l, "Reinigungstermin entfernt"); }
  if (ds.cslotdef) return saveSettings({cleanSlots:null}, "Standard-Reinigungstermine");
  if (ds.csamedel != null) return saveSettings({cleanSame: cleanSame().filter(n => n !== ds.csamedel)}, "Gast entfernt");
  if (ds.cleanpw){ const v = ($("#cleanPw").value || "").trim(); if (v.length < 12){ toast("Mindestens 12 Zeichen"); return; } if (!db){ toast("Nur im Online-Tool möglich"); return; }
    if (v === S.teamPass){ toast("Bitte ein anderes Passwort als für die Team-Seite"); return; }
    try { await db.doc("meta/clean").set({pass:v, set:localIso()}); toast("Passwort Reinigungsseite gespeichert – gilt ab der nächsten Aktualisierung"); } catch(e){ toast("Passwort nicht gespeichert"); } }
});
document.addEventListener("submit", async ev => {
  if (ev.target.id === "cslotForm"){ ev.preventDefault();
    const c = {wd:+$("#csWd").value, from:$("#csFrom").value, to:$("#csTo").value};
    if (!c.from || !c.to || c.from >= c.to){ toast("Nicht gespeichert – „von“ muss vor „bis“ liegen"); return; }
    if (cleanCfg().some(x => +x.wd === c.wd && x.from < c.to && c.from < x.to)){ toast("Überschneidet sich mit einem vorhandenen Termin am " + WD[c.wd]); return; }
    return saveCleanSlots(cleanCfg().concat([c]), "Reinigungstermin eingetragen"); }
  if (ev.target.id === "csameForm"){ ev.preventDefault();
    const n = ($("#csName").value || "").trim(); if (!n) return;
    if (cleanSame().some(x => x.toLowerCase() === n.toLowerCase())){ toast("Schon eingetragen"); return; }
    return saveSettings({cleanSame: cleanSame().concat([n]).sort((a, b) => a.localeCompare(b, "de"))}, "Gast eingetragen"); }
});
/* Reinigungsseite: nur diese Ansicht, ohne Reiter und Kopfzahlen */
function cleanInit(){
  document.body.classList.add("clean"); document.title = "SH Reinigung";
  const h = $("header.top h1"); if (h) h.innerHTML = `Reinigung<small>SURVIVORS HOME · Erdgeschoss und Dachgeschoss</small>`;
  const t = window.__SHP_DATA || null; if (validBackup(t)) applyBackupLocal(t); else S.loaded = true;
  const b = $("#banner"); if (b && t && t.created){ const old = (Date.now() - new Date(t.created).getTime()) / 36e5 > 72; b.hidden = false; b.className = old ? "offbar cold" : "offbar"; b.innerHTML = `Stand der Daten: ${esc(bkWhen(t.created))}${old ? " – <b>veraltet, bitte bei SURVIVORS HOME melden</b>" : ""} · <a href="#" data-tlogout="1">abmelden</a>`; }
  UI.view = "reinigung"; render();
}
/* ---------- Start ---------- */
(function init(){
  try { const v = localStorage.getItem("shp-view"); if (v && VIEWS[v]) UI.view = v === "anfragen" ? "referenten" : v; UI.yearDetail = localStorage.getItem("shp-ydet") === "1"; UI.yPos = localStorage.getItem("shp-ypos") || null; UI.week = localStorage.getItem("shp-week") || UI.week; UI.yRestore = UI.view === "jahr"; } catch(e){}
  applySettings();
  mobInit();
  if (CLEAN) return cleanInit();
  if (OFFLINE) return offlineInit();
  render();
  const bridge = window.claude && window.claude.use ? window.claude : null;
  if (!bridge){ $("#banner").hidden = false; $("#banner").textContent = "Gemeinsame Datenbank nicht verfügbar. Bitte das Tool über claude.ai öffnen."; return; }
  bridge.use("downloads").then(d => downloads = d).catch(() => {});
  bridge.use("db").then(d => {
    if (!d){ $("#banner").hidden = false; $("#banner").textContent = "Gemeinsame Datenbank nicht verfügbar. Bitte mit dem SURVIVORS HOME Konto anmelden."; S.loaded = true; render(); return; }
    setTimeout(() => { if (!S.loaded){ S.loaded = true; render(); } }, 8000);
    db = d;
    const pending = new Set(["series","referents","events","absences","weeks","rounds","msgs","settings"]);
    const done = k => { pending.delete(k); if (!pending.size){ S.loaded = true; } render(); };
    const sub = (col, key) => db.collection(col).onSnapshot(snap => {
      const m = {}; snap.docs.forEach(x => { const o = normRooms(Object.assign({}, x.data())); o.id = x.id; m[x.id] = o; }); S[key] = m; done(key);
    }, err => { $("#banner").hidden = false; $("#banner").textContent = "Verbindung zur Datenbank unterbrochen. Seite neu laden."; });
    sub("series","series"); sub("referents","referents"); sub("events","events"); sub("absences","absences"); sub("rounds","rounds"); sub("msgs","msgs");
    db.doc("meta/accepted").onSnapshot(snap => { S.accepted = snap.exists ? Object.assign({}, (snap.data()||{}).items||{}) : {}; render(); }, () => {});
    db.doc("meta/team").onSnapshot(snap => { const t = snap.exists ? (snap.data() || {}) : {}; S.teamPass = t.pass || ""; S.teamSet = t.set || ""; if (UI.view === "sicherung") render(); }, () => {});
    db.doc("meta/clean").onSnapshot(snap => { const t = snap.exists ? (snap.data() || {}) : {}; S.cleanPass = t.pass || ""; S.cleanSet = t.set || ""; if (UI.view === "creinigung") render(); }, () => {});
    db.doc("meta/websync").onSnapshot(snap => { S.websync = snap.exists ? (snap.data() || {}) : null; S.wsLoaded = true; if (S.loaded) render(); }, () => {});
    db.doc("meta/settings").onSnapshot(snap => { S.settings = snap.exists ? Object.assign({}, snap.data() || {}) : {}; applySettings(); done("settings"); }, () => done("settings"));
    db.doc("meta/stays").onSnapshot(snap => { const v = snap.exists ? (snap.data() || {}) : {}; S.stays = Object.assign({}, v.items || {}); S.fairs = Object.assign({}, v.fairs || {}); if (S.loaded) render(); }, () => {});
    db.doc("meta/weeks").onSnapshot(snap => { S.weeks = snap.exists ? Object.assign({}, (snap.data()||{}).status||{}) : {}; done("weeks"); }, () => {});
  });
})();

document.addEventListener("change", ev => { if (ev.target.dataset && ev.target.dataset.altrg){ UI.altRange = ev.target.value; const sy = window.scrollY; render(); window.scrollTo(0, sy); } });
