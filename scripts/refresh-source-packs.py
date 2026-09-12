import json,csv,io,zipfile
from pathlib import Path
root=Path('.')
data=json.loads((root/'src/data/subject-areas.json').read_text(encoding='utf8'))
labs=json.loads((root/'src/data/labs.json').read_text(encoding='utf8'))['labs']
methods=json.loads((root/'src/data/methodology.json').read_text(encoding='utf8'))
def csvtext(rows):
 b=io.StringIO();w=csv.writer(b,delimiter=';',lineterminator='\n');w.writerows(rows);return '\ufeff'+b.getvalue()
for area in data['subjectAreas']:
 dest=root/'inputs/subject-areas/sources'/area['code'];(dest/'labs').mkdir(parents=True,exist_ok=True)
 profile=next(p for p in data['profiles'] if p['id']==area['profileId'])
 (dest/'system-passport.csv').write_text(csvtext([['field','value'],['variant',area['id']],['code',area['code']],['subject_area',area['title']],['system_code',area['systemCode']],['critical_function',area['criticalFunction']],['assets',', '.join(area['assets'])]]),encoding='utf8')
 (dest/'quality-characteristics.csv').write_text(csvtext([['code','characteristic','value','group','variants']]+[[c['code'],c['name'],c['value'],profile['title'],profile['variantRange']] for c in profile['characteristics']]),encoding='utf8')
 def text(s):
  for k,v in {'system':area['title'],'systemCode':area['systemCode'],'criticalFunction':area['criticalFunction'],'assets':', '.join(area['assets'])}.items():s=s.replace('{'+k+'}',v)
  return s
 for lab in labs:
  m=methods[str(lab['number'])];lines=[f"# LR{lab['slug']} {lab['title']}",area['code']+' '+area['title'],text(lab['situation']),m['lecture']['application'],m['sequence']['previous'],m['sequence']['next']]
  for sec in lab['sourceData']['sections']:
   lines+=['## '+sec['title']]+[text(x) for x in sec.get('content',[])]
   if 'table' in sec:
    tab=sec['table'];lines+=[' | '.join(map(str,row)) for row in [tab['columns']]+tab['rows']]
  lines+=['## Actions']+[text(x) for x in lab['task']]
  (dest/'labs'/f"LR{lab['slug']}.md").write_text('\n\n'.join(lines)+'\n',encoding='utf8')
 pack=root/'public'/area['pack']
 with zipfile.ZipFile(pack,'w',zipfile.ZIP_DEFLATED) as z:
  for f in sorted(dest.rglob('*')):
   if f.is_file():z.write(f,f"{area['code']}/{f.relative_to(dest).as_posix()}")
print('Updated 30 source packs and 660 source files')
