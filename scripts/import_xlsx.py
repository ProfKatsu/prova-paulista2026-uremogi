import json, pathlib, re, hashlib, sys
import openpyxl

root = pathlib.Path(__file__).resolve().parents[1]
out = root
(out / "data").mkdir(parents=True, exist_ok=True)
subjects = ["MAT","PORT","ING","HIST","GEO","CIE","FILO","SOC","BIO","FÍS","QUI","FIN","TEC"]
schools, totals, sources = {}, [], []
for term in (1,2,3):
    p = pathlib.Path(sys.argv[1]) / f"UNIDADE REGIONAL DE ENSINO resultado prova paulista {term} bimestre por escola.xlsx"
    ws = openpyxl.load_workbook(p, data_only=True).active
    rows = list(ws.values)
    headers = list(rows[0])
    count = 0
    for n, row in enumerate(rows[1:], 2):
        label = row[0]
        if not label or str(label).startswith("Filtros aplicados"):
            continue
        d = dict(zip(headers, row))
        def col(fragment):
            return next(v for k,v in d.items() if fragment in k)
        record = {"term":term, "students":d["Total Alunos"],
                  "participation":col("Participa"),"score":col("Acertos"),
                  "subjects":{s:d[s] for s in subjects}, "row":n}
        if label == "Total":
            totals.append(record)
            continue
        m = re.fullmatch(r"(.+) - (\d+)", label)
        assert m, label
        name, code = m.groups()
        school = schools.setdefault(code, {"id":code,"name":name,"terms":[]})
        assert not any(t["term"] == term for t in school["terms"])
        for v in [record["score"],record["participation"],*record["subjects"].values()]:
            assert v is None or 0 <= v <= 1
        school["terms"].append(record)
        count += 1
    sources.append({"term":term,"file":p.name,"sheet":ws.title,"schools":count,
                    "sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"filters":rows[-1][0]})
data = {"directorate":"Mogi das Cruzes","directorateCode":"10501","year":None,
        "subjects":subjects,"sources":sources,"totals":totals,
        "schools":sorted(schools.values(),key=lambda s:s["name"])}
(out/"data/results.json").write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding="utf-8")
report = {"schools":len(schools),"records":sum(len(s["terms"]) for s in schools.values()),
          "complete":sum(len(s["terms"])==3 for s in schools.values()),
          "totals":[{"term":t["term"],"score":t["score"],"students":t["students"]} for t in totals],
          "zeroSubjects":sum(v==0 for s in schools.values() for t in s["terms"] for v in t["subjects"].values())}
print(json.dumps(report,ensure_ascii=False))

