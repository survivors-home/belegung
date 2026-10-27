#!/usr/bin/env python3
"""SURVIVORS HOME – Belegungsplan für Externe.

Erzeugt index.html aus einem Datenbank-Export des internen Programmplaners.
Aufruf:  python3 tools/build.py <export-ordner> [ausgabe.html]
Der Export-Ordner enthält events/*.json, series/*.json, absences/*.json, meta/weeks.json
(so, wie ihn das Datenbank-Werkzeug von Claude speichert).

Veröffentlicht werden NUR: Datum, belegte Zeit des Hauses (inkl. Auf-/Abbau, Check-in, Nachlauf),
Themenbereich, Zustand (vorgemerkt/fest), Titel nur bei Status „veröffentlicht“.
Keine Räume, Referenten, Notizen, Ideen, Absagen, Anlässe von Sperrtagen.
"""
import json, os, sys, glob, datetime, html
from zoneinfo import ZoneInfo

# ---------- Einstellungen ----------
CONTACT = "veranstaltung@survivors-home.de"
EVENTS_URL = ""        # Platzhalter: öffentlicher Link zur Veranstaltungsseite (folgt)
IMPRESSUM_URL = ""     # Platzhalter: Link zum Impressum von survivors-home.de (folgt)
DATENSCHUTZ_URL = ""   # Platzhalter: Link zur Datenschutzerklärung (folgt)
FEST = {"zugesagt", "fix", "in WP angelegt", "veröffentlicht"}
VORGEMERKT = {"Option", "angefragt"}
THEMES = ["Angehörige","Beruf & Soziales","Bewegung","Ernährung","Film & Foto","Forschung & Wissen","Geist & Seele",
          "Kreativität","Kunst & Kultur","Leben & Erfahrung","Musik","Themenoffen","Unterhaltung","Sonstige"]
FEIER = {"2026-12-25":"1. Weihnachtstag","2026-12-26":"2. Weihnachtstag",
  "2027-01-01":"Neujahr","2027-03-08":"Frauentag","2027-03-26":"Karfreitag","2027-03-29":"Ostermontag","2027-05-01":"1. Mai",
  "2027-05-06":"Christi Himmelfahrt","2027-05-17":"Pfingstmontag","2027-10-03":"Tag der Deutschen Einheit","2027-12-25":"1. Weihnachtstag",
  "2027-12-26":"2. Weihnachtstag","2028-01-01":"Neujahr"}
FERIEN = [["2026-12-23","2027-01-02","Weihnachtsferien"],["2027-02-01","2027-02-06","Winterferien"],["2027-03-22","2027-04-02","Osterferien"],
  ["2027-05-07","2027-05-07","unterrichtsfrei"],["2027-05-18","2027-05-19","unterrichtsfrei"],["2027-07-01","2027-08-14","Sommerferien"],
  ["2027-10-11","2027-10-23","Herbstferien"],["2027-12-22","2027-12-31","Weihnachtsferien"]]

def load(folder, col):
    out = {}
    for f in glob.glob(os.path.join(folder, col, "*.json")):
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
        if isinstance(d, dict) and "data" in d and isinstance(d["data"], dict):
            d = d["data"]
        out[os.path.splitext(os.path.basename(f))[0]] = d
    return out

def t2m(t):
    return int(t[:2]) * 60 + int(t[3:5])

def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None

def pick(e, s, key):
    v = e.get(key)
    if v is not None and v != "":
        return v
    return s.get(key)

