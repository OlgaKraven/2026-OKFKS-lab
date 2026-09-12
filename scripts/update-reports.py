"""Patch the retained lab-template DOCX; keep opaque package parts unchanged."""
import copy
import json
import zipfile
from pathlib import Path
from lxml import etree as E

ROOT = Path(__file__).resolve().parents[1]
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{'+NS['w']+'}'
def el(tag, **attrs):
    e = E.Element(W+tag)
    for k,v in attrs.items(): e.set(W+k,str(v))
    return e
def textof(e): return ''.join(e.xpath('.//w:t/text()',namespaces=NS))
def settext(e,text):
    nodes=e.xpath('.//w:t',namespaces=NS)
    if nodes:
        nodes[0].text=text
        for n in nodes[1:]: n.text=''
    else:
        r=el('r');t=el('t');t.text=text;r.append(t);e.append(r)
def para(text='',bold=False):
    p=el('p');pr=el('pPr');pr.append(el('spacing',after=100,line=240,lineRule='auto'))
    if bold: pr.append(el('keepNext'))
    p.append(pr);r=el('r');rp=el('rPr');rp.append(el('rFonts',ascii='Times New Roman',hAnsi='Times New Roman',cs='Times New Roman'));rp.append(el('sz',val=24))
    if bold: rp.append(el('b'))
    r.append(rp);t=el('t');t.text=text;r.append(t);p.append(r);return p
def table(headers,rows,widths):
    t=el('tbl');pr=el('tblPr');pr.append(el('tblW',w=sum(widths),type='dxa'));pr.append(el('tblLayout',type='fixed'))
    borders=el('tblBorders')
    for side in ['top','left','bottom','right','insideH','insideV']: borders.append(el(side,val='single',sz=4,color='D9D9D9'))
    pr.append(borders);m=el('tblCellMar')
    for side in ['top','left','bottom','right']:m.append(el(side,w=85,type='dxa'))
    pr.append(m);t.append(pr);grid=el('tblGrid')
    for width in widths:grid.append(el('gridCol',w=width))
    t.append(grid)
    for i,row in enumerate([headers]+rows):
        tr=el('tr');trpr=el('trPr');trpr.append(el('cantSplit'))
        if i==0:trpr.append(el('tblHeader'))
        tr.append(trpr)
        for value,width in zip(row,widths):
            tc=el('tc');tcp=el('tcPr');tcp.append(el('tcW',w=width,type='dxa'))
            if i==0:tcp.append(el('shd',fill='E7E7E7'))
            tc.append(tcp);tc.append(para(value,i==0));tr.append(tc)
        t.append(tr)
    return t

labs=json.loads((ROOT/'src/data/labs.json').read_text(encoding='utf8'))['labs']
methods=json.loads((ROOT/'src/data/methodology.json').read_text(encoding='utf8'))
ref=ROOT/'authoring/report-reference.docx'
with zipfile.ZipFile(ref) as z: parts={n:z.read(n) for n in z.namelist()}
original=E.fromstring(parts['word/document.xml'])
for lab in labs:
    root=copy.deepcopy(original);body=root.find('w:body',NS);nodes=list(body);m=methods[str(lab['number'])]
    settext(nodes[6],f"Отчёт по лабораторной работе № {lab['number']}")
    for p in nodes[7].xpath('.//w:p',namespaces=NS):
        s=textof(p)
        if 'Описание предметной области' in s:settext(p,lab['title'])
        elif '1 семестр' in s:settext(p,f"4 курс · {lab['semester']} семестр · ЛР{lab['slug']}")
        elif '[Название дисциплины]' in s:settext(p,'МДК.04.02 Обеспечение качества функционирования компьютерных систем')
    for p in nodes[4].xpath('.//w:p',namespaces=NS):
        if '[Код и название специальности]' in textof(p):settext(p,'09.02.07 Информационные системы и программирование')
    # Page 2: the same passport and explanatory slots, expanded for course links.
    nodes[20].getparent().replace(nodes[20],table(['Поле','Содержание'],[
        ['Название',lab['title']],['Цель',lab['goal']],['Практический навык',lab['outcomes'][0]],
        ['Результат',lab['practicalResult']],['Семестр и баллы',f"{lab['semester']} семестр; максимум {lab['points']} баллов"],
        ['Имя файла',lab['recommendedFileName']]], [2150,7200]))
    settext(nodes[21],'Вариант [код] · Предметная область [название]')
    settext(nodes[23],m['lecture']['application'])
    settext(nodes[25],'Лекция: '+m['lecture']['title']+'. Разделы: '+', '.join(l['title'] for l in m['lecture']['links'])+'.')
    settext(nodes[26],m['sequence']['previous'])
    settext(nodes[27],'Используйте HTML и CSV только текущей работы своего варианта. Учебные эпизоды не объединяются в один журнал; числа разных окон не складываются.')
    settext(nodes[28],'Примените вывод к критичной функции и активу варианта. Профиль C1–C5 не подменяет требования общего эпизода. Все ответы и фактические результаты заполняет студент.')
    # Page 3: distinct required results per lab; blank result cells.
    nodes[32].getparent().replace(nodes[32],table(['Что подготовить','Результат студента','ID и доказательство'],[[x,'',''] for x in lab['deliverables']],[3900,2900,2550]))
    diagram_required=lab['number'] in [6,7,11,15,18,19,22]
    if diagram_required:
        settext(nodes[34],'Вставьте схему, требуемую заданием. Сохраните вместе рисунок, подпись и пояснение. Номер и название заполните самостоятельно.')
    else:
        for n in nodes[33:38]:body.remove(n)
    # Page 4: specific protocol alongside open response fields.
    settext(nodes[40],'Принятое решение и связь с предметной областью')
    settext(nodes[42],'Основания решения и ссылки на ID исходных данных')
    settext(nodes[44],'Проверка результата по условиям задания')
    settext(nodes[46],'Материалы для следующей работы')
    settext(nodes[47],m['sequence']['next']+'\n[Запишите, что вы передаёте и где это находится в вашем отчёте.]')
    for p in root.xpath('.//w:rPr',namespaces=NS):
        for tag in ['sz','szCs']:
            n=p.find(W+tag)
            if n is None:n=el(tag);p.append(n)
            n.set(W+'val','24')
    # Flexible rows, including long titles; do not clip content with exact heights.
    for h in root.xpath('.//w:trHeight',namespaces=NS): h.set(W+'hRule','atLeast')
    for s in root.xpath('.//w:sectPr',namespaces=NS):
        margin=s.find(W+'pgMar');margin.set(W+'left','1701');margin.set(W+'right','850');margin.set(W+'top','1134');margin.set(W+'bottom','1134')
    output=ROOT/'public/reports'/lab['reportFile']
    xml=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for name,value in parts.items():z.writestr(name,xml if name=='word/document.xml' else value)
    with zipfile.ZipFile(output) as z:
        assert all(z.read(n)==v for n,v in parts.items() if n!='word/document.xml')
    print(output.name)

