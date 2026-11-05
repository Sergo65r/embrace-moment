(function(root){
  'use strict';
  // Keep the editor's canonical page on the exact A4 proportion (210 × 297 mm).
  // Width stays at 600 logical px so existing templates remain stable; height is
  // the corresponding A4 value used by the canvas, preview, and print layers.
  const W=600,H=600*297/210,clone=x=>JSON.parse(JSON.stringify(x));
  const themes={birthday:{title:'С днём\nрождения!',label:'BIRTHDAY',accent:'#b77f6d',intro:'Твой день. Твоя история.'},mama:{title:'Мама',label:'ТЫ — МОЙ МИР',accent:'#777b54',intro:'Самые важные слова — тебе.'},love:{title:'Love story',label:'НАША ИСТОРИЯ',accent:'#665c54',intro:'Всё началось с одной встречи.'},blank:{title:'Твоя\nистория',label:'В ДЕТАЛЯХ',accent:'#b77f6d',intro:'Маленькие моменты большой жизни.'}};
  const id=()=>globalThis.crypto?.randomUUID?.()||'e'+Date.now()+Math.random().toString(36).slice(2);
  function text(value,x,y,w,h,size=30,color='#292b26'){return {id:id(),type:'text',text:value,x,y,w,h,size,color,font:'serif',bold:false,italic:false,align:'left',lineHeight:1.15,rotation:0,opacity:1};}
  function photo(x,y,w,h){return {id:id(),type:'photo',asset:null,x,y,w,h,fit:'cover',posX:50,posY:50,rotation:0,opacity:1};}
  function legacyPage(theme,index,layout){const t=themes[theme]||themes.blank;const p={id:id(),background:'#fbf8f2',elements:[]};
    if(layout==='blank')return p;
    if(index===0&&layout!=='photos'&&layout!=='story'){p.elements=[text('Embrace the moment',45,26,510,30,17),text(t.title,40,78,520,165,70,t.accent),text(t.label,45,255,510,32,16),photo(45,310,510,438),text(t.intro,45,778,510,40,19)];p.elements[0].align='center';p.elements[1].align='center';p.elements[2].align='center';return p;}
    const mode=layout||(index%3===0?'photos':index%3===1?'story':'portrait');
    p.elements=[text(mode==='story'?'То, что хочется\nсохранить':mode==='photos'?'Наши моменты':'Самое дорогое',44,45,512,100,43,t.accent)];
    if(mode==='photos'){p.elements.push(photo(44,180,245,250),photo(311,180,245,250),photo(44,452,512,285),text('У каждого снимка есть своя история.',44,767,512,40,20));}
    else if(mode==='story'){p.elements.push(text('Напишите свою историю здесь.\n\nВспомните день, человека или маленькую деталь, которая делает этот момент особенным.',44,173,512,180,25),photo(44,391,512,356));}
    else{p.elements.push(photo(44,172,512,496),text('Самые тёплые воспоминания —\nв простых вещах.',44,704,512,92,28));}
    return p;
  }
  // Precautionary reserve; exact punch geometry must come from the printer.
  const BINDING_MM=12,BINDING_X=W*BINDING_MM/210;
  const bindingSide=index=>index%2===0?'left':'right';
  function bindingRisk(e,index=0,mm=BINDING_MM){
    if(e.hidden||(e.type==='text'&&!e.text.trim()))return false;
    const angle=(e.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=e.x+e.w/2,cy=e.y+e.h/2;
    let poly=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>[cx+c*x*e.w/2-s*y*e.h/2,cy+s*x*e.w/2+c*y*e.h/2]);
    const width=W*mm/210,left=bindingSide(index)==='left'?0:W-width,right=left+width;
    for(const [axis,bound,sign] of [[0,left,1],[0,right,-1],[1,0,1],[1,H,-1]]){
      const clipped=[];
      for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=(a[axis]-bound)*sign>=0,bi=(b[axis]-bound)*sign>=0;
        if(ai)clipped.push(a);
        if(ai!==bi){const t=(bound-a[axis])/(b[axis]-a[axis]);clipped.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
      }poly=clipped;if(poly.length<3)return false;
    }
    return Math.abs(poly.reduce((sum,a,i)=>{const b=poly[(i+1)%poly.length];return sum+a[0]*b[1]-b[0]*a[1];},0))>1e-6;
  }
  // [composition, heading, editable copy, short caption / cover name]
  const stories={
    birthday:[
      ['cover','BIRTHDAY','С днём рождения!\n[Дата] · [Возраст] лет','[Имя]'],
      ['letter','Этот выпуск — о тебе','[Имя], этот журнал — маленькое признание в том, как много ты значишь для нас. Здесь твой смех, любимые люди и моменты, которые хочется прожить ещё раз.','С любовью, [имя автора]'],
      ['portrait','Главный герой','[Имя]\nЧеловек, рядом с которым обычный день становится особенным.'],
      ['timeline','Твоя история','[Год] — начало твоей истории.\n\n[Год] — первая большая мечта.\n\n[Год] — важная встреча.\n\n[Год] — новый шаг вперёд.'],
      ['duo','Когда всё начиналось','В этих снимках столько света. Маленький человек с большими мечтами — и уже с тем самым узнаваемым взглядом.'],
      ['grid','Твои люди','Те, кто знает твои истории наизусть и всё равно готов слушать их снова.'],
      ['letter','Письмо имениннику','[Имя], желаю тебе смелости выбирать своё, времени на любимое и людей, с которыми легко быть собой. Пусть впереди будет много поводов улыбаться.','Обнимаю, [имя]'],
      ['triptych','Один счастливый день','[Дата] · [Место]\nДень, который мы будем вспоминать с улыбкой.'],
      ['duo','Маленькие радости','[Любимый напиток], [любимая песня] и [любимое место]. Иногда для счастья нужно совсем немного.'],
      ['quote','Твоя суперсила','«Ты умеешь делать жизнь вокруг теплее».','И за это мы тебя любим.'],
      ['grid','Год в фотографиях','Четыре кадра — и столько всего между ними. Спасибо этому году за наши встречи.'],
      ['portrait','Любимое дело','Когда ты занимаешься [увлечение], твои глаза светятся по-особенному. Пусть на это всегда находится время.'],
      ['timeline','Поводы гордиться','[Достижение] — ты решился.\n\n[Достижение] — ты справился.\n\n[Достижение] — ты вырос.\n\nИ это только начало.'],
      ['duo','Наши приключения','[Место] · [Год]\nЛучшие истории начинаются со слов: «А давай…»'],
      ['letter','Слова от близких','«С тобой всегда [качество]». — [Имя]\n\n«Спасибо тебе за [воспоминание]». — [Имя]\n\n«Желаю тебе [пожелание]». — [Имя]','Собираем самое тёплое'],
      ['triptych','Как мы празднуем','Любимая компания, торт и ещё одно желание. Сегодня всё — для тебя.'],
      ['timeline','Планы на новый год','Посетить [место].\n\nПопробовать [новое занятие].\n\nНаучиться [навык].\n\nЧаще встречаться с любимыми.'],
      ['quote','Загадай желание','«Пусть сбудется то, о чём ты пока говоришь только шёпотом».','[Дата] · Твой новый год'],
      ['grid','Ещё немного счастья','Кадры, которые не требуют объяснений. Просто мы. Просто хорошо.'],
      ['portrait','Продолжение следует','С днём рождения, [Имя]!\nСамые интересные страницы ещё впереди.\n\nС любовью, [имена]']
    ],
    mama:[
      ['cover','МАМА','Ты — мой мир.\n[Дата]','Для [имя мамы]'],
      ['letter','Мамочка, это тебе','Этот журнал — о нашей любви. О том, что ты делаешь каждый день, о твоих объятиях и о доме, который всегда начинается с тебя. Спасибо, что ты есть.','С любовью, [имя]'],
      ['portrait','Самая родная','[Имя мамы]\nВ твоей улыбке — спокойствие, которое я узнаю среди тысячи лиц.'],
      ['duo','До того, как я появился','У тебя были свои мечты, приключения и открытия. Как же интересно увидеть тебя на этих фотографиях.'],
      ['timeline','Наша семейная история','[Год] — важная встреча.\n\n[Год] — наша семья стала больше.\n\n[Год] — новый дом.\n\n[Год] — счастливый день вместе.'],
      ['triptych','Моё детство — это ты','Твои руки, твой голос и чувство, что всё обязательно будет хорошо.'],
      ['letter','Спасибо за…','За то, что слушаешь.\nЗа поддержку в трудные дни.\nЗа веру в меня, даже когда я сомневаюсь.\nЗа маленькие заботы, из которых складывается большая любовь.','Это невозможно измерить'],
      ['grid','Дом, где нас любят','Знакомые детали, любимые лица и самые уютные воспоминания.'],
      ['quote','Твои слова','«[Любимая мамина фраза]»','Я помню. И беру эти слова с собой.'],
      ['portrait','Твоя улыбка','Мама, пусть поводов улыбаться будет больше. Ты заслуживаешь столько же тепла, сколько даришь другим.'],
      ['duo','Наши традиции','[Семейная традиция]\nТо, что делает нас семьёй и связывает даже на расстоянии.'],
      ['letter','Вкус детства','[Название маминого блюда]\n\nЭтот вкус возвращает меня домой. Помню, как мы [воспоминание], пока на кухне пахло чем-то невероятно вкусным.','Самый любимый рецепт'],
      ['grid','Наши праздники','Дни рождения, семейные вечера и встречи, на которых хочется обнять каждого.'],
      ['timeline','То, чему ты научила','Заботиться о близких.\n\nНе бояться начинать сначала.\n\nЗамечать хорошее.\n\nБыть собой.'],
      ['triptych','Время только для тебя','[Увлечение мамы]\nПусть в жизни будет больше любимых занятий и маленьких путешествий.'],
      ['duo','Мы с тобой','[Место] · [Дата]\nЛюблю эти моменты, когда можно никуда не спешить.'],
      ['letter','От всей семьи','[Имя], спасибо за [пожелание или воспоминание].\n\nМы любим твой смех, твои истории и умение собирать нас вместе. Береги себя — ты нам очень нужна.','Твои [имена близких]'],
      ['quote','Я люблю тебя','«Мама — человек, к которому хочется возвращаться».','Даже если мы далеко друг от друга.'],
      ['grid','Наше большое счастье','Несколько снимков из семейного альбома. В каждом — частичка твоей любви.'],
      ['portrait','Всегда рядом','Мама, спасибо за всё.\nПусть впереди будет много наших счастливых дней.\n\nТвой / твоя [имя]']
    ],
    love:[
      ['cover','LOVE STORY','Наша история любви\n[Дата]','[Имя] & [Имя]'],
      ['letter','История про нас','Мы не знали, сколько прекрасного ждёт впереди. Просто встретились — и мир постепенно стал нашим общим. Этот журнал хранит то, что хочется помнить всегда.','[Имена] · [Год]'],
      ['timeline','Как всё началось','[Дата] — первая встреча.\n\n[Дата] — первое свидание.\n\n[Дата] — первое путешествие.\n\n[Дата] — наше важное «да».'],
      ['duo','Первая встреча','[Место] · [Дата]\nПомнишь, как мы [деталь первой встречи]? Иногда один день меняет всё.'],
      ['portrait','Ты моими глазами','[Имя], я люблю в тебе [качество]. Рядом с тобой хочется быть честнее, смелее и счастливее.'],
      ['portrait','Я рядом с тобой','[Имя], спасибо, что выбираешь нас. В твоих объятиях мне всегда спокойно.'],
      ['grid','Наши маленькие моменты','Кофе по утрам, прогулки без маршрута и фотографии, на которых мы смеёмся.'],
      ['triptych','Первое путешествие','[Место] · [Год]\nЧемодан впечатлений и желание повторить всё снова.'],
      ['quote','Наше главное','«Я выбираю тебя. Сегодня и каждый следующий день».','[Имена]'],
      ['letter','За что я тебя люблю','За твой смех. За внимание к мелочам. За то, что рядом можно молчать и всё равно чувствовать себя понятым. За наше «мы».','Твой / твоя [имя]'],
      ['duo','Наши места','[Первое место] и [второе место].\nНа карте это просто точки, а для нас — целые истории.'],
      ['timeline','Традиции для двоих','По [день недели] мы [традиция].\n\nВсегда слушаем [песня].\n\nОтмечаем [дата].\n\nГоворим друг другу [наши слова].'],
      ['grid','Дни, которые согревают','Пусть эти кадры напоминают: счастье живёт не только в больших событиях.'],
      ['triptych','Один особенный день','[Дата] · [Событие]\nСтолько чувств невозможно уместить в один снимок.'],
      ['letter','Письмо тебе','[Имя], спасибо за нашу историю. За поддержку, нежность и смелость быть рядом. Я хочу ещё столько всего увидеть вместе с тобой.','С любовью, [имя]'],
      ['duo','Дом — это мы','Наши привычки, любимые вещи и планы на вечер. Самое дорогое — знать, что тебя ждут.'],
      ['timeline','Наш список желаний','Увидеть [место].\n\nПопробовать [занятие].\n\nВстретить рассвет в [место].\n\nПродолжать собирать наши истории.'],
      ['quote','Обещание','«Быть рядом. Слышать. Обнимать. И беречь то, что между нами».','Наше маленькое обещание'],
      ['grid','Любовь в деталях','Твои руки. Наши улыбки. Знакомые маршруты. То, из чего складывается любовь.'],
      ['portrait','И это только начало','[Имя] & [Имя]\nВпереди — целая жизнь наших историй.\n\n[Дата]']
    ],
    blank:[
      ['cover','МОЙ ЖУРНАЛ','Истории, которые остаются\n[Год]','[Имя / название]'],
      ['letter','От автора','Этот журнал — моя коллекция важного. Люди, места и дни, из которых складывается жизнь. Здесь можно остановиться и снова почувствовать момент.','[Имя автора]'],
      ['portrait','Немного обо мне','[Имя]\nЯ люблю [увлечение], мечтаю о [мечта] и стараюсь замечать прекрасное в обычных днях.'],
      ['timeline','Мой год в событиях','[Месяц] — [событие].\n\n[Месяц] — [открытие].\n\n[Месяц] — [встреча].\n\n[Месяц] — [достижение].'],
      ['grid','Люди рядом','Мой круг тепла. Те, с кем можно быть собой и делиться самым важным.'],
      ['duo','Место силы','[Место]\nЗдесь я замедляюсь, выдыхаю и чувствую, что всё на своём месте.'],
      ['letter','День, который я помню','[Дата]\n\nВ тот день мы [событие]. Особенно запомнилось [деталь]. Хочу оставить это воспоминание здесь, чтобы однажды снова улыбнуться.','Записано в [место]'],
      ['triptych','Маленькое путешествие','[Маршрут] · [Дата]\nНовые улицы, случайные открытия и фотографии на память.'],
      ['quote','Слова для себя','«Замечай хорошее. Оно часто прячется в мелочах».','Моя мысль на этот год'],
      ['portrait','То, что меня вдохновляет','[Любимое занятие]\nВремя, когда я забываю о спешке и просто делаю то, что люблю.'],
      ['grid','Обыкновенное счастье','Утренний свет, вкусный завтрак, прогулка и вечерний разговор. Мой набор хорошего дня.'],
      ['timeline','Личная коллекция','Книга — [название].\n\nПесня — [название].\n\nФильм — [название].\n\nМесто — [название].'],
      ['duo','До и после','Иногда перемены заметны только на фотографиях. Смотрю на эти кадры и понимаю, какой путь уже пройден.'],
      ['letter','Спасибо этому времени','За людей, которые были рядом. За новые попытки. За уроки и открытия. И за маленькие радости, которые сделали эти дни моими.','[Имя] · [Дата]'],
      ['triptych','История в трёх кадрах','[Событие]\nНачало, самый яркий момент и то, что осталось в памяти.'],
      ['portrait','Моя гордость','[Достижение]\nЭто получилось не сразу. Но я попробовал, продолжил и справился.'],
      ['timeline','То, что впереди','Хочу увидеть [место].\n\nХочу научиться [навык].\n\nХочу попробовать [идея].\n\nХочу чаще [желание].'],
      ['quote','Письмо в будущее','«Помни, как много хорошего уже было. И сколько ещё впереди».','Открыть в [год]'],
      ['grid','Оставлю это здесь','Последние кадры этого выпуска. Истории, к которым хочется возвращаться.'],
      ['portrait','Продолжение — за мной','[Название журнала]\nЭта глава заканчивается, но моя история продолжается.\n\n[Имя] · [Дата]']
    ]
  };
  function page(theme,index,layout){
    if(layout)return legacyPage(theme,index,layout);
    if(index>=20)return legacyPage(theme,index,'blank');
    const t=themes[theme]||themes.blank,[mode,heading,copy,caption]=(stories[theme]||stories.blank)[index];
    const p={id:id(),background:theme==='love'?'#faf8f5':theme==='mama'?'#faf9f1':'#fbf8f2',elements:[]};
    const add=(value,x,y,w,h,size,color=t.accent,align='left')=>{const e=text(value,x,y,w,h,size,color);e.align=align;p.elements.push(e);return e;};
    const pic=(x,y,w,h)=>p.elements.push(photo(x,y,w,h));
    if(mode==='cover'){
      add('EMBRACE THE MOMENT',52,27,504,28,14,t.accent,'center').font='sans';
      add(heading,52,79,504,114,58,t.accent,'center');pic(52,210,504,430);
      add(caption,52,662,504,65,32,'#292b26','center');add(copy,52,739,504,62,21,t.accent,'center');
    }else{
      add(t.label,52,26,504,25,13,t.accent).font='sans';add(heading,52,70,504,100,42);
      if(mode==='letter'){add(copy,52,191,504,244,25,'#292b26');pic(52,461,504,263);add(caption||'',52,747,504,43,20);}
      if(mode==='portrait'){pic(52,184,504,425);add(copy,52,637,504,153,25,'#292b26');}
      if(mode==='duo'){pic(52,186,242,329);pic(314,186,242,329);add(copy,52,552,504,219,28,'#292b26');}
      if(mode==='grid'){pic(52,181,242,223);pic(314,181,242,223);pic(52,426,242,223);pic(314,426,242,223);add(copy,52,678,504,112,24,'#292b26');}
      if(mode==='triptych'){pic(52,181,504,265);pic(52,466,242,219);pic(314,466,242,219);add(copy,52,710,504,80,22,'#292b26');}
      if(mode==='quote'){add(copy,65,200,478,225,36,t.accent,'center').italic=true;pic(52,466,504,260);add(caption||'',52,747,504,43,19,'#292b26','center');}
      if(mode==='timeline'){add(copy,52,189,236,576,24,'#292b26');pic(314,184,242,250);pic(314,459,242,301);}
      add(String(index+1).padStart(2,'0')+'  /  '+t.label,52,811,504,24,12,'#827568');
    }
    return p;
  }
  function create(theme,count){if(!themes[theme]||![20,24,28,32,36].includes(count))throw Error('Неизвестный макет или количество страниц');return {version:1,templateRevision:2,id:id(),theme,name:themes[theme].title.replace('\n',' '),pages:Array.from({length:count},(_,i)=>page(theme,i)),assets:{},updatedAt:Date.now()};}
  const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  function validate(d){if(!d||d.version!==1||!themes[d.theme]||typeof d.name!=='string'||d.name.length>150||!Array.isArray(d.pages)||d.pages.length<1||d.pages.length>36||!d.assets||typeof d.assets!=='object'||Array.isArray(d.assets))throw Error('Неподдерживаемый файл журнала');
    const ids=new Set();let bytes=0;
    for(const [key,value] of Object.entries(d.assets)){if(!/^[a-zA-Z0-9_-]+$/.test(key)||typeof value!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('Недопустимое изображение');bytes+=value.length;}if(bytes>100000000)throw Error('Журнал слишком большой');
    for(const p of d.pages){if(typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||ids.has(p.id)||!/^#[0-9a-f]{6}$/i.test(p.background)||!Array.isArray(p.elements)||p.elements.length>100)throw Error('Повреждённая страница');ids.add(p.id);
      for(const e of p.elements){if(typeof e.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(e.id)||ids.has(e.id)||!['text','photo'].includes(e.type)||!finite(e.x,-W,W)||!finite(e.y,-H,H)||!finite(e.w,24,W*2)||!finite(e.h,24,H*2)||!finite(e.rotation,-180,180)||!finite(e.opacity,.1,1))throw Error('Повреждённый элемент');ids.add(e.id);for(const k of ['locked','hidden','bold','italic','underline','strike','flipX','autoFit'])if(e[k]!==undefined&&typeof e[k]!=='boolean')throw Error('Некорректный стиль');if(e.letterSpacing!==undefined&&!finite(e.letterSpacing,-5,20))throw Error('Некорректный интервал');if(e.filter!==undefined&&!['none','grayscale','sepia','warm'].includes(e.filter))throw Error('Некорректный фильтр');
        if(e.type==='text'&&(typeof e.text!=='string'||e.text.length>10000||!finite(e.size,1,1200)||!finite(e.lineHeight,.8,2)||!['serif','sans','italic'].includes(e.font)||!['left','center','right'].includes(e.align)||!/^#[0-9a-f]{6}$/i.test(e.color)))throw Error('Повреждённый текст');
        if(e.type==='photo'&&((e.asset!==null&&!Object.hasOwn(d.assets,e.asset))||!['cover','contain'].includes(e.fit)||!finite(e.posX,0,100)||!finite(e.posY,0,100)))throw Error('Повреждённое фото');
      }
    }return clone(d);
  }
  function photoRect(iw,ih,w,h,fit,px=50,py=50){const k=(fit==='contain'?Math.min:Math.max)(w/iw,h/ih);const rw=iw*k,rh=ih*k;return {x:(w-rw)*px/100,y:(h-rh)*py/100,w:rw,h:rh};}
  function resizeCorner(start,corner,dx,dy){
    const sx=corner.includes('w')?-1:1,sy=corner.includes('n')?-1:1;
    const angle=(start.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const w=Math.max(24,Math.min(W*2,start.w+sx*(c*dx+s*dy)));
    const h=Math.max(24,Math.min(H*2,start.h+sy*(-s*dx+c*dy)));
    const dw=w-start.w,dh=h-start.h;
    const shiftX=(c*sx*dw-s*sy*dh-dw)/2,shiftY=(s*sx*dw+c*sy*dh-dh)/2;
    let t=1;
    for(const [value,shift,bound] of [[start.x,shiftX,W],[start.y,shiftY,H]]){
      if(shift>0)t=Math.min(t,(bound-value)/shift);
      if(shift<0)t=Math.min(t,(-bound-value)/shift);
    }
    t=Math.max(0,t);
    return {x:start.x+shiftX*t,y:start.y+shiftY*t,w:start.w+dw*t,h:start.h+dh*t};
  }
  function selectionHandles(e,scale,origin,bounds){
    const angle=(e.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const clamp=(v,lo,hi)=>Math.max(lo,Math.min(Math.max(lo,hi),v));
    const points=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy])=>{
      const actualX=origin.x+(e.x+e.w/2+c*sx*e.w/2-s*sy*e.h/2)*scale;
      const actualY=origin.y+(e.y+e.h/2+s*sx*e.w/2+c*sy*e.h/2)*scale;
      return {actualX,actualY,x:clamp(actualX,bounds.left,bounds.right),y:clamp(actualY,bounds.top,bounds.bottom)};
    });
    // If two off-page corners project to one point, separate their touch targets.
    for(let pass=0;pass<4;pass++)for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const a=points[i],b=points[j];if(Math.hypot(a.x-b.x,a.y-b.y)>=30)continue;
      const axis=Math.abs(a.actualX-b.actualX)>Math.abs(a.actualY-b.actualY)?'x':'y';
      const lo=axis==='x'?bounds.left:bounds.top,hi=axis==='x'?bounds.right:bounds.bottom;
      const middle=clamp((a[axis]+b[axis])/2,lo+16,hi-16),sign=(axis==='x'?a.actualX-b.actualX:a.actualY-b.actualY)<=0?-1:1;
      a[axis]=clamp(middle+sign*16,lo,hi);b[axis]=clamp(middle-sign*16,lo,hi);
    }
    return points;
  }
  const api={selectionHandles,resizeCorner,photoRect,W,H,BINDING_MM,BINDING_X,bindingSide,bindingRisk,id,clone,text,photo,page,create,validate,themes};if(typeof module!=='undefined')module.exports=api;else root.MagazineModel=api;
})(globalThis);
