(function(){
  'use strict';
  const M=MagazineModel,$=s=>document.querySelector(s),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fonts={serif:'"Cormorant Garamond", Georgia, serif',sans:'Manrope, Arial, sans-serif',italic:'"Cormorant Garamond", Georgia, serif'};
  let doc=null,index=0,selected=null,history=[],future=[],key='',scale=1,active=false,session=0,saveTimer,toastTimer,dbPromise,saveChain=Promise.resolve(),observer,gesture=null,uploadTarget=null,inputSession=null,dirty=false,revision=0;
  const page=()=>doc.pages[index],element=()=>page().elements.find(e=>e.id===selected);
  function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('embrace-journals',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Хранилище занято другой вкладкой'));}));}
  async function read(k){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readonly'),r=tx.objectStore('drafts').get(k);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function write(k,value){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,k);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  function status(s){if($('.ed-status'))$('.ed-status').textContent=s;}
  function toast(s){clearTimeout(toastTimer);$('.ed-toast')?.remove();const el=document.createElement('div');el.className='ed-toast';el.setAttribute('role','status');el.textContent=s;document.body.append(el);toastTimer=setTimeout(()=>el.remove(),3500);}
  function save(){clearTimeout(saveTimer);if(!doc)return Promise.resolve();const value=M.clone(doc),k=key,token=session,rev=revision;value.updatedAt=Date.now();status('Сохраняем…');saveChain=saveChain.catch(()=>{}).then(()=>write(k,value)).then(()=>{if(token===session&&rev===revision){dirty=false;status('Сохранено на этом устройстве');}},()=>{if(token===session){dirty=true;status('Не сохранено — скачайте копию');}throw Error('Не удалось сохранить. Скачайте файл журнала через «Сохранить».');});return saveChain;}
  function schedule(){revision++;dirty=true;status('Есть изменения…');clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(()=>{}),450);}
  function snapshot(){return {pages:M.clone(doc.pages),index,selected,name:doc.name,templateRevision:doc.templateRevision};}
  function checkpoint(){history.push(snapshot());if(history.length>60)history.shift();future=[];inputSession=null;}
  function restore(s){doc.pages=s.pages;doc.name=s.name;doc.templateRevision=s.templateRevision;index=Math.min(s.index,doc.pages.length-1);selected=s.selected;inputSession=null;render();schedule();}
  function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop());}
  function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop());}
  function change(fn){checkpoint();fn();render();schedule();}
  function style(e){return `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;transform:rotate(${e.rotation}deg);opacity:${e.opacity};${e.type==='text'?`font-family:${fonts[e.font]};font-size:${e.size}px;color:${e.color};font-weight:${e.bold?700:400};font-style:${e.italic||e.font==='italic'?'italic':'normal'};text-align:${e.align};line-height:${e.lineHeight};`:''}`;}
  function contents(e){return e.type==='text'?`<div class="ed-text-content">${esc(e.text)}</div>`:e.asset&&doc.assets[e.asset]?`<img src="${doc.assets[e.asset]}" alt="Фотография" draggable="false" style="object-fit:${e.fit};object-position:${e.posX}% ${e.posY}%">`:'<div class="ed-placeholder"><span>＋</span>Ваше фото</div>';}
  function elementsHTML(p,interactive=false){return p.elements.map(e=>`<div class="ed-element${interactive&&selected===e.id?' selected':''}" style='${style(e)}' ${interactive?`data-element="${e.id}" tabindex="0" role="button" aria-label="${esc(e.type==='text'?'Текст: '+e.text.slice(0,70):'Фотография: нажмите для выбора')}"`:''}>${contents(e)}${interactive&&selected===e.id?'<span class="ed-resize" data-resize aria-hidden="true"></span>':''}</div>`).join('');}
  function thumbnails(){const rail=$('.ed-pages'),scroll=rail?.scrollLeft||0,top=rail?.scrollTop||0;if(!rail)return;rail.innerHTML='<span class="ed-pages-label">Страницы</span>'+doc.pages.map((p,i)=>`<button class="ed-thumb ${i===index?'active':''}" data-page="${i}" aria-label="Страница ${i+1}${i===0?', обложка':''}" aria-current="${i===index?'page':'false'}"><div class="ed-mini"><div class="ed-mini-inner" style="background:${p.background}">${elementsHTML(p)}</div></div><small>${i+1}${i===0?' · Обложка':''}</small></button>`).join('');rail.scrollLeft=scroll;rail.scrollTop=top;}
  function fitPreview(){const first=$('.ed-preview-page');if(first)document.querySelectorAll('.ed-preview-inner').forEach(el=>el.style.transform=`scale(${first.clientWidth/M.W})`);}
  function fit(){fitPreview();const area=$('.ed-workspace'),wrap=$('.ed-paper-wrap');if(!area||!wrap)return;const cs=getComputedStyle(area),aw=area.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=area.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);const e=element(),focused=matchMedia('(max-width:700px)').matches&&$('.ed-panel')?.classList.contains('open')&&e;area.classList.toggle('ed-focused',!!focused);scale=focused?Math.min(1.5,Math.max(aw/M.W,aw/(e.w+48))):Math.max(.2,Math.min(1,aw/M.W,ah/M.H));wrap.style.width=M.W*scale+'px';wrap.style.height=M.H*scale+'px';$('.ed-paper').style.transform=`scale(${scale})`;if(focused&&!gesture){area.scrollLeft=Math.max(0,(e.x+e.w/2)*scale-area.clientWidth/2+parseFloat(cs.paddingLeft));area.scrollTop=Math.max(0,(e.y+e.h/2)*scale-area.clientHeight/2+parseFloat(cs.paddingTop));}else if(!focused){area.scrollTop=0;area.scrollLeft=0;}updateSwipeGuard(focused);}

  const SWIPE_GUARD_BUFFER=700;
  function syncSwipeGuard(){
    const area=$('.ed-workspace'),wrap=$('.ed-paper-wrap');
    if(!area||!wrap||!area.classList.contains('ed-swipe-guard'))return;
    wrap.style.transform=`translateY(${area.scrollTop-SWIPE_GUARD_BUFFER}px)`;
  }
  function centerSwipeGuard(){
    const area=$('.ed-workspace'),wrap=$('.ed-paper-wrap');
    if(!area||!wrap||!area.classList.contains('ed-swipe-guard'))return;
    area.scrollTop=SWIPE_GUARD_BUFFER;
    wrap.style.transform='translateY(0px)';
  }
  function updateSwipeGuard(focused=false){
    const area=$('.ed-workspace'),wrap=$('.ed-paper-wrap');
    if(!area||!wrap)return;
    const enabled=matchMedia('(max-width:700px)').matches&&!focused;
    area.classList.toggle('ed-swipe-guard',enabled);
    if(!enabled){wrap.style.transform='';return;}
    requestAnimationFrame(centerSwipeGuard);
  }
  function viewportLayout(){const editor=$('.editor');if(!editor)return;const v=window.visualViewport;const mobile=matchMedia('(max-width:700px)').matches;editor.style.setProperty('--ed-height',`${mobile&&v?v.height:innerHeight}px`);editor.style.setProperty('--keyboard-bottom',`${mobile&&v?Math.max(0,innerHeight-v.height-v.offsetTop):0}px`);editor.classList.toggle('keyboard-open',!!(mobile&&v&&innerHeight-v.height>150));syncPanelLayout();}
  window.visualViewport?.addEventListener('resize',viewportLayout);
  function syncPanelLayout(){const editor=$('.editor'),layout=$('.ed-layout'),panelEl=$('.ed-panel');if(!editor||!layout||!panelEl)return;const height=panelEl.classList.contains('open')?panelEl.getBoundingClientRect().height:0;editor.style.setProperty('--panel-height',`${Math.ceil(height)}px`);layout.style.setProperty('--panel-height',`${Math.ceil(height)}px`);requestAnimationFrame(fit);}
  function closePanel(){const p=$('.ed-panel');if(!p)return;p.classList.remove('open');syncPanelLayout();}
  function contextToolbar(){const bar=$('.ed-context-toolbar');if(!bar)return;const e=element();if(!e){bar.innerHTML='<span class="ed-context-empty">Выберите текст или фотографию на странице</span>';bar.classList.remove('has-selection');return;}bar.classList.add('has-selection');const text=e.type==='text';bar.innerHTML=text?`<span class="ed-context-type">ТЕКСТ</span><button data-action="edit">Изменить</button><button data-action="font">Aa&nbsp; Шрифт</button><button data-action="color"><i style="background:${e.color}"></i> Цвет</button><button data-action="settings">⚙ Настройки</button><button data-action="effects">⌁ Эффекты</button><button data-action="duplicate">▣ Дублировать</button><button class="danger" data-action="delete">♲ Удалить</button>`:`<span class="ed-context-type">ФОТО</span><button data-action="replace-photo">▣ Выбрать фото</button><button data-action="backward">↓ Сдвинуть назад</button><button data-action="forward">↑ Сдвинуть вперед</button><button data-action="duplicate">▣ Копировать</button><button class="danger" data-action="delete">♲ Удалить</button>`;}
  function paper(){const el=$('.ed-paper');if(!el)return;el.style.background=page().background;el.innerHTML=elementsHTML(page(),true)+`<div class="ed-binding-zone" style="width:${M.BINDING_X}px" aria-hidden="true"></div>`;$('.ed-page-number').textContent=`${index+1} / ${doc.pages.length}`;$('.ed-prev').disabled=index===0;$('.ed-next').disabled=index===doc.pages.length-1;$('.ed-undo').disabled=!history.length;$('.ed-redo').disabled=!future.length;$('.ed-mobile-edit').textContent=selected?'Изменить':'Страница';$('.ed-name strong').textContent=doc.name;contextToolbar();updateBindingWarning();fit();}
  function render(){if(!active)return;paper();thumbnails();panel();}
  function bindingPages(){return doc.pages.flatMap((p,i)=>p.elements.some(M.bindingRisk)?[i+1]:[]);}
  function bindingSummary(){const pages=bindingPages();return pages.length?`<p class="ed-binding-summary">Область пружинки: элементы на страницах ${pages.join(', ')} близко к левому краю. Здесь будут проколы. Рекомендуем отступить не менее ${M.BINDING_MM} мм.</p>`:'';}
  function updateBindingWarning(){const risk=page().elements.some(M.bindingRisk),hint=$('.ed-hint');$('.ed-paper')?.classList.toggle('binding-risk',risk);if(!hint)return;hint.setAttribute('role','status');hint.classList.toggle('binding-warning',risk);const message=risk?'Внимание: текст или фото в зоне пружинки слева — здесь будут проколы. Сдвиньте важное правее.':`А4 · Полоса слева — запас ${M.BINDING_MM} мм под пружинку. Не размещайте здесь важные детали.`;if(hint.textContent!==message)hint.textContent=message;}
  function freshTemplate(){confirmAction('Начать с готового макета?','Первые 20 страниц будут заменены оформленными страницами выбранного журнала, остальные станут пустыми. Текущую версию можно вернуть кнопкой «Отменить». Для отдельной копии сначала скачайте файл журнала.',()=>change(()=>{doc.pages=Array.from({length:Math.max(20,doc.pages.length)},(_,i)=>M.page(doc.theme,i));doc.templateRevision=2;index=0;selected=null;closePanel();}));}
  function field(label,control){return `<label>${label}${control}</label>`;}
  function number(label,prop,value,min,max,step=1){return field(label,`<input type="number" data-prop="${prop}" value="${value}" min="${min}" max="${max}" step="${step}">`);}
  function panel(){const p=$('.ed-panel');if(!p)return;const wasOpen=p.classList.contains('open'),e=element();let html='';
    if(!e){html=`<p>Нажмите на текст или фото, чтобы изменить его.</p>${field('Название журнала',`<input data-document-name value="${esc(doc.name)}" maxlength="150">`)}${field('Цвет страницы',`<input type="color" data-background value="${page().background}">`)}<details open><summary>Макет этой страницы</summary><button class="ed-layout-button" data-layout="story">Текст и фотография</button><button class="ed-layout-button" data-layout="photos">Три фотографии</button><button class="ed-layout-button" data-layout="blank">Чистая страница</button></details><div class="ed-operations"><button data-action="page-before" ${index===0?'disabled':''}>← Раньше</button><button data-action="page-after" ${index===doc.pages.length-1?'disabled':''}>Позже →</button><button data-action="page-copy" ${doc.pages.length>=60?'disabled':''}>Копия страницы</button><button data-action="page-add" ${doc.pages.length>=60?'disabled':''}>Пустая страница</button><button class="danger" data-action="page-delete" ${doc.pages.length<=1?'disabled':''}>Удалить страницу</button></div><p class="ed-help">Все надписи и фотографии — отдельные элементы. Перетащите выделенный элемент, потяните за круглый маркер, чтобы изменить размер. Все действия можно отменить.</p>`;}
    else{if(e.type==='text'){html=field('Текст',`<textarea data-prop="text" maxlength="10000" placeholder="Ваша история…">${esc(e.text)}</textarea>`)+`<div class="ed-row">${field('Шрифт',`<select data-prop="font"><option value="serif" ${e.font==='serif'?'selected':''}>Журнальный</option><option value="sans" ${e.font==='sans'?'selected':''}>Современный</option><option value="italic" ${e.font==='italic'?'selected':''}>Рукописный курсив</option></select>`)}${number('Размер','size',e.size,8,120)}</div><div class="ed-toggle-row"><button data-toggle="bold" class="${e.bold?'active':''}" aria-pressed="${e.bold}"><b>Жирный</b></button><button data-toggle="italic" class="${e.italic?'active':''}" aria-pressed="${e.italic}"><i>Курсив</i></button></div><div class="ed-toggle-row">${[['left','Слева'],['center','По центру'],['right','Справа']].map(([value,label])=>`<button data-align="${value}" class="${e.align===value?'active':''}">${label}</button>`).join('')}</div><div class="ed-row">${field('Цвет текста',`<input type="color" data-prop="color" value="${e.color}">`)}${number('Интервал','lineHeight',e.lineHeight,.8,2,.05)}</div><div class="ed-row">${number('Прозрачность','opacity',e.opacity,.1,1,.1)}</div><div class="ed-overflow" hidden>Текст не помещается: увеличьте высоту блока или уменьшите шрифт.</div>`;}
      else{html=`<button class="ed-primary" style="width:100%" data-action="replace-photo">${e.asset?'Заменить фото':'Загрузить фото'}</button><p>JPG, PNG, WebP · до 20 МБ. Фотографии остаются в вашем браузере.</p>${field('Как разместить',`<select data-prop="fit"><option value="cover" ${e.fit==='cover'?'selected':''}>Заполнить рамку</option><option value="contain" ${e.fit==='contain'?'selected':''}>Показать целиком</option></select>`)}${field('Кадр по горизонтали',`<input type="range" data-prop="posX" min="0" max="100" value="${e.posX}">`)}${field('Кадр по вертикали',`<input type="range" data-prop="posY" min="0" max="100" value="${e.posY}">`)}`;}
      html+=`<details><summary>Размер и положение</summary><div class="ed-row">${number('Слева','x',Math.round(e.x),0,M.W-e.w)}${number('Сверху','y',Math.round(e.y),0,M.H-e.h)}${number('Ширина','w',Math.round(e.w),24,M.W-e.x)}${number('Высота','h',Math.round(e.h),24,M.H-e.y)}${number('Поворот, °','rotation',e.rotation,-180,180)}${number('Прозрачность','opacity',e.opacity,.1,1,.1)}</div></details><div class="ed-operations"><button data-action="forward">На слой выше</button><button data-action="backward">На слой ниже</button><button data-action="duplicate">Дублировать</button><button class="danger" data-action="delete">Удалить</button></div>`;
    }
    p.innerHTML=`<div class="ed-sheet-head"><h2>${e?e.type==='text'?'Ваш текст':'Ваша фотография':'Страница '+(index+1)}</h2><button class="ed-panel-close" data-action="close-panel" aria-label="Закрыть инструменты">Готово</button></div>${html}`;p.classList.toggle('open',wasOpen);syncPanelLayout();checkOverflow();
  }
  function checkOverflow(){const content=$('.ed-element.selected .ed-text-content'),warning=$('.ed-overflow');if(warning&&content)requestAnimationFrame(()=>{warning.hidden=content.scrollHeight<=content.clientHeight+2;});}
  function openPanel(focus){panel();$('.ed-panel').classList.add('open');syncPanelLayout();if(focus)requestAnimationFrame(()=>{const target=$(`.ed-panel [data-prop="${focus}"]`);target?.focus();target?.scrollIntoView({block:'nearest'});});}
  function jump(i){if(i<0||i>=doc.pages.length)return;index=i;selected=null;inputSession=null;closePanel();render();$('.ed-thumb.active')?.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});}
  function pick(id){selected=id;inputSession=null;paper();panel();}
  function addText(){if(page().elements.length>=100)return toast('На странице уже 100 элементов');change(()=>{const e=M.text('Ваш текст',60,300,450,130,34);page().elements.push(e);selected=e.id;});openPanel();if(matchMedia('(min-width:701px)').matches) $('.ed-panel textarea')?.focus();}
  function imagePicker(){uploadTarget={session,page:page().id,element:element()?.type==='photo'?selected:null};$('#ed-photo-file').value='';$('#ed-photo-file').click();}
  function confirmAction(title,description,onYes){dialog(`<h2>${title}</h2><p>${description}</p><button class="ed-primary" data-confirm>Продолжить</button><button data-close>Отмена</button>`);$('[data-confirm]').onclick=()=>{closeDialog();onYes();};}
  function dialog(html){closeDialog();const d=document.createElement('dialog');d.className='ed-dialog editor';d.id='ed-dialog';d.style.display='block';d.style.height='auto';d.innerHTML=html;document.body.append(d);d.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeDialog();});d.addEventListener('close',()=>d.remove());d.showModal();}
  function closeDialog(){$('#ed-dialog')?.close();$('#ed-dialog')?.remove();}
  function action(name){const e=element(),list=page().elements,pos=list.indexOf(e);switch(name){
    case 'text':return addText();case 'photo':case 'replace-photo':return imagePicker();case 'undo':return undo();case 'redo':return redo();case 'edit':return openPanel();case 'font':return openPanel('font');case 'color':return openPanel('color');case 'settings':return openPanel();case 'effects':return openPanel('opacity');case 'close-panel':closePanel();return;case 'page':selected=null;paper();return openPanel();
    case 'duplicate':if(!e)return;if(list.length>=100)return toast('На странице уже 100 элементов');return change(()=>{const c=M.clone(e);c.id=M.id();c.x=Math.min(M.W-c.w,c.x+15);c.y=Math.min(M.H-c.h,c.y+15);list.push(c);selected=c.id;});
    case 'delete':if(!e)return;return change(()=>{list.splice(pos,1);selected=null;});
    case 'forward':if(!e||pos===list.length-1)return;return change(()=>{[list[pos],list[pos+1]]=[list[pos+1],list[pos]];});
    case 'backward':if(!e||pos===0)return;return change(()=>{[list[pos],list[pos-1]]=[list[pos-1],list[pos]];});
    case 'page-add':case 'page-copy':if(doc.pages.length>=60)return;return change(()=>{const p=name==='page-add'?M.page(doc.theme,index+1,'blank'):M.clone(page());p.id=M.id();p.elements.forEach(e=>e.id=M.id());doc.pages.splice(index+1,0,p);index++;selected=null;});
    case 'page-before':if(index===0)return;return change(()=>{[doc.pages[index-1],doc.pages[index]]=[doc.pages[index],doc.pages[index-1]];index--;});
    case 'page-after':if(index===doc.pages.length-1)return;return change(()=>{[doc.pages[index+1],doc.pages[index]]=[doc.pages[index],doc.pages[index+1]];index++;});
    case 'page-delete':if(doc.pages.length<=1)return;return confirmAction('Удалить страницу?',`Страница ${index+1} будет удалена. Действие можно отменить.`,()=>change(()=>{doc.pages.splice(index,1);index=Math.min(index,doc.pages.length-1);selected=null;}));
    case 'order':return order();case 'fresh-template':return freshTemplate();case 'save':return saveMenu();case 'preview':return preview();
  }}
  function editedInput(target){const e=element(),prop=target.dataset.prop;const inputKey=(e?.id||page().id)+':'+(prop||(target.hasAttribute('data-background')?'background':'name'));if(inputSession!==inputKey){checkpoint();inputSession=inputKey;}
    if(target.hasAttribute('data-document-name'))doc.name=target.value.slice(0,150)||'Мой журнал';
    else if(target.hasAttribute('data-background'))page().background=target.value;
    else if(e&&prop){const ranges={size:[8,120],lineHeight:[.8,2],rotation:[-180,180],opacity:[.1,1],x:[0,M.W-e.w],y:[0,M.H-e.h],w:[24,M.W-e.x],h:[24,M.H-e.y],posX:[0,100],posY:[0,100]};if(ranges[prop]){if(target.value==='')return;const val=Number(target.value);if(!Number.isFinite(val))return;e[prop]=Math.max(ranges[prop][0],Math.min(ranges[prop][1],val));}else e[prop]=target.value;}
    paper();checkOverflow();thumbnails();schedule();
  }
  function beginPointer(ev){if(ev.pointerType==='touch'&&$('.ed-workspace')?.classList.contains('ed-swipe-guard'))return;if(ev.button!==0&&ev.pointerType==='mouse')return;const node=ev.target.closest('[data-element]');if(!node){selected=null;inputSession=null;closePanel();render();return;}const e=page().elements.find(e=>e.id===node.dataset.element);if(!e)return;const resize=!!ev.target.closest('[data-resize]');pick(e.id);const start={x:e.x,y:e.y,w:e.w,h:e.h,size:e.type==='text'?e.size:null};gesture={mode:'pointer',id:e.id,pointer:ev.pointerId,start,clientX:ev.clientX,clientY:ev.clientY,resize,changed:false};$('.ed-paper').setPointerCapture(ev.pointerId);ev.preventDefault();}
  function movePointer(ev){if(!gesture||gesture.mode!=='pointer'||gesture.pointer!==ev.pointerId)return;const g=gesture,e=element();if(!e)return;const dx=(ev.clientX-g.clientX)/scale,dy=(ev.clientY-g.clientY)/scale;if(!g.changed&&Math.hypot(dx,dy)<4)return;if(!g.changed){checkpoint();g.changed=true;}if(g.resize){e.w=Math.max(40,Math.min(M.W-e.x,g.start.w+dx));e.h=Math.max(30,Math.min(M.H-e.y,g.start.h+dy));if(e.type==='text'&&g.start.size){const factor=Math.sqrt((e.w/g.start.w)*(e.h/g.start.h));e.size=Math.max(8,Math.min(120,Math.round(g.start.size*factor*10)/10));}}else{e.x=Math.max(0,Math.min(M.W-e.w,g.start.x+dx));e.y=Math.max(0,Math.min(M.H-e.h,g.start.y+dy));}const node=$('.ed-element.selected');if(node){node.style.cssText=style(e);if(g.resize&&e.type==='text'){const content=node.querySelector('.ed-text-content');let guard=0;while(content&&content.scrollHeight>content.clientHeight+1&&e.size>8&&guard<40){e.size=Math.max(8,Math.round(e.size*.97*10)/10);node.style.cssText=style(e);guard++;}}}updateBindingWarning();ev.preventDefault();}
  function endPointer(){if(!gesture||gesture.mode!=='pointer')return;const changed=gesture.changed;gesture=null;if(changed){render();schedule();}}

  function beginTouchDrag(ev){
    const area=$('.ed-workspace');
    if(!active||!area?.classList.contains('ed-swipe-guard')||ev.touches.length!==1)return;
    const node=ev.target.closest?.('[data-element]');
    if(!node)return;
    const e=page().elements.find(e=>e.id===node.dataset.element);
    if(!e)return;
    const t=ev.changedTouches[0]||ev.touches[0],resize=!!ev.target.closest?.('[data-resize]');
    pick(e.id);
    const start={x:e.x,y:e.y,w:e.w,h:e.h,size:e.type==='text'?e.size:null};
    gesture={mode:'touch',id:e.id,touch:t.identifier,start,clientX:t.clientX,clientY:t.clientY,resize,changed:false};
  }
  function moveTouchDrag(ev){
    if(!gesture||gesture.mode!=='touch')return;
    const t=[...ev.touches].find(t=>t.identifier===gesture.touch);
    if(!t)return;
    const g=gesture,e=element();
    if(!e||e.id!==g.id)return;
    const dx=(t.clientX-g.clientX)/scale,dy=(t.clientY-g.clientY)/scale;
    if(!g.changed&&Math.hypot(dx,dy)<4)return;
    if(!g.changed){checkpoint();g.changed=true;}
    if(g.resize){
      e.w=Math.max(40,Math.min(M.W-e.x,g.start.w+dx));
      e.h=Math.max(30,Math.min(M.H-e.y,g.start.h+dy));
      if(e.type==='text'&&g.start.size){
        const factor=Math.sqrt((e.w/g.start.w)*(e.h/g.start.h));
        e.size=Math.max(8,Math.min(120,Math.round(g.start.size*factor*10)/10));
      }
    }else{
      e.x=Math.max(0,Math.min(M.W-e.w,g.start.x+dx));
      e.y=Math.max(0,Math.min(M.H-e.h,g.start.y+dy));
    }
    const node=$('.ed-element.selected');
    if(node){
      node.style.cssText=style(e);
      if(g.resize&&e.type==='text'){
        const content=node.querySelector('.ed-text-content');
        let guard=0;
        while(content&&content.scrollHeight>content.clientHeight+1&&e.size>8&&guard<40){
          e.size=Math.max(8,Math.round(e.size*.97*10)/10);
          node.style.cssText=style(e);
          guard++;
        }
      }
    }
    updateBindingWarning();
  }
  function endTouchDrag(ev){
    if(!gesture||gesture.mode!=='touch')return;
    if(ev?.changedTouches&&![...ev.changedTouches].some(t=>t.identifier===gesture.touch))return;
    const changed=gesture.changed;
    gesture=null;
    if(changed){render();schedule();}
  }

  async function loadPhoto(file,target){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Выберите JPG, PNG или WebP. HEIC сначала сохраните как JPG.');return;}if(file.size>20*1024*1024){toast('Файл больше 20 МБ. Выберите фотографию поменьше.');return;}toast('Подготавливаем фотографию…');try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=data;});if(img.width*img.height>80000000)throw Error('Слишком большое разрешение');const ratio=Math.min(1,2000/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const url=canvas.toDataURL('image/jpeg',.9);if(!active||target.session!==session)return;const p=doc.pages.find(p=>p.id===target.page);if(!p)return toast('Страница уже удалена');if(!target.element&&p.elements.length>=100)return toast('На странице уже 100 элементов');checkpoint();const asset=M.id();doc.assets[asset]=url;let e=p.elements.find(e=>e.id===target.element);if(!e){e=M.photo(70,210,460,400);p.elements.push(e);}e.asset=asset;index=doc.pages.indexOf(p);selected=e.id;render();openPanel();schedule();toast('Фотография добавлена');}catch(err){toast('Не удалось открыть фотографию. Попробуйте другой JPG или PNG.');}}
  function compact(){const d=M.clone(doc),used=new Set(d.pages.flatMap(p=>p.elements.filter(e=>e.type==='photo'&&e.asset).map(e=>e.asset)));for(const key of Object.keys(d.assets))if(!used.has(key))delete d.assets[key];return d;}
  function download(){const blob=new Blob([JSON.stringify(compact())],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(doc.name.replace(/[^a-zа-яё0-9 _-]/gi,'').trim()||'Мой журнал')+'.embrace.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Файл журнала подготовлен для скачивания');}
  function saveMenu(){save().catch(()=>{});dialog(`<button class="ed-close" data-close aria-label="Закрыть сохранение">×</button><h2>Сохраните свою историю</h2><p>Черновик сохраняется автоматически в этом браузере. Скачайте файл с фотографиями, чтобы перенести журнал на другое устройство или сохранить резервную копию.</p><button class="ed-primary" data-download>Скачать файл журнала</button><button data-import>Открыть файл журнала</button><button data-preview>Просмотр и PDF</button><button data-fresh-template>Начать с готового макета · 20 страниц</button><p>Очистка данных браузера удаляет местные черновики. Файл журнала можно открыть здесь в любое время.</p>`);$('[data-download]').onclick=download;$('[data-import]').onclick=()=>{$('#ed-import-file').value='';$('#ed-import-file').click();};$('[data-preview]').onclick=preview;$('[data-fresh-template]').onclick=freshTemplate;}
  async function importFile(file){if(!file)return;if(file.size>100000000)return toast('Файл слишком большой');try{const value=M.validate(JSON.parse(await file.text()));confirmAction('Открыть журнал?',`Текущий черновик будет заменён журналом «${esc(value.name)}». Сначала скачайте текущий журнал, если хотите сохранить обе версии.`,()=>{checkpoint();doc=value;index=0;selected=null;history=[];future=[];render();schedule();toast('Журнал открыт');});}catch{toast('Не удалось открыть файл. Нужен файл .embrace.json, сохранённый в этом редакторе.');}}
  function preview(){const placeholders=doc.pages.reduce((n,p)=>n+p.elements.filter(e=>e.type==='photo'&&!e.asset).length,0);dialog(`<button class="ed-close" data-close aria-label="Закрыть просмотр">×</button><h2>Ваш журнал · ${doc.pages.length} стр.</h2><p>${placeholders?`Ещё ${placeholders} мест для фотографий. Пустые рамки не печатаются.`:'Все фотографии на месте.'} В окне печати выберите «Сохранить как PDF», формат А4, без полей и колонтитулов.</p>${bindingSummary()}<button class="ed-primary" data-print>Печать / сохранить PDF</button><div class="ed-preview">${doc.pages.map((p,i)=>`<div class="ed-preview-page" aria-label="Просмотр страницы ${i+1}"><div class="ed-preview-inner" style="background:${p.background}">${elementsHTML(p)}</div></div>`).join('')}</div>`);fitPreview();$('[data-print]').onclick=print;}
  async function print(approved=false){if(approved!==true&&bindingPages().length)return confirmAction('Проверьте область пружинки',`На страницах ${bindingPages().join(', ')} есть элементы в зоне проколов слева. Можно вернуться к редактированию или продолжить печать.`,()=>print(true));await document.fonts.ready;$('.ed-print-root')?.remove();const root=document.createElement('div');root.className='ed-print-root';root.innerHTML=doc.pages.map(p=>`<section class="ed-print-page"><div class="ed-print-inner" style="background:${p.background}">${elementsHTML(p)}</div></section>`).join('');document.body.append(root);await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));window.print();}

  let pdfLibraries;
  function loadPdfLibraries(){return pdfLibraries||(pdfLibraries=Promise.all(['./vendor/jspdf.umd.min.js','./vendor/html2canvas.min.js'].map(src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('library'));};document.head.append(s);}))).catch(e=>{pdfLibraries=null;throw e;}));}
  async function generatePdf(progress){
    // Freeze page markup before asynchronous work; the export excludes editor guides and empty photos.
    const pages=doc.pages.map(p=>({background:p.background,html:elementsHTML(p)}));
    const filename=`embrace-${doc.theme}-${pages.length}pages.pdf`;
    await loadPdfLibraries();await document.fonts.ready;
    const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:600px;pointer-events:none';document.body.append(host);
    try{for(let i=0;i<pages.length;i++){
      progress(i+1,pages.length);
      host.innerHTML=`<div style="position:relative;overflow:hidden;width:${M.W}px;height:${M.H}px;background:${pages[i].background}">${pages[i].html}</div>`;
      host.querySelectorAll('.ed-placeholder').forEach(e=>e.parentElement.remove());
      await Promise.all([...host.querySelectorAll('img')].map(img=>img.decode()));
      // html2canvas ignores object-fit: compose the exact cropped frame before capture.
      for(const img of host.querySelectorAll('img')){
        const w=parseFloat(img.parentElement.style.width),h=parseFloat(img.parentElement.style.height);
        const [px,py]=img.style.objectPosition.split(' ').map(parseFloat);
        const rect=M.photoRect(img.naturalWidth,img.naturalHeight,w,h,img.style.objectFit,px,py);
        const frame=document.createElement('canvas');frame.width=Math.round(w*2480/M.W);frame.height=Math.round(h*2480/M.W);
        const ctx=frame.getContext('2d');ctx.scale(frame.width/w,frame.height/h);ctx.drawImage(img,rect.x,rect.y,rect.w,rect.h);
        img.src=frame.toDataURL('image/png');img.style.objectFit='fill';img.style.objectPosition='50% 50%';await img.decode();frame.width=frame.height=1;
      }
      const canvas=await window.html2canvas(host.firstElementChild,{scale:2480/M.W,width:M.W,height:M.H,backgroundColor:pages[i].background,logging:false,scrollX:0,scrollY:0});
      if(i)pdf.addPage('a4','portrait');pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',0,0,210,297);canvas.width=canvas.height=1;
    }
    return new File([pdf.output('blob')],filename,{type:'application/pdf'});
    }finally{host.remove();}
  }
  function order(){
    save().catch(()=>{});
    const empty=doc.pages.reduce((n,p)=>n+p.elements.filter(e=>e.type==='photo'&&!e.asset).length,0);
    const risks=bindingPages();
    const warnings=[empty?`Не заполнено мест для фотографий: ${empty}. В PDF они останутся пустыми.`:'',risks.length?`В зоне пружинки есть элементы на страницах: ${risks.join(', ')}.`:''].filter(Boolean).join(' ');
    const names={birthday:'С днём рождения',mama:'Для мамы',love:'История любви',blank:'Свой макет'};
    EmbraceOrders.journal({name:doc.name,theme:names[doc.theme],count:doc.pages.length,warnings,generate:generatePdf});
  }

  function keydown(ev){if(!active||$('#ed-dialog')?.open||document.querySelector('.order-dialog[open]'))return;const typing=/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)||ev.target.isContentEditable;if(ev.key==='Escape'){closePanel();selected=null;render();return;}if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='s'){ev.preventDefault();saveMenu();return;}if(typing)return;if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?redo():undo();return;}if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='y'){ev.preventDefault();redo();return;}if(ev.key==='Delete'||ev.key==='Backspace'){if(selected){ev.preventDefault();action('delete');}return;}if(ev.key==='Enter'&&selected){openPanel();return;}const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[ev.key];if(delta&&element()){ev.preventDefault();const e=element();change(()=>{e.x=Math.max(0,Math.min(M.W-e.w,e.x+delta[0]*(ev.shiftKey?10:1)));e.y=Math.max(0,Math.min(M.H-e.h,e.y+delta[1]*(ev.shiftKey?10:1)));});}}
  function shell(){const themeName=doc.name;$('#app').innerHTML=`<section class="editor" aria-label="Конструктор журнала"><header class="ed-top"><a href="#/template/${doc.theme}" aria-label="Вернуться к шаблону">←</a><div class="ed-name"><strong>${esc(themeName)}</strong><span class="ed-status" role="status">Черновик на этом устройстве</span></div><button data-action="preview" aria-label="Предпросмотр журнала">Просмотр</button><button data-action="save">Сохранить</button><button class="ed-order" data-action="order">Заказать</button></header><div class="ed-layout"><aside class="ed-pages" aria-label="Страницы журнала"></aside><div class="ed-main"><div class="ed-actions"><button data-action="text">＋ Текст</button><button data-action="photo">＋ Фото</button><button class="ed-mobile-edit" data-action="edit">Страница</button><button class="ed-desktop-page" data-action="page">Страница</button><button class="ed-undo" data-action="undo" aria-label="Отменить действие">↶</button><button class="ed-redo" data-action="redo" aria-label="Повторить действие">↷</button></div><div class="ed-context-toolbar" aria-label="Инструменты выбранного элемента"></div><div class="ed-workspace"><div class="ed-paper-wrap"><div class="ed-paper" aria-label="Редактируемая страница"></div></div></div><p class="ed-hint">Выберите элемент · Перетащите для перемещения · Потяните за маркер для изменения размера</p><div class="ed-navigation"><button class="ed-prev" aria-label="Предыдущая страница">←</button><span class="ed-page-number"></span><button class="ed-next" aria-label="Следующая страница">→</button></div></div><aside class="ed-panel" aria-label="Инструменты редактирования"></aside></div><input class="ed-file" id="ed-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><input class="ed-file" id="ed-import-file" type="file" accept=".json,.embrace.json,application/json"></section>`;
    const root=$('.editor');root.addEventListener('click',ev=>{const actionButton=ev.target.closest('[data-action]');if(actionButton&&!actionButton.disabled)return action(actionButton.dataset.action);const thumb=ev.target.closest('[data-page]');if(thumb)return jump(Number(thumb.dataset.page));const toggle=ev.target.closest('[data-toggle]');if(toggle&&element())return change(()=>element()[toggle.dataset.toggle]=!element()[toggle.dataset.toggle]);const align=ev.target.closest('[data-align]');if(align&&element())return change(()=>element().align=align.dataset.align);const layout=ev.target.closest('[data-layout]');if(layout)return confirmAction('Заменить макет страницы?','Тексты и фотографии на этой странице заменятся выбранной композицией. Это можно отменить.',()=>change(()=>{doc.pages[index]=M.page(doc.theme,index,layout.dataset.layout);selected=null;}));});
    root.addEventListener('input',ev=>{if(ev.target.matches('[data-prop],[data-background],[data-document-name]'))editedInput(ev.target);});root.addEventListener('change',ev=>{if(ev.target.matches('select[data-prop]'))editedInput(ev.target);if(ev.target.matches('input[type=number][data-prop]')){inputSession=null;panel();}});
    const workspace=$('.ed-workspace');
    workspace.addEventListener('scroll',syncSwipeGuard,{passive:true});
    workspace.addEventListener('touchstart',()=>{
      if(workspace.classList.contains('ed-swipe-guard'))centerSwipeGuard();
    },{passive:true,capture:true});
    workspace.addEventListener('touchend',()=>{
      if(workspace.classList.contains('ed-swipe-guard'))requestAnimationFrame(centerSwipeGuard);
    },{passive:true,capture:true});
    workspace.addEventListener('touchcancel',()=>{
      if(workspace.classList.contains('ed-swipe-guard'))requestAnimationFrame(centerSwipeGuard);
    },{passive:true,capture:true});
    $('.ed-prev').onclick=()=>jump(index-1);$('.ed-next').onclick=()=>jump(index+1);const clearWorkspaceSelection=ev=>{if(ev.target.closest('[data-element]'))return;const panelOpen=$('.ed-panel')?.classList.contains('open');if(selected||panelOpen){selected=null;inputSession=null;closePanel();render();}};$('.ed-workspace').addEventListener('pointerdown',clearWorkspaceSelection);$('.ed-workspace').addEventListener('click',clearWorkspaceSelection);$('.ed-paper').addEventListener('touchstart',beginTouchDrag,{passive:true});$('.ed-paper').addEventListener('pointerdown',beginPointer);$('.ed-paper').addEventListener('pointermove',movePointer);$('.ed-paper').addEventListener('pointerup',endPointer);$('.ed-paper').addEventListener('pointercancel',endPointer);$('.ed-paper').addEventListener('dblclick',ev=>{if(ev.target.closest('[data-element]'))openPanel();});$('.ed-paper').addEventListener('focusin',ev=>{const el=ev.target.closest('[data-element]');if(el&&selected!==el.dataset.element){selected=el.dataset.element;panel();}});
    $('#ed-photo-file').onchange=ev=>loadPhoto(ev.target.files[0],uploadTarget);$('#ed-import-file').onchange=ev=>importFile(ev.target.files[0]);observer=new ResizeObserver(fit);observer.observe($('.ed-workspace'));render();viewportLayout();
  }
  async function mount(theme,count){const token=++session;active=true;document.body.classList.add('editing');key=theme+'-'+count;index=0;selected=null;history=[];future=[];doc=null;$('#app').innerHTML='<div class="editor"><div class="ed-top">Открываем ваш журнал…</div></div>';let saved;try{await saveChain.catch(()=>{});saved=await read(key);}catch{}if(token!==session||!active)return;try{doc=saved?M.validate(saved):M.create(theme,count);}catch{doc=M.create(theme,count);toast('Не удалось восстановить черновик. Откройте сохранённый файл журнала.');}document.title=doc.name+' — редактор Embrace';shell();if(saved){toast('Ваш черновик восстановлен');if(!doc.templateRevision){dialog('<h2>Готовые страницы уже здесь</h2><p>Для этого журнала доступен новый макет на 20 страниц с местами для фото и личными текстами. Ваш сохранённый черновик восстановлен.</p><button class="ed-primary" data-use-template>Открыть готовый макет</button><button data-close>Продолжить мой черновик</button>');$('[data-use-template]').onclick=freshTemplate;}}else save().catch(()=>{});}
  function leave(){if(active&&doc)save().catch(()=>{});active=false;session++;observer?.disconnect();closeDialog();$('.ed-print-root')?.remove();document.body.classList.remove('editing');}
  document.addEventListener('touchmove',moveTouchDrag,{passive:true,capture:true});
  document.addEventListener('touchend',endTouchDrag,{passive:true,capture:true});
  document.addEventListener('touchcancel',endTouchDrag,{passive:true,capture:true});
  document.addEventListener('keydown',keydown);window.addEventListener('beforeunload',ev=>{if(active&&dirty){save().catch(()=>{});ev.preventDefault();ev.returnValue='';}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&doc)save().catch(()=>{});});window.addEventListener('afterprint',()=>$('.ed-print-root')?.remove());
  window.MagazineEditor={mount,leave};
})();
