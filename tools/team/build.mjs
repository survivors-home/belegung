#!/usr/bin/env node
/* SURVIVORS HOME – Team-Seite: verschlüsselte Daten für team/data.json, Reinigungsseite: reinigung/data.json (ab v125),
   Notfall-Planer: notfall/data.json (ab v139)
   Aufruf: node tools/team/build.mjs <export-ordner> [team/data.json] [reinigung/data.json] [notfall/data.json]
   Liest den Datenbank-Export (wie tools/build.py) inkl. referents, meta/team.json (Team-Passwort), meta/clean.json (Passwort Reinigungsseite)
   und meta/notfall.json (Passwort Notfall-Planer).
   Ohne Passwort: die jeweilige Datei nicht schreiben (Seite bleibt unverändert), Exit 0.
   Verschlüsselung: PBKDF2-SHA256 (310 000 Runden) → AES-256-GCM; nur Node-Bordmittel. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [,, dir, outArg, cleanArg, notArg] = process.argv;
if (!dir){ console.error("Aufruf: node tools/team/build.mjs <export-ordner> [team/data.json]"); process.exit(2); }
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const out = outArg || path.join(ROOT, "team", "data.json"), cleanOut = cleanArg || path.join(ROOT, "reinigung", "data.json"), notOut = notArg || path.join(ROOT, "notfall", "data.json");
const load = col => { const d = path.join(dir, col), m = {}; if (!fs.existsSync(d)) return m;
  for (const f of fs.readdirSync(d)) { if (!f.endsWith(".json")) continue; let o = JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
    if (o && typeof o.data === "object" && o.data) o = o.data; const id = f.slice(0, -5); m[id] = Object.assign({}, o, {id}); } return m; };
const events = load("events"), series = load("series"), absences = load("absences"), referentsRaw = load("referents"), meta = load("meta");
const rounds = load("rounds"), msgs = load("msgs"); /* ab Planer v139 in der Datenkopie, sonst leer */
const pass = ((meta.team || {}).pass || "").trim(), cleanPass = ((meta.clean || {}).pass || "").trim(), notPass = ((meta.notfall || {}).pass || "").trim();
if (!pass && !cleanPass && !notPass){ console.log("Team-Seite, Reinigungsseite und Notfall-Planer: kein Passwort gesetzt – unverändert."); process.exit(0); }
if (!Object.keys(events).length || !Object.keys(series).length){ console.error("Abbruch: Export ohne Termine oder Reihen – Team-Seite und Reinigungsseite unverändert."); process.exit(1); }
if (pass && cleanPass && pass === cleanPass){ console.error("Abbruch: Reinigungsseite und Team-Seite haben dasselbe Passwort – bitte im Planer ändern. Beide Seiten unverändert."); process.exit(1); }
/* Datensparsam: Kontaktdaten und Freitext der Referenten entfernen (für Prüfregeln reichen Name und Verfügbarkeiten) */
const DROP = ["email","phone","mobile","contact","salutation","notes","address","role"];
const referents = {}; for (const [id, r] of Object.entries(referentsRaw)) { const x = Object.assign({}, r); DROP.forEach(k => delete x[k]); referents[id] = x; }
const now = new Date(), berlin = new Date(now.toLocaleString("en-US", {timeZone:"Europe/Berlin"}));
const p2 = n => String(n).padStart(2, "0");
const nowIso = `${berlin.getFullYear()}-${p2(berlin.getMonth()+1)}-${p2(berlin.getDate())}T${p2(berlin.getHours())}:${p2(berlin.getMinutes())}:00`;
/* ab Planer v136: Stand = Zeitpunkt der Datenkopie (Datei STAND aus tools/snapshot.py), damit die Datenstand-Warnung ehrlich bleibt */
const standFile = path.join(dir, "STAND"), standRaw = fs.existsSync(standFile) ? fs.readFileSync(standFile, "utf8").trim().slice(0, 16) : "";
const created = /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(standRaw) ? standRaw + ":00" : nowIso;
const settings = meta.settings ? Object.fromEntries(Object.entries(meta.settings).filter(([k]) => k !== "id")) : null;
const backup = {format:"survivors-home-programmplaner-backup", version:1, created, source:"team",
  collections:{events, series, referents, absences, rounds:{}, msgs:{}},
  meta:{accepted:{items:(meta.accepted || {}).items || {}}, weeks:{status:(meta.weeks || {}).status || {}}, ...(settings ? {settings} : {}),
    /* v121: Übernachtungsgäste im Dachgeschoss (mit Namen, Sebastian 02.11.2026) und Messen – nur Team-Seite, nie öffentliche Seite */
    ...(meta.stays ? {stays:{items:meta.stays.items || {}, fairs:meta.stays.fairs || {}}} : {})}};
