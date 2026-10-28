#!/usr/bin/env node
/* SURVIVORS HOME – Team-Seite: verschlüsselte Daten für team/data.json
   Aufruf: node tools/team/build.mjs <export-ordner> [team/data.json]
   Liest den Datenbank-Export (wie tools/build.py) inkl. referents und meta/team.json (Passwort).
   Ohne Passwort: nichts schreiben (Team-Seite bleibt unverändert), Exit 0.
   Verschlüsselung: PBKDF2-SHA256 (310 000 Runden) → AES-256-GCM; nur Node-Bordmittel. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [,, dir, outArg] = process.argv;
if (!dir){ console.error("Aufruf: node tools/team/build.mjs <export-ordner> [team/data.json]"); process.exit(2); }
const out = outArg || path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "team", "data.json");
const load = col => { const d = path.join(dir, col), m = {}; if (!fs.existsSync(d)) return m;
  for (const f of fs.readdirSync(d)) { if (!f.endsWith(".json")) continue; let o = JSON.parse(fs.readFileSync(path.join(d, f), "utf8"));
    if (o && typeof o.data === "object" && o.data) o = o.data; const id = f.slice(0, -5); m[id] = Object.assign({}, o, {id}); } return m; };
const events = load("events"), series = load("series"), absences = load("absences"), referentsRaw = load("referents"), meta = load("meta");
const pass = ((meta.team || {}).pass || "").trim();
if (!pass){ console.log("Team-Seite: kein Team-Passwort gesetzt – unverändert."); process.exit(0); }
if (!Object.keys(events).length || !Object.keys(series).length){ console.error("Abbruch: Export ohne Termine oder Reihen – Team-Seite unverändert."); process.exit(1); }
/* Datensparsam: Kontaktdaten und Freitext der Referenten entfernen (für Prüfregeln reichen Name und Verfügbarkeiten) */
const DROP = ["email","phone","mobile","contact","salutation","notes","address","role"];
const referents = {}; for (const [id, r] of Object.entries(referentsRaw)) { const x = Object.assign({}, r); DROP.forEach(k => delete x[k]); referents[id] = x; }
const now = new Date(), berlin = new Date(now.toLocaleString("en-US", {timeZone:"Europe/Berlin"}));
const p2 = n => String(n).padStart(2, "0");
const created = `${berlin.getFullYear()}-${p2(berlin.getMonth()+1)}-${p2(berlin.getDate())}T${p2(berlin.getHours())}:${p2(berlin.getMinutes())}:00`;
const backup = {format:"survivors-home-programmplaner-backup", version:1, created, source:"team",
  collections:{events, series, referents, absences, rounds:{}, msgs:{}},
  meta:{accepted:{items:(meta.accepted || {}).items || {}}, weeks:{status:(meta.weeks || {}).status || {}}}};
const iter = 310000, salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pass, salt, iter, 32, "sha256");
const c = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([c.update(JSON.stringify(backup), "utf8"), c.final(), c.getAuthTag()]);
fs.writeFileSync(out, JSON.stringify({v:1, kdf:"PBKDF2-SHA256", iter, salt:salt.toString("base64"), iv:iv.toString("base64"), ct:ct.toString("base64"), created}));
console.log(`${out}: Team-Seite ${Object.keys(events).length} Termine, Stand ${created}`);
