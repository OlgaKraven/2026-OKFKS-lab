import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {contexts} from '../authoring/context.mjs';
import {stepResults} from '../authoring/step-results.mjs';
import {labels} from '../authoring/labels.mjs';
import {labMethodology as baselineMethodology} from '../authoring/methodology-baseline.ts';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const put=(p,x)=>writeFileSync(new URL(p,import.meta.url),typeof x==='string'?x:JSON.stringify(x,null,2)+'\n');
const {labs}=read('../authoring/labs-baseline.json');
const lectures=read('../authoring/lecture-reference.json');
const methodology={};
const mapping=[];
const version='2.0.0-lab-context';
for(const [i,lab] of labs.entries()){
 for(const section of lab.sourceData.sections){
  section.title=section.title.replace(/^Исходные данные: (.*)$/,(_,x)=>labels[x]||`Исходные данные: ${x}`);
  if(section.table){section.table.columns=section.table.columns.map(s=>labels[s]||s);section.table.title=section.title;}
 }
 const [li,qs,application,previous,next,source,method,result,transfer]=contexts[i];
 const lecture=lectures.lectures[li];const sections=lecture.slides.filter(s=>s.kind==='section');
 const lectureLinks=qs.map(q=>({title:sections[q-1].title,url:`https://olgakraven.github.io/2026-OKFKS-lecture/?lecture=${lecture.id}&slide=${sections[q-1].id}`,slideId:sections[q-1].id}));
 if(stepResults[i].length!==lab.task.length)throw Error(`ЛР${lab.number}: число шагов ${lab.task.length} / ${stepResults[i].length}`);
 const sourceNames=lab.sourceData.sections.filter(s=>s.table).map(s=>s.title).join('; ');
 methodology[lab.number]={sequence:{previous,next},lecture:{title:lecture.title,application,links:lectureLinks},example:{title:['Классификация одного события вне варианта','Расчёт на отдельном коротком окне','Проверка факта и модель улучшения'][i]||`Разбор приёма: ${sections[qs[0]-1].title.toLocaleLowerCase('ru')}`,source,method,result,boundary:'Это отдельный учебный пример X, а не ответ на строки вашего набора. В решении используйте ID и ограничения текущей лабораторной работы.'},steps:stepResults[i].map((s,j)=>{const [result,check]=s.split('|');return {data:j===0?`Текущий набор: ${sourceNames}.`:`Правила и таблицы этой работы; промежуточные результаты шагов 1–${j}.`,result,check};})};
 lab.task.push(transfer);
 methodology[lab.number].steps.forEach((step,j)=>{
  const original=baselineMethodology[lab.number].steps[j];
  step.data=original.data.replaceAll('Start','Начало').replaceAll('End','Окончание');
 });
 methodology[lab.number].steps.push({data:'Паспорт выбранной предметной области, критичная функция, активы, профиль C1–C5 и полученные результаты.',result:'Предметное обоснование применения результата и запись для следующей работы.',check:'Названы конкретные функция и актив варианта, приведён ID/показатель текущей работы; ограничения общего учебного стенда обозначены.'});
 lab.situation=`Вы готовите решение для системы «{system}» ({systemCode}). Её критичная функция — {criticalFunction}. Для освоения метода ниже используется отдельный учебный эпизод. ${lab.situation} Перенос на вашу предметную область выполняется последним действием: необходимо объяснить последствие для конкретного актива, а не только заменить название системы.`;
 lab.sourceData.intro+=' Числа, события и регламенты этого эпизода являются условиями общего учебного стенда. Они не утверждают, что такой инцидент реально произошёл в выбранной области. Профиль C1–C5 применяется в предметном обосновании; он не подменяет явно заданные требования и числовую модель текущего эпизода.';
 lab.sourceData.sections.unshift({title:'Паспорт применения к выбранному варианту',content:['Система: {system} ({systemCode}).','Критичная функция: {criticalFunction}.','Активы: {assets}.','В отчёте сохраняйте один вариант SA01–SA30 на весь курс. Если исходные эпизоды имеют разные имена узлов или окна наблюдения, переносите метод и структуру доказательств, а не объединяйте их числовые итоги.']});
 lab.deliverables.push('Предметное обоснование: функция и актив варианта, применённый результат и передаваемые материалы');
 lab.selfCheck.push('Вывод связан с критичной функцией и активом выбранного варианта, а не только с названием учебного узла.');
 lab.wordRequirements.push('Используйте Times New Roman, 12 пт; таблицы и рисунки должны оставаться читаемыми.','Впишите свой вариант, укажите связь с лекцией и материал, передаваемый в следующую работу.');
 // Авторская конкретизация критериев: максимумы исходного курса неизменны.
 lab.rubric=Array.from({length:lab.points},(_,k)=>({points:1,criterion:lab.deliverables.filter((_,j)=>j%lab.points===k).join('; '),evidence:methodology[lab.number].steps.filter((_,j)=>j%lab.points===k).map(s=>s.check).join(' ')}));
 mapping.push({number:lab.number,title:lab.title,semester:lab.semester,points:lab.points,lectureId:lecture.id,lectureLinks,application,previous,next});
}
mkdirSync(new URL('../docs/',import.meta.url),{recursive:true});
put('../src/data/labs.json',{contentVersion:version,labs});
put('../src/data/methodology.json',methodology);
put('../src/data/methodology.ts',`import data from './methodology.json'\nexport interface StepGuide {data:string;result:string;check:string}\nexport const labMethodology: Record<number, {sequence:{previous:string;next:string};lecture:{title:string;application:string;links:{title:string;url:string;slideId:string}[]};example:{title:string;source:string;method:string[];result:string;boundary:string};steps:StepGuide[]}> = data\n`);
put('../docs/lecture-lab-map.json',{contentVersion:version,lectureContentVersion:lectures.contentVersion,templateCommit:'7bdc532c50c2559ffd3ee7fdcb0fba7edf05ebac',labs:mapping});
put('../src/data/literature.json',lectures.literature);
let text='ЛАБОРАТОРНЫЕ РАБОТЫ\nМДК.04.02 «Обеспечение качества функционирования компьютерных систем»\n\n22 работы. 7 семестр: ЛР01–ЛР10, 50 баллов. 8 семестр: ЛР11–ЛР22, 50 баллов. Всего 100 баллов.\n\nОдин вариант SA01–SA30 сохраняется на весь курс. Вариант назначается преподавателем в LMS. Учебные эпизоды и их числовые данные общие; каждый результат требуется обосновать применительно к функции и активам своей области. Примеры X показывают приём, но не являются готовыми ответами.\nКритерии ниже — авторская конкретизация заданий с сохранением максимальных баллов исходного курса. Балл начисляется за выполненный и подтверждённый критерий; иначе за него 0. Дробные баллы не используются. Полностью отсутствующая работа получает 0. Политика самостоятельности определяется регламентом преподавателя и LMS.\n\n';
for(const lab of labs){const m=methodology[lab.number];
 text+=`\n${'='.repeat(72)}\nЛабораторная работа №${lab.number} – ${lab.title}\nСеместр: ${lab.semester}. Максимум: ${lab.points} баллов.\n\nЦель работы\n${lab.goal}\nДля выполнения используется предметная область, закреплённая за студентом. Конкретный вариант и его профиль указаны на сайте и в LMS.\n\nСвязь с лекциями\n${m.lecture.title}. ${m.lecture.application}\n${m.lecture.links.map(l=>l.title+' — '+l.url).join('\n')}\n\nСвязь с другими лабораторными работами\n${m.sequence.previous}\nРезультат этой работы: ${lab.practicalResult}.\nДанные для следующей работы: ${m.sequence.next}\n`;
 for(const [key,title] of [['primary','Основная литература'],['additional','Дополнительная литература']])text+=`\n${title}\n${lectures.literature[key].map(x=>'• '+x.citation).join('\n')}\n`;
 text+=`\nДля выполнения требуется\n${lab.tools.map((x,j)=>`${j+1}. ${x}`).join('\n')}\n${lab.tools.length+1}. Скачать комплект своей ЛР и варианта на https://olgakraven.github.io/2026-OKFKS-lab/#/lab/${lab.slug}; использовать вложенный редактируемый шаблон ${lab.reportFile}.\n\nОписание задания\n${lab.situation.replaceAll('{system}','выбранной предметной области').replaceAll(' ({systemCode})','').replaceAll('{criticalFunction}','функция из паспорта вашего варианта')}\n${lab.sourceData.intro}\n\nПоследовательность выполнения\n`;
 lab.task.forEach((x,j)=>{text+=`${j+1}. ${x}\n   Результат: ${m.steps[j].result}\n   Проверка: ${m.steps[j].check}\n`;});
 text+=`\nРазобранный пример\n${m.example.source}\n${m.example.method.map((x,j)=>`${j+1}. ${x}`).join('\n')}\nРезультат: ${m.example.result}\n${m.example.boundary}\n\nЧто представить в отчёте\n${lab.deliverables.map(x=>'• '+x).join('\n')}\n\nЧек-лист для самопроверки\n${lab.selfCheck.map(x=>'□ '+x).join('\n')}\n\nБаллы и критерии выполнения\n${lab.rubric.map((x,j)=>`${j+1}. ${x.points} балл — ${x.criterion}. Проверка: ${x.evidence}`).join('\n')}\nИтого: от 0 до ${lab.points} баллов.\n\nТребования к отчёту и сдаче\n${lab.wordRequirements.join('\n')}\nВсе схемы и изображения вставляйте с подписями «Рисунок № — Название»; номер и содержательное название заполните самостоятельно.\nСдайте один редактируемый DOCX в LMS. Имя файла: ${lab.recommendedFileName}.\n${lab.lmsSteps.map((x,j)=>`${j+1}. ${x}`).join('\n')}\n`;
}
put('../docs/laboratory-descriptions.txt','\uFEFF'+text);
console.log(`Контекст: ${labs.length} работ, ${mapping.reduce((n,x)=>n+x.lectureLinks.length,0)} ссылок на разделы лекций; текстовый файл создан.`);