function seal(pw, obj, file){
  const iter = 310000, salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pw, salt, iter, 32, "sha256");
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final(), c.getAuthTag()]);
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, JSON.stringify({v:1, kdf:"PBKDF2-SHA256", iter, salt:salt.toString("base64"), iv:iv.toString("base64"), ct:ct.toString("base64"), created}));
}
if (pass){ seal(pass, backup, out); console.log(`${out}: Team-Seite ${Object.keys(events).length} Termine, Stand ${created}`); }
else console.log("Team-Seite: kein Team-Passwort gesetzt – unverändert.");

/* v125 Reinigungsseite (externe Reinigungskräfte, Sebastian 02.11.2026): nur Übernachtungen im DG ohne Notizen;
   Namen durch Kürzel G1, G2 … ersetzt – außer Gästen ohne Zwischenreinigung (meta/settings.cleanSame, z. B. Nadja), deren Name
   in der Zeitleiste erscheint (v126, Sebastian 02.11.2026). Messen nicht,
   von den Terminen nur die mit „Küchenreinigung“ und nur Datum, Zeit, Raum, Status – keine Titel, Reihen, Referenten. */
if (cleanPass){
  const items = ((meta.stays || {}).items) || {}, nm = x => String((x && x.name) || "").trim();
  const st = settings || {}, keep = new Set((Array.isArray(st.cleanSame) ? st.cleanSame : []).map(n => String(n || "").trim().toLowerCase()).filter(Boolean));
  const names = [...new Set(Object.values(items).map(nm))].sort(), ps = Object.fromEntries(names.map((n, i) => [n, keep.has(n.toLowerCase()) ? n : "G" + (i + 1)]));
  const psL = Object.fromEntries(names.map(n => [n.toLowerCase(), ps[n]]));
  const cItems = {}; for (const [id, x] of Object.entries(items)){ const y = {}; ["from","fromT","to","toT","persons","status"].forEach(k => { if (x[k] != null) y[k] = x[k]; }); y.name = ps[nm(x)]; cItems["s" + (Object.keys(cItems).length + 1)] = y; }
  const cEv = {}; for (const e of Object.values(events)){ if (!e.kitchenClean || !e.date) continue; const y = {}; ["date","start","dur","allDay","room","status","kind","kitchenClean"].forEach(k => { if (e[k] != null) y[k] = e[k]; }); cEv["k" + (Object.keys(cEv).length + 1)] = y; }
  const cSet = {};
  ["cleanSlots","cleanEx","feierExtra"].forEach(k => { if (st[k] != null) cSet[k] = st[k]; }); /* cleanEx: einzelne Termine verschoben/entfällt (v135) */
  if (Array.isArray(st.cleanSame)) cSet.cleanSame = st.cleanSame.map(n => psL[String(n || "").trim().toLowerCase()]).filter(Boolean);
  const clean = {format:"survivors-home-programmplaner-backup", version:1, created, source:"clean",
    collections:{events:cEv, series:{}, referents:{}, absences:{}, rounds:{}, msgs:{}}, meta:{settings:cSet, stays:{items:cItems, fairs:{}}}};
  seal(cleanPass, clean, cleanOut);
  console.log(`${cleanOut}: Reinigungsseite ${Object.keys(cItems).length} Übernachtungen, ${Object.keys(cEv).length} Termine mit Küchenreinigung, Stand ${created}`);
} else console.log("Reinigungsseite: kein Passwort gesetzt – unverändert.");


/* v139 Notfall-Planer (Sebastian 06.11.2026): vollständiger Datenbestand (inkl. Referenten-Kontakten, Anfrage-Runden, Nachrichten)
   für den Fall, dass der Planer in Claude nicht erreichbar ist. Eigenes Passwort (nur Bearbeiter), nie gleich Team-/Reinigungs-Passwort.
   Ohne Passwörter (meta/team, meta/clean, meta/notfall) und ohne meta/snapshot. Wird als Ausgangsstand („base“) für das spätere Einspielen genutzt. */
if (notPass && (notPass === pass || notPass === cleanPass)){
  console.log("Notfall-Planer: Passwort gleich wie Team- oder Reinigungsseite – nicht erzeugt (bitte im Planer ändern).");
} else if (notPass){
  const clip = o => Object.fromEntries(Object.entries(o || {}).filter(([k]) => k !== "id"));
  const nb = {format:"survivors-home-programmplaner-backup", version:1, created, source:"notfall",
    collections:{events, series, referents:referentsRaw, absences, rounds, msgs},
    meta:{accepted:{items:(meta.accepted || {}).items || {}}, weeks:{status:(meta.weeks || {}).status || {}}, ...(settings ? {settings} : {}),
      ...(meta.stays ? {stays:{items:meta.stays.items || {}, fairs:meta.stays.fairs || {}}} : {}),
      ...(meta.websync ? {websync:clip(meta.websync)} : {})}};
  seal(notPass, nb, notOut);
  console.log(`${notOut}: Notfall-Planer ${Object.keys(events).length} Termine, ${Object.keys(referentsRaw).length} Referenten, ${Object.keys(msgs).length} Nachrichten, Stand ${created}`);
} else console.log("Notfall-Planer: kein Passwort gesetzt – unverändert.");