def build(folder, out_path):
    tz = ZoneInfo("Europe/Berlin")
    now = datetime.datetime.now(tz)
    today = now.date().isoformat()
    events, series, absences = load(folder, "events"), load(folder, "series"), load(folder, "absences")
    if not events or not series:
        sys.exit("Abbruch: Export enthält keine Termine oder Reihen – Seite wird nicht überschrieben.")
    weeks_doc = {}
    wp = os.path.join(folder, "meta", "weeks.json")
    if os.path.exists(wp):
        with open(wp, encoding="utf-8") as fh:
            w = json.load(fh)
        weeks_doc = (w.get("data", w) or {}).get("status", {}) or {}

    ev = []
    for e in events.values():
        if not e or not e.get("date") or e.get("date") < today:
            continue
        kind, status = e.get("kind") or "va", e.get("status") or ""
        if kind == "notiz" or status not in FEST | VORGEMERKT:
            continue
        s = series.get(e.get("seriesId") or "", {}) or {}
        room = e.get("room") or ""
        if room == "online":
            continue                                   # reine Online-Termine belegen das Haus nicht
        x = {"d": e["date"], "f": 1 if status in FEST else 0}
        if kind == "vermietung":
            x["m"] = 1
        else:
            th = e.get("theme") if e.get("theme") in THEMES else "Sonstige"
            x["t"] = THEMES.index(th)
        if status == "veröffentlicht" and kind != "vermietung":
            x["n"] = e.get("title") or s.get("name") or ""
        if e.get("allDay"):
            x.update({"s": 540, "e": 1260, "a": 540, "b": 1260, "g": 1})
        elif e.get("start"):
            st = t2m(e["start"]); dur = num(e.get("dur")) or 60; en = st + dur
            setup = num(pick(e, s, "setup"))
            if setup is None:
                setup = 300 if e.get("hybrid") else 0
            form = s.get("form") or e.get("form")
            checkin = pick(e, s, "checkin") or ("durchgehend" if form == "Beratung" else "vorher")
            pre = max(setup, 30 if checkin != "keiner" else 0)
            after = num(pick(e, s, "after")) or 0
            teardown = num(pick(e, s, "teardown")) or 0
            x.update({"s": st, "e": int(en), "a": int(st - pre), "b": int(en + after + teardown)})
        else:
            x["z"] = 1                                  # Uhrzeit noch offen
        ev.append(x)
    ev.sort(key=lambda x: (x["d"], x.get("a", 9999)))

    closed = set()
    for a in absences.values():
        if a and a.get("block") and a.get("from"):
            d0 = datetime.date.fromisoformat(a["from"]); d1 = datetime.date.fromisoformat(a.get("to") or a["from"])
            while d0 <= d1:
                closed.add(d0.isoformat()); d0 += datetime.timedelta(days=1)
    for e in events.values():
        if e and e.get("kind") == "notiz" and e.get("blockDay") and e.get("status") != "abgesagt" and e.get("date"):
            closed.add(e["date"])
    last = max([x["d"] for x in ev] + [today])
    end = last[:4] + "-12-31"
    data = {
        "upd": now.strftime("%d.%m.%Y, %H:%M"), "from": today, "to": end, "ev": ev,
        "closed": sorted(c for c in closed if today <= c <= end),
        "pause": sorted(k for k, v in weeks_doc.items() if v == "pause"),
        "quiet": sorted(k for k, v in weeks_doc.items() if v == "ruhig"),   # ruhige Wochen: extern „nicht verfügbar“
        "feier": {k: v for k, v in FEIER.items() if today <= k <= end},
        "ferien": [f for f in FERIEN if f[1] >= today and f[0] <= end],
        "themes": THEMES, "contact": CONTACT, "eventsUrl": EVENTS_URL, "impressum": IMPRESSUM_URL, "datenschutz": DATENSCHUTZ_URL,
    }
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, "template.html"), encoding="utf-8") as fh:
        tpl = fh.read()
    with open(os.path.join(here, "logo.svg.part"), encoding="utf-8") as fh:
        logo = fh.read()
    js = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    out = tpl.replace("<!--LOGO-->", logo).replace("/*DATA*/null", js)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"{out_path}: {len(ev)} Termine, {len(data['closed'])} Sperrtage, Stand {data['upd']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "index.html"))
