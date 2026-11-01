#!/usr/bin/env python3
"""SURVIVORS HOME – Website-Abgleich (survivors-home.de → Programmplaner), ab Planer v112.

Aufruf:  python3 tools/websync.py <export-ordner> <plan.json> [--slots 5,13] [--web datei.json] [--today JJJJ-MM-TT]
- --slots: Abgleich nur, wenn die Ortszeit (Europe/Berlin) in einer dieser Stunden oder der Stunde danach liegt
  (Routine läuft öfter; Abgleich zweimal täglich). Sonst plan.json mit "skip": true und Exit 0.
- <export-ordner>: Datenbank-Export wie für build.py (events/, series/, meta/websync.json falls vorhanden)
- ohne --web: ruft https://survivors-home.de/wp-json/events/by ab (heute − 30 Tage bis heute + 24 Monate)
- schreibt NICHTS in die Datenbank. Ergebnis <plan.json>:
    {"ok": bool, "batches": [[{op, collection, doc_id, data}, …≤ 50], …], "summary": {...}, "text": "…"}
  Die Schreibvorgänge führt die Routine mit ArtifactData "batch" aus (je Eintrag if_version = Version aus dem Export-Listing).
  Letzter Batch enthält immer meta/websync (Protokoll + Listen für den Planer).

Regeln (abgestimmt mit Sebastian, 01.11.2026):
- Zuordnung einmalig über Datum + Beginn, danach fest über die WordPress-ID (Feld `web` am Termin).
  1. Kandidaten: Art Veranstaltung, nicht abgesagt, ohne Website-Zuordnung (oder automatisch zugeordnet, aber ID nicht mehr online).
  2. Gleicher Tag + gleicher Beginn: ein Kandidat → zuordnen (Titel egal); mehrere → ähnlichster Titel/Reihenname, sonst „nicht eindeutig“.
  3. Gleicher Tag, Beginn ≤ 60 Min anders, Titel ähnlich (≥ 0,45) → zuordnen (Planer zeigt die Abweichung als Hinweis).
  4. Jeder Website-Termin höchstens einem Planer-Termin und umgekehrt; Rest = „nur auf der Website“ (nur Liste, nichts anlegen).
- Manuell gesetzter Link (`web.src = "manuell"`) wird nie überschrieben; passt die Adresse zu einem Website-Termin, werden nur ID/Zeit/Titel ergänzt.
- Status nur hochsetzen auf „veröffentlicht“, nie zurück. Abgesagte Termine werden nicht angefasst.
- Zeitraum: ab dem späteren von (heute − 30 Tage, erster Planer-Termin); Listen „nur Website“/„nicht eindeutig“ nur ab heute.
- „veröffentlicht, aber nicht (mehr) online“: Status veröffentlicht, im Abrufzeitraum, nicht automatisch einem Online-Termin zugeordnet.
- Titel-Abweichungen werden nicht gemeldet (Planer-Titel sind interne Kurztitel).
"""
import json, os, sys, glob, re, html, datetime, difflib, unicodedata, urllib.request, urllib.parse
from zoneinfo import ZoneInfo

ENDPOINT = "https://survivors-home.de/wp-json/events/by"
STATUS = ["Idee", "Option", "angefragt", "zugesagt", "fix", "in WP angelegt", "veröffentlicht", "abgesagt"]
PUB = STATUS.index("veröffentlicht")
TOL_MIN, SIM_MIN, SIM_GAP = 60, 0.45, 0.10
BATCH = 50


def load(folder, col):
    out = {}
    for f in glob.glob(os.path.join(folder, col, "*.json")):
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
        if isinstance(d, dict) and "data" in d and isinstance(d["data"], dict):
            d = d["data"]
        out[os.path.splitext(os.path.basename(f))[0]] = d
    return out


def clean(s):
    s = html.unescape(re.sub(r"<[^>]+>", "", s or "")).replace("\xad", "")
    return " ".join(s.split())


def norm(s):
    s = unicodedata.normalize("NFKC", clean(s)).lower()
    return " ".join(re.sub(r"[–—\-:,.!?„“\"'()/+&]", " ", s).split())


def sim(a, b):
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


def t2m(t):
    return int(t[:2]) * 60 + int(t[3:5])


def url_key(u):
    return (u or "").strip().lower().split("#")[0].split("?")[0].rstrip("/")


