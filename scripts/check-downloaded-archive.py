from pathlib import Path
import zipfile,io,json,re
p=Path('../../work/lab-all-variants.zip');out=[]
with zipfile.ZipFile(p) as z:
 names=z.namelist();manifest=json.loads(z.read('manifest.json'))
 assert len(manifest['variants'])==30 and len(manifest['labs'])==22
 htmls=[n for n in names if n.endswith('/Задание.html')];assert len(htmls)==660
 for v in range(1,31):
  code=f'SA{v:02}'
  for n in range(1,23):
   base=f'{code}/LR{n:02}/';html=z.read(base+'Задание.html').decode('utf8')
   assert 'Связь с лекцией' in html and code in html
   assert not re.search(r'\{(?:system|systemCode|criticalFunction|assets)\}',html)
   with zipfile.ZipFile(io.BytesIO(z.read(base+'Шаблон_для_заполнения.docx'))) as d:
    xml=d.read('word/document.xml').decode('utf8');assert code in xml and '{{VARIANT}}' not in xml
   csvs=[x for x in names if x.startswith(base) and x.endswith('.csv')]
   assert csvs
   for c in csvs:assert z.read(c).startswith(b'\xef\xbb\xbf')
 out={'archive':p.name,'variants':30,'labs':22,'sets':660,'files':len(names),'bytes':p.stat().st_size,'htmlDocxVariantMatch':True,'csvBom':True}
Path('docs/archive-qa.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(out))
