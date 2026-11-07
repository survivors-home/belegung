#!/usr/bin/env python3
"""SURVIVORS HOME – Datenkopie des Planers (ab Planer v136) in den Export-Ordner für build.py, team/build.mjs und websync.py.

Hintergrund: Seit 04.11.2026 lehnt ArtifactData das Speichern der Planer-Datenbank als Dateien ab (out_dir).
Der Planer legt deshalb selbst eine Kopie der Rohdaten als Datei im Artefakt ab (meta/snapshot zeigt auf die neueste);
die Routine holt sie mit dem Artifact-Werkzeug (action read, path = Kopie-ID) und entpackt sie hiermit.

Aufrufe:
  python3 tools/snapshot.py unpack <kopie.json> <export-ordner> [--seen JJJJ-MM-TTTHH:MM]
      schreibt <export>/events/<id>.json, series/, referents/, absences/, ab v139 auch rounds/, msgs/, meta/<name>.json (nur der Inhalt, wie bisher
      "data") und <export>/STAND (Zeitpunkt der Kopie; build.py und build.mjs zeigen ihn als Stand).
      --seen: Feld "seen" aus meta/snapshot (Planer hat die Kopie zu diesem Zeitpunkt als unverändert bestätigt);
      STAND ist dann der spätere der beiden Zeitpunkte.
      Bricht ab (Exit 1), wenn die Datei keine gültige Kopie ist oder keine Termine/Reihen enthält.
  python3 tools/snapshot.py ids <websync-plan.json>
      listet die Dokumente, für die die Routine vor dem Schreiben die Version holen muss (je Zeile "collection doc_id").
  python3 tools/snapshot.py apply <websync-plan.json> <export-ordner> [--skip id1,id2]
      überträgt die geschriebenen Einträge (update = zusammenführen, set = ersetzen) in den Export, damit die Seiten
      den Stand nach dem Abgleich zeigen (ersetzt das erneute Lesen). --skip: Einträge, die nicht geschrieben wurden.
"""
import json, os, sys, shutil

FORMAT = "survivors-home-datenkopie"
COLS = ("events", "series", "referents", "absences")
OPT_COLS = ("rounds", "msgs")  # ab Planer v139 in der Datenkopie (für den Notfall-Planer); ältere Kopien ohne


def die(msg):
    print(msg, file=sys.stderr); sys.exit(1)


def wjson(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1)


def safe_id(i):
    return isinstance(i, str) and i and "/" not in i and "\\" not in i and i not in (".", "..")


def unpack(src, out, seen=""):
    try:
        with open(src, encoding="utf-8") as fh:
            k = json.load(fh)
    except Exception as ex:
        die(f"Abbruch: Datenkopie nicht lesbar ({type(ex).__name__}).")
    if not isinstance(k, dict) or k.get("format") != FORMAT or not isinstance(k.get("collections"), dict):
        die("Abbruch: Datei ist keine Datenkopie des Planers.")
    cols, meta = k["collections"], k.get("meta") or {}
    if not (cols.get("events") or {}) or not (cols.get("series") or {}):
        die("Abbruch: Datenkopie enthält keine Termine oder Reihen.")
    if os.path.isdir(out):
        shutil.rmtree(out)
    n = {}
    for c in COLS:
        docs = cols.get(c) or {}
        for i, d in docs.items():
            if safe_id(i) and isinstance(d, dict):
                wjson(os.path.join(out, c, i + ".json"), d)
        n[c] = len(docs)
    for c in OPT_COLS:
        for i, d in (cols.get(c) or {}).items():
            if safe_id(i) and isinstance(d, dict):
                wjson(os.path.join(out, c, i + ".json"), d)
    for name, d in meta.items():
        if safe_id(name) and isinstance(d, dict):
            wjson(os.path.join(out, "meta", name + ".json"), d)
    stand = max(str(k.get("created") or "")[:16], seen[:16] if len(seen) >= 16 and seen[4] == "-" and seen[10] == "T" else "")
    with open(os.path.join(out, "STAND"), "w", encoding="utf-8") as fh:
        fh.write(stand)
    print(f"Datenkopie vom {str(k.get('created') or '')[:16].replace('T', ' ')} (Stand {stand.replace('T', ' ')}): {n['events']} Termine, {n['series']} Reihen, "
          f"{n['referents']} Referenten, {n['absences']} Abwesenheiten, Meta: {', '.join(sorted(meta)) or '-'}")


def entries(plan):
    with open(plan, encoding="utf-8") as fh:
        p = json.load(fh)
    return [e for b in p.get("batches") or [] for e in b]


def ids(plan):
    for e in entries(plan):
        print(e["collection"], e["doc_id"])


def apply(plan, out, skip):
    done = 0
    for e in entries(plan):
        if e["doc_id"] in skip or not safe_id(e["doc_id"]):
            continue
        f = os.path.join(out, e["collection"], e["doc_id"] + ".json")
        cur = {}
        if e["op"] == "update" and os.path.exists(f):
            with open(f, encoding="utf-8") as fh:
                cur = json.load(fh)
        if e["op"] == "delete":
            if os.path.exists(f):
                os.remove(f)
        else:
            for key, v in (e.get("data") or {}).items():
                if isinstance(v, dict) and v.get("__delete__") is True:
                    cur.pop(key, None)
                else:
                    cur[key] = v
            wjson(f, cur)
        done += 1
    print(f"{done} Einträge des Abgleichs in den Export übernommen" + (f", {len(skip)} ausgelassen" if skip else ""))


def main():
    a = sys.argv[1:]
    skip, seen = set(), ""
    if "--seen" in a:
        i = a.index("--seen"); seen = a[i + 1].strip(); del a[i:i + 2]
    if "--skip" in a:
        i = a.index("--skip"); skip = {x.strip() for x in a[i + 1].split(",") if x.strip()}; del a[i:i + 2]
    if len(a) == 3 and a[0] == "unpack":
        unpack(a[1], a[2], seen)
    elif len(a) == 2 and a[0] == "ids":
        ids(a[1])
    elif len(a) == 3 and a[0] == "apply":
        apply(a[1], a[2], skip)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
