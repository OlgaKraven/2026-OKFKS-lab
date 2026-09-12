from pathlib import Path
import fitz,json,zipfile
from PIL import Image,ImageDraw
root=Path('../../work/lab-report-renders-final');result=[]
for folder in sorted(x for x in root.iterdir() if x.is_dir()):
 pdf=fitz.open(next(folder.glob('*.pdf')));assert len(pdf)==4
 canvas=Image.new('RGB',(1220,1740),'#cccccc')
 for i,page in enumerate(pdf):
  pix=page.get_pixmap(matrix=fitz.Matrix(1,1));img=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
  canvas.paste(img,(10+(i%2)*610,25+(i//2)*860));ImageDraw.Draw(canvas).text((10+(i%2)*610,5+(i//2)*860),f'{folder.name} / {i+1}',fill='black')
 canvas.save(root/(folder.name+'.png'))
 result.append({'file':folder.name+'.docx','pages':len(pdf)})
Path('docs/docx-qa.json').write_text(json.dumps(result,indent=2),encoding='utf8')
for sem,count in [(7,10),(8,12)]:
 with zipfile.ZipFile(Path('../../work')/f'lab-semester{sem}.zip') as z:
  m=json.loads(z.read('manifest.json'));assert len(m['variants'])==30 and len(m['labs'])==count
  assert all(x['semester']==sem for x in m['labs'])
  assert len([p for p in z.namelist() if p.endswith('/Задание.html')])==count*30
 print(f'semester {sem}: {count*30} sets OK')