def fetch(d_from, d_to):
    q = urllib.parse.urlencode({"earliest-date": d_from + " 00:00:00", "latest-date": d_to + " 23:59:59"})
    req = urllib.request.Request(ENDPOINT + "?" + q, headers={"User-Agent": "SURVIVORS-HOME-Planer-Abgleich/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status}")
        return json.loads(r.read().decode("utf-8"))


def parse_web(raw):
    out = []
    for x in raw:
        pd = x.get("post_data")
        if isinstance(pd, str):
            pd = json.loads(pd)
        pd = pd or {}
        st = (pd.get("event_start") or "").strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$", st) or pd.get("is_private"):
            continue
        out.append({"id": int(x["id"]), "url": x.get("permalink") or "", "title": clean(x.get("title")),
                    "at": st, "date": st[:10], "start": st[11:]})
    return out


def plan(events, series, prev, web, d_from, d_to, now_iso, today, ok=True, err=""):
    writes, S = {}, {"neu": 0, "aktualisiert": 0, "hochgesetzt": 0}
    online = {w["id"]: w for w in web}
    by_url = {url_key(w["url"]): w for w in web}
    taken_web = set()

    def setw(e, web_obj, raise_status):
        d = {}
        if web_obj != (e.get("web") or None):
            d["web"] = web_obj
        st = e.get("status") or ""
        if raise_status and st in STATUS and STATUS.index(st) < PUB:
            d["status"] = "veröffentlicht"; S["hochgesetzt"] += 1
        if d:
            writes[e["id"]] = d
        return d

    def wobj(w, src="auto", url=None):
        return {"id": w["id"], "url": url if url is not None else w["url"], "at": w["at"], "title": w["title"], "src": src}

    act = [e for e in events.values() if e.get("id") and (e.get("kind") or "va") == "va" and e.get("status") != "abgesagt" and e.get("date")]
    linked, cand = set(), []
    for e in act:
        wv = e.get("web") or {}
        if wv.get("src") == "manuell":
            w = by_url.get(url_key(wv.get("url")))
            if w and w["id"] not in taken_web:
                taken_web.add(w["id"]); linked.add(e["id"])
                if setw(e, wobj(w, "manuell", wv.get("url")), True).get("web"):
                    S["aktualisiert"] += 1
            continue
        wid = wv.get("id")
        if wid in online and wid not in taken_web:
            taken_web.add(wid); linked.add(e["id"])
            if setw(e, wobj(online[wid]), True).get("web"):
                S["aktualisiert"] += 1
            continue
        if d_from <= e["date"] <= d_to:
            cand.append(e)

    def names(e):
        s = series.get(e.get("seriesId") or "", {}) or {}
        return [n for n in (e.get("title"), s.get("name")) if n]

    def score(e, w):
        return max([sim(n, w["title"]) for n in names(e)] or [0])

    free_web = [w for w in web if w["id"] not in taken_web]
    pairs = []
    for w in free_web:
        for e in cand:
            if e["date"] != w["date"] or not e.get("start") or e.get("allDay"):
                continue
            dm = abs(t2m(e["start"]) - t2m(w["start"])); sc = score(e, w)
            if dm == 0:
                pairs.append((0, -sc, w["at"], w["id"], e["id"], sc))
            elif dm <= TOL_MIN and sc >= SIM_MIN:
                pairs.append((1, -sc, w["at"], w["id"], e["id"], sc))
    pairs.sort()
    unclear, done_e = [], set()
    ev_by = {e["id"]: e for e in cand}
    for lvl, _, _, wid, eid, sc in pairs:
        if wid in taken_web or eid in done_e:
            continue
        # gleicher Beginn, mehrere freie Kandidaten mit fast gleicher Titel-Ähnlichkeit → nicht raten
        rivals = [p for p in pairs if p[0] == lvl == 0 and p[3] == wid and p[4] != eid and p[4] not in done_e and sc - p[5] < SIM_GAP]
        if rivals:
            w = online[wid]; taken_web.add(wid)
            unclear.append({"id": wid, "url": w["url"], "title": w["title"], "at": w["at"], "cands": [eid] + [p[4] for p in rivals]})
            continue
        taken_web.add(wid); done_e.add(eid); linked.add(eid); S["neu"] += 1
        setw(ev_by[eid], wobj(online[wid]), True)

    only_web = [{"id": w["id"], "url": w["url"], "title": w["title"], "at": w["at"]} for w in sorted(web, key=lambda w: w["at"])
                if w["id"] not in taken_web and w["date"] >= today]
    unclear = [u for u in unclear if u["at"][:10] >= today]
    gone = sorted(e["id"] for e in act if e.get("status") == "veröffentlicht" and d_from <= e["date"] <= d_to
                  and e["id"] not in linked and (e.get("web") or {}).get("src") != "manuell")
    prev = prev or {}
    meta = {"at": now_iso, "ok": ok, "okAt": now_iso if ok else prev.get("okAt", ""), "err": err, "n": len(web),
            "from": d_from, "to": d_to, "onlyWeb": only_web if ok else prev.get("onlyWeb", []),
            "gone": gone if ok else prev.get("gone", []), "unclear": unclear if ok else prev.get("unclear", [])}
    summary = dict(S, website=len(web), nurWebsite=len(meta["onlyWeb"]), nichtOnline=len(meta["gone"]),
                   unklar=len(meta["unclear"]), schreibvorgaenge=len(writes) + 1)
    return writes, meta, summary


def main():
    a = sys.argv[1:]
    opt = {}
    for k in ("--web", "--today", "--slots"):
        if k in a:
            i = a.index(k); opt[k] = a[i + 1]; del a[i:i + 2]
    if len(a) != 2:
        sys.exit(__doc__)
    folder, out = a
    tz = ZoneInfo("Europe/Berlin"); now = datetime.datetime.now(tz)
    if "--slots" in opt:
        hours = {int(h) for h in opt["--slots"].split(",") if h.strip()}
        if not any(now.hour in (h, h + 1) for h in hours):
            text = f"Kein Website-Abgleich in diesem Lauf ({now:%H:%M} Uhr; nur um {', '.join(f'{h}:xx' for h in sorted(hours))})."
            with open(out, "w", encoding="utf-8") as fh:
                json.dump({"ok": True, "skip": True, "batches": [], "summary": {}, "text": text}, fh, ensure_ascii=False)
            print(text); return
    today = datetime.date.fromisoformat(opt["--today"]) if "--today" in opt else now.date()
    d_from = (today - datetime.timedelta(days=30)).isoformat()
    d_to = (today + datetime.timedelta(days=730)).isoformat()
    events, series = load(folder, "events"), load(folder, "series")
    pw = os.path.join(folder, "meta", "websync.json"); prev = {}
    if os.path.exists(pw):
        with open(pw, encoding="utf-8") as fh:
            prev = json.load(fh); prev = prev.get("data", prev) if isinstance(prev, dict) else {}
    if not events:
        sys.exit("Abbruch: Export enthält keine Termine – nichts geschrieben.")
    ok, err, web = True, "", []
    try:
        raw = json.load(open(opt["--web"], encoding="utf-8")) if "--web" in opt else fetch(d_from, d_to)
        # vor dem ersten Planer-Termin gibt es nichts abzugleichen (Planer beginnt 27.10.2026)
        first = min((e.get("date") for e in events.values() if e.get("date")), default=d_from)
        d_from = max(d_from, first)
        web = [w for w in parse_web(raw) if d_from <= w["date"] <= d_to]
        if not web:
            raise RuntimeError("Website lieferte keine Termine")
    except Exception as ex:  # Abruf gescheitert: keine Terminänderungen, nur Protokoll
        ok, err, web = False, f"Abruf fehlgeschlagen: {type(ex).__name__}: {ex}"[:300], []
    writes, meta, summary = plan(events, series, prev, web, d_from, d_to, now.isoformat(timespec="minutes"), today.isoformat(), ok, err)
    if not ok:
        writes = {}
    entries = [{"op": "update", "collection": "events", "doc_id": k, "data": v} for k, v in sorted(writes.items())]
    entries.append({"op": "set", "collection": "meta", "doc_id": "websync", "data": meta})
    batches = [entries[i:i + BATCH] for i in range(0, len(entries), BATCH)]
    text = (f"Website-Abgleich {'ok' if ok else 'FEHLER: ' + err}: {summary['website']} Website-Termine, "
            f"{summary['neu']} neu zugeordnet, {summary['aktualisiert']} aktualisiert, {summary['hochgesetzt']} auf veröffentlicht gesetzt, "
            f"{summary['nurWebsite']} nur auf der Website, {summary['nichtOnline']} veröffentlicht aber nicht online, "
            f"{summary['unklar']} nicht eindeutig; {len(entries)} Schreibvorgänge in {len(batches)} Batch(es).")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump({"ok": ok, "skip": False, "batches": batches, "summary": summary, "text": text}, fh, ensure_ascii=False, indent=1)
    print(text)


if __name__ == "__main__":
    main()
