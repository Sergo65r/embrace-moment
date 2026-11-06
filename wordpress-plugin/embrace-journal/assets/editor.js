(function(){
  'use strict';
  const M=MagazineModel,$=s=>document.querySelector(s),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fonts={serif:'"Cormorant Garamond", Georgia, serif',sans:'Manrope, Arial, sans-serif',italic:'"Cormorant Garamond", Georgia, serif'};

  const toolPaths={"replace-photo":"M3 3h18v18H3z M3 16l5-5 4 4 3-3 6 6 M8 7h.01","background-photo":"M3 3h18v18H3z M3 16l5-5 4 4 3-3 6 6 M8 7h.01","tool-posX":"M6 2v16h16 M2 6h16v16","tool-filter":"M9 8a4 4 0 1 0 6 0a4 4 0 1 0-6 0 M8 11a4 4 0 1 0 4 6 M16 11a4 4 0 1 1-4 6","tool-opacity":"M12 2C8 8 4 11 4 15a8 8 0 0 0 16 0c0-4-4-7-8-13z M12 3v20","tool-rotation":"M21 10a9 9 0 1 0-2 9 M21 3v7h-7","layers":"M12 2L2 7l10 5 10-5z M2 12l10 5 10-5 M2 17l10 5 10-5","tool-text":"M3 4h18 M12 4v17 M8 21h8","tool-size":"M7 3v18 M3 7l4-4 4 4 M3 17l4 4 4-4 M16 5h5 M16 12h5 M16 19h5","tool-align":"M3 4h18 M6 9h12 M3 14h18 M6 19h12","tool-lineHeight":"M4 3v18 M1 6l3-3 3 3 M1 18l3 3 3-3 M11 5h11 M11 12h11 M11 19h11","page-add":"M12 3v18 M3 12h18","page-copy":"M8 8h13v13H8z M16 4H4v12","page-delete":"M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7","tool-layout":"M3 3h18v18H3z M12 3v18 M3 12h18","tool-background":"M12 3a9 9 0 1 0 0 18h2c3 0 2-3 1-4s0-3 2-3h2c4 0 3-11-7-11z M7 8h.1 M12 6h.1 M17 8h.1 M6 13h.1","tool-color":"M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z"};
  Object.assign(toolPaths,{
    'tool-filter':'M16.5 7.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0 M12.5 15a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0 M20.5 15a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0',
    undo:'M9 4 4 9l5 5 M4 9h10a6 6 0 0 1 0 12h-3',
    redo:'M15 4l5 5-5 5 M20 9H10a6 6 0 0 0 0 12h3',
    fullscreen:'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5',
    back:'M19 12H5 M11 6l-6 6 6 6', next:'M5 12h14 M13 6l6 6-6 6',
    'zoom-out':'M5 12h14','zoom-in':'M5 12h14 M12 5v14',
    page:'M5 3h10l4 4v14H5z M14 3v5h5 M9 12h6 M9 16h6',
    'tool-font':'M2 19 8 5l6 14 M4 14h8 M16 12c5-3 6 1 6 3v4 M22 15c-8-2-8 6 0 3'
  });
  toolPaths['tool-operations']=toolPaths['page-copy'];
  toolPaths.text=toolPaths['tool-text'];toolPaths.photo=toolPaths['replace-photo'];toolPaths.edit=toolPaths.page;
  const toolIcon=(act,fallback)=>toolPaths[act]?`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${toolPaths[act]}"/></svg>`:fallback;
  let doc=null,index=0,selected=null,history=[],future=[],key='',scale=1,active=false,session=0,saveTimer,toastTimer,dbPromise,saveChain=Promise.resolve(),observer,gesture=null,zoomFactor=1,viewMode='page',uploadTarget=null,inputSession=null,dirty=false,revision=0;
  let authorMode=false;const page=()=>doc.pages[index],element=()=>page().elements.find(e=>e.id===selected);
  function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open('embrace-studio-projects',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Хранилище занято другой вкладкой'));}));}
  async function read(k){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readonly'),r=tx.objectStore('drafts').get(k);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function write(k,value){const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,k);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  async function myProjects(){
    await save().catch(()=>{});const database=await db();
    const items=await new Promise((resolve,reject)=>{const rows=[],tx=database.transaction('drafts','readonly'),req=tx.objectStore('drafts').openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return resolve(rows);const match=String(c.key).match(/^ej-(\d+)-(\d+)-([a-zA-Z0-9_-]{1,100})$/);if(match)rows.push({id:match[1],count:match[2],project:match[3],name:c.value.name,date:c.value.updatedAt});c.continue();};req.onerror=()=>reject(req.error);});
    items.sort((a,b)=>(b.date||0)-(a.date||0));
    dialog(`<button class="ed-close" data-close aria-label="Закрыть мои журналы">×</button><h2>Мои журналы</h2><p>Черновики в этом браузере. Для переноса на другое устройство скачайте файл журнала.</p>${items.map((p,i)=>`<button data-project-index="${i}">${esc(p.name)} · ${p.count} стр.<br><small>${new Date(p.date||0).toLocaleString('ru-RU')}</small></button>`).join('')||'<p>Пока нет черновиков.</p>'}`);
    document.querySelectorAll('[data-project-index]').forEach(b=>b.onclick=()=>{const p=items[Number(b.dataset.projectIndex)],url=new URL(window.EmbraceWP.home);url.searchParams.set('embrace_journal',p.id);url.searchParams.set('pages',p.count);url.searchParams.set('project',p.project);location.href=url.href;});
  }
  function status(s){if($('.ed-status'))$('.ed-status').textContent=s;}
  function toast(s){clearTimeout(toastTimer);$('.ed-toast')?.remove();const el=document.createElement('div');el.className='ed-toast';el.setAttribute('role','status');el.textContent=s;document.body.append(el);toastTimer=setTimeout(()=>el.remove(),3500);}
  function save(){clearTimeout(saveTimer);if(authorMode){status(dirty?'Шаблон изменён — сохраните в WordPress':'Шаблон WordPress');return Promise.resolve();}if(!doc)return Promise.resolve();const value=M.clone(doc),k=key,token=session,rev=revision;value.updatedAt=Date.now();status('Сохраняем…');saveChain=saveChain.catch(()=>{}).then(()=>write(k,value)).then(()=>{if(token===session&&rev===revision){dirty=false;status('Сохранено на этом устройстве');}},()=>{if(token===session){dirty=true;status('Не сохранено — скачайте копию');}throw Error('Не удалось сохранить. Скачайте файл журнала через «Сохранить».');});return saveChain;}
  function schedule(){revision++;dirty=true;status('Есть изменения…');clearTimeout(saveTimer);saveTimer=setTimeout(()=>save().catch(()=>{}),450);}
  function snapshot(){return {pages:M.clone(doc.pages),index,selected,name:doc.name,templateRevision:doc.templateRevision};}
  function checkpoint(){history.push(snapshot());if(history.length>60)history.shift();future=[];inputSession=null;}
  function restore(s){doc.pages=s.pages;doc.name=s.name;doc.templateRevision=s.templateRevision;index=Math.min(s.index,doc.pages.length-1);selected=s.selected;inputSession=null;render();schedule();}
  function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop());}
  function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop());}
  function change(fn){checkpoint();fn();if(element()?.autoFit)fitTextToFrame(element());render();schedule();}
  function style(e){return `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;transform:rotate(${e.rotation}deg);opacity:${e.opacity};${e.type==='text'?`font-family:${fonts[e.font]};letter-spacing:${e.letterSpacing||0}px;text-decoration:${[e.underline?'underline':'',e.strike?'line-through':''].join(' ')};font-size:${e.size}px;color:${e.color};font-weight:${e.bold?700:400};font-style:${e.italic||e.font==='italic'?'italic':'normal'};text-align:${e.align};line-height:${e.lineHeight};`:''}`;}
  function contents(e){return e.type==='text'?`<div class="ed-text-content${e.autoFit?' ed-text-fitted':''}"><span class="ed-text-inner">${esc(e.text)}</span></div>`:e.asset&&doc.assets[e.asset]?`<img src="${esc(doc.assets[e.asset])}" alt="Фотография" draggable="false" style="filter:${({none:'none',grayscale:'grayscale(1)',sepia:'sepia(1)',warm:'sepia(.25) saturate(1.1)'})[e.filter||'none']};transform:${e.flipX?'scaleX(-1)':'none'};object-fit:${e.fit};object-position:${e.posX}% ${e.posY}%">`:'<div class="ed-placeholder"><span>＋</span>Ваше фото</div>';}
  let textMeasure;
  function fitTextToFrame(e){
    if(e.type!=='text'||!e.text.trim())return true;
    if(!textMeasure){textMeasure=document.createElement('div');textMeasure.className='ed-text-measure';textMeasure.setAttribute('aria-hidden','true');document.body.append(textMeasure);}
    textMeasure.style.cssText=style(e)+';position:fixed;left:-10000px;top:0;transform:none;height:auto;min-height:0;visibility:hidden;pointer-events:none;white-space:pre-wrap;overflow-wrap:anywhere;box-sizing:border-box;padding:0;border:0;';
    textMeasure.textContent=e.text;
    const glyphs=document.createRange();glyphs.selectNodeContents(textMeasure);
    const fits=size=>{textMeasure.style.fontSize=size+'px';const box=textMeasure.getBoundingClientRect(),ink=glyphs.getBoundingClientRect(),overhang=Math.max(0,box.top-ink.top,ink.bottom-box.bottom);return box.height+2*overhang<=e.h+.01&&textMeasure.scrollWidth<=e.w+.5;};
    if(!fits(1))return false;
    let lo=1,hi=1200;
    for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(fits(mid))lo=mid;else hi=mid;}
    e.size=Math.floor(lo*100)/100;e.autoFit=true;return true;
  }
  function elementsHTML(p,interactive=false){return p.elements.filter(e=>!e.hidden).map(e=>`<div data-kind="${e.type}" class="ed-element${interactive&&selected===e.id?' selected':''}" style='${style(e)}' ${interactive?`data-element="${e.id}" tabindex="0" role="button" aria-label="${esc(e.type==='text'?'Текст: '+e.text.slice(0,70):'Фотография: нажмите для выбора')}"`:''}>${contents(e)}</div>`).join('');}
  function thumbnails(){const rail=$('.ed-pages'),scroll=rail?.scrollLeft||0,top=rail?.scrollTop||0;if(!rail)return;rail.innerHTML='<span class="ed-pages-label">Страницы</span>'+doc.pages.map((p,i)=>`<button class="ed-thumb ${i===index?'active':''}" data-page="${i}" aria-label="Страница ${i+1}${i===0?', обложка':''}" aria-current="${i===index?'page':'false'}"><div class="ed-mini"><div class="ed-mini-inner" style="background:${p.background}">${elementsHTML(p)}</div></div><small>${i+1}${i===0?' · Обложка':''}${bindingRisks(i).length?'<span class="ej-binding-dot" aria-label="Есть элементы в зоне проколов">!</span>':''}</small></button>`).join('');rail.insertAdjacentHTML('beforeend','<button class="ed-thumb ej-add-page" data-action="page-add" aria-label="Добавить страницу">＋<small>Добавить<br>страницу</small></button>');rail.scrollLeft=scroll;rail.scrollTop=top;}
  function fitPreview(){const first=$('.ed-preview-page');if(first)document.querySelectorAll('.ed-preview-inner').forEach(el=>el.style.transform=`scale(${first.clientWidth/M.W})`);}
  function fit(){
    fitPreview();const area=$('.ed-workspace'),wrap=$('.ed-paper-wrap');if(!area||!wrap)return;
    const cs=getComputedStyle(area),aw=area.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=area.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    const mobile=matchMedia('(max-width:700px)').matches;
    const typing=mobile&&$('.editor').classList.contains('input-focused');
    scale=Math.max(.04,viewMode==='width'||typing?Math.min(1,aw/(M.W+24)):Math.min(1,aw/(M.W+24),ah/(M.H+24)))*zoomFactor;
    wrap.style.width=M.W*scale+'px';wrap.style.height=M.H*scale+'px';$('.ed-paper').style.transform=`scale(${scale})`;$('.ed-paper').style.setProperty('--ed-scale',scale);
    area.classList.toggle('ed-zoomed',zoomFactor>1);const z=$('[data-action="zoom-reset"]');if(z){z.textContent=Math.round(zoomFactor*100)+'%';z.setAttribute('aria-label','Вписать страницу');}
    const toggle=$('[data-action=view-toggle]');if(toggle){toggle.textContent=viewMode==='page'&&zoomFactor===1?'Крупнее':'Вся страница';toggle.setAttribute('aria-label',viewMode==='page'&&zoomFactor===1?'Увеличить страницу по ширине':'Показать всю страницу');}
    updateSelectionControls();positionGestureLayer();
  }

  // Handles live outside the clipped artwork, but are kept within the visible canvas.
  function updateSelectionControls(){
    const layer=$('.ed-selection-layer'),area=$('.ed-workspace'),paperEl=$('.ed-paper'),main=$('.ed-main'),e=element();
    if(!layer||!area||!paperEl||!main)return;
    if(!e||e.hidden||e.locked){layer.replaceChildren();layer.dataset.elementId='';return;}
    const a=area.getBoundingClientRect(),p=paperEl.getBoundingClientRect(),m=main.getBoundingClientRect();
    Object.assign(layer.style,{left:(a.left-m.left)+'px',top:(a.top-m.top)+'px',width:area.clientWidth+'px',height:area.clientHeight+'px'});
    if(layer.dataset.elementId!==e.id){layer.dataset.elementId=e.id;layer.innerHTML='<svg class="ed-selection-outline" aria-hidden="true"><polygon fill="none"/></svg>'+['nw','ne','sw','se'].map((c,i)=>`<button type="button" class="ed-edge-handle" data-element="${e.id}" data-resize="${c}" aria-label="Изменить размер: ${['верхний левый','верхний правый','нижний левый','нижний правый'][i]} угол"></button>`).join('');}
    const bounds={left:Math.max(16,p.left-a.left),top:Math.max(16,p.top-a.top),right:Math.min(area.clientWidth-16,p.right-a.left),bottom:Math.min(area.clientHeight-16,p.bottom-a.top)};
    const points=M.selectionHandles(e,scale,{x:p.left-a.left,y:p.top-a.top},bounds);
    layer.querySelector('polygon').setAttribute('points',[points[0],points[1],points[3],points[2]].map(v=>v.actualX+','+v.actualY).join(' '));
    layer.classList.toggle('is-text',e.type==='text');
    layer.querySelectorAll('[data-resize]').forEach((button,i)=>{button.style.left=points[i].x+'px';button.style.top=points[i].y+'px';});
  }

  let viewportFrame=0,previousVisualHeight=0,previousTyping=false;
  function viewportLayout(){
    const editor=$('.editor');if(!editor)return;
    const v=window.visualViewport,mobile=matchMedia('(max-width:700px)').matches;
    const focused=document.activeElement,typing=mobile&&!!focused?.matches('.ed-panel textarea,.ed-panel input:not([type=color]):not([type=range])');
    editor.style.setProperty('--ed-height',`${mobile&&v?v.height:innerHeight}px`);
    editor.style.setProperty('--ed-visual-top',`${mobile&&v?v.offsetTop:0}px`);
    editor.classList.toggle('input-focused',typing);
    editor.classList.toggle('keyboard-open',typing&&!!v&&innerHeight-v.height>100);
    document.querySelectorAll('.ej-input-field').forEach(el=>el.classList.remove('ej-input-field'));
    if(typing)focused.closest('label')?.classList.add('ej-input-field');
    syncPanelLayout();
    const height=mobile&&v?v.height:innerHeight;
    if(typing&&(!previousTyping||Math.abs(height-previousVisualHeight)>1))requestAnimationFrame(revealSelectedText);
    previousVisualHeight=height;previousTyping=typing;
  }
  function revealSelectedText(){const area=$('.ed-workspace'),e=element();if(area&&e&&matchMedia('(max-width:700px)').matches)area.scrollTop=Math.max(0,12+(e.y+e.h/2)*scale-area.clientHeight/2);}
  function queueViewport(){cancelAnimationFrame(viewportFrame);viewportFrame=requestAnimationFrame(viewportLayout);}
  window.visualViewport?.addEventListener('resize',queueViewport);
  window.visualViewport?.addEventListener('scroll',queueViewport);
  window.addEventListener('resize',queueViewport);
  document.addEventListener('focusin',queueViewport);document.addEventListener('focusout',queueViewport);
  function focusPanelField(target){
    if(!target)return;
    target.focus({preventScroll:true});viewportLayout();
    const p=$('.ed-panel');if(p)p.scrollTop=0;
    requestAnimationFrame(revealSelectedText);
  }
  function syncPanelLayout(){const editor=$('.editor'),layout=$('.ed-layout'),panelEl=$('.ed-panel');if(!editor||!layout||!panelEl)return;const height=panelEl.classList.contains('open')?panelEl.getBoundingClientRect().height:0;editor.style.setProperty('--panel-height',`${Math.ceil(height)}px`);layout.style.setProperty('--panel-height',`${Math.ceil(height)}px`);requestAnimationFrame(fit);}
  function closePanel(){if(document.activeElement?.closest('.ed-panel'))document.activeElement.blur();const p=$('.ed-panel');if(!p)return;p.classList.remove('open','ej-expanded');viewportLayout();}
  function contextToolbar(){const bar=$('.ed-context-toolbar');if(!bar)return;const e=element();if(!e){bar.innerHTML='<span class="ed-context-empty">Выберите текст или фотографию на странице</span>';bar.classList.remove('has-selection');return;}bar.classList.add('has-selection');const text=e.type==='text';bar.innerHTML=text?`<span class="ed-context-type">ТЕКСТ</span><button data-action="edit">Изменить</button><button data-action="font">Aa&nbsp; Шрифт</button><button data-action="color"><i style="background:${e.color}"></i> Цвет</button><button data-action="settings">⚙ Настройки</button><button data-action="effects">⌁ Эффекты</button><button data-action="duplicate">▣ Дублировать</button><button class="danger" data-action="delete">♲ Удалить</button>`:`<span class="ed-context-type">ФОТО</span><button data-action="replace-photo">▣ Выбрать фото</button><button data-action="backward">↓ Сдвинуть назад</button><button data-action="forward">↑ Сдвинуть вперед</button><button data-action="duplicate">▣ Копировать</button><button class="danger" data-action="delete">♲ Удалить</button>`;}
  function paper(){const el=$('.ed-paper');if(!el)return;el.style.background=page().background;el.innerHTML=elementsHTML(page(),true)+bindingOverlay(index)+`<div class="ed-guide-layer" aria-hidden="true"></div>`;$('.ed-page-number').textContent=`${index+1} / ${doc.pages.length}`;$('.ed-prev').disabled=index===0;$('.ed-next').disabled=index===doc.pages.length-1;document.querySelectorAll('[data-action=undo]').forEach(b=>b.disabled=!history.length);document.querySelectorAll('[data-action=redo]').forEach(b=>b.disabled=!future.length);$('.ed-mobile-edit').innerHTML=toolIcon('page','')+`<span>${selected?'Изменить':'Страница'}</span>`;$('.ed-name strong').textContent=doc.name;contextToolbar();updateBindingWarning();fit();}
  function render(){if(!active)return;paper();thumbnails();panel();}
  const bindingMM=()=>Number(window.EmbraceWP.binding?.widthMm)||M.BINDING_MM;
  const sideLabel=i=>M.bindingSide(i)==='left'?'слева':'справа';
  const bindingRisks=i=>doc.pages[i].elements.filter(e=>M.bindingRisk(e,i,bindingMM()));
  function bindingPages(){return doc.pages.map((p,i)=>bindingRisks(i).length?i+1:null).filter(Boolean);}
  function bindingOverlay(i){return `<div class="ed-binding-zone ed-binding-${M.bindingSide(i)}" style="width:${M.W*bindingMM()/210}px" aria-hidden="true"><div class="ej-punches">${Array.from({length:24},()=>'<i></i>').join('')}</div><span>ЗОНА ПРОКОЛОВ</span></div>`;}
  function bindingSummary(){const pages=bindingPages();return `<section class="ed-binding-summary"><b>Пружина: обложка слева, оборот справа</b><p>На страницах 1, 3, 5… проколы слева; на 2, 4, 6… — справа. Зона от края: ${bindingMM()} мм${window.EmbraceWP.binding?.confirmed?'':' (предварительно, уточняется у типографии)'}. Не размещайте в ней текст, лица и важные детали фото. Изображённые отверстия условные; направляющие не печатаются.</p>${pages.length?`<p class="ej-binding-alert">Проверьте страницы: ${pages.map(n=>`<button data-review-binding="${n-1}">${n} · ${sideLabel(n-1)}</button>`).join(' ')}</p>`:'<p>Текстовые и фоторамки не пересекают зону проколов.</p>'}</section>`;}
  function bindingInfo(){dialog(`<button class="ed-close" data-close aria-label="Закрыть информацию о пружине">×</button><h2>Место для пружины</h2>${bindingSummary()}<p>Фото может доходить до края, если лица и важные детали остаются за пределами выделенной полосы. Проверка определяет пересечение рамки, а не содержимое фотографии.</p>`);}
  function updateBindingWarning(){const notice=$('.ed-binding-notice');if(!notice)return;const risks=bindingRisks(index),e=element(),selectedRisk=e&&M.bindingRisk(e,index,bindingMM());notice.classList.toggle('has-risk',risks.length>0);const title=`Пружина ${sideLabel(index)} · ${bindingMM()} мм${window.EmbraceWP.binding?.confirmed?'':' · предварительно'}`;
    const detail=selectedRisk?(e.type==='text'?'Текст в зоне проколов — сдвиньте его от края.':'Край фото в зоне проколов — проверьте лица и важные детали.'):risks.length?`В зоне проколов: ${risks.length}. Проверьте расположение текста и фото.`:'Не размещайте в полосе текст, лица и важные детали.';
    const strong=notice.querySelector('strong'),message=notice.querySelector('.ej-binding-message');if(strong.textContent!==title)strong.textContent=title;if(message.textContent!==detail)message.textContent=detail;
  }

  function freshTemplate(){confirmAction('Восстановить исходный макет?','Ваше текущее оформление заменится макетом владельца. Перед этим можно скачать копию. Действие можно отменить.',()=>change(()=>{const base=M.create(doc.theme,Math.max(20,doc.pages.length));doc.pages=base.pages;Object.assign(doc.assets,base.assets);index=0;selected=null;closePanel();}));}

  function field(label,control){return `<label>${label}${control}</label>`;}
  function number(label,prop,value,min,max,step=1){return field(label,`<input type="number" data-prop="${prop}" value="${value}" min="${min}" max="${max}" step="${step}">`);}
  function panel(){const p=$('.ed-panel');if(!p)return;const wasOpen=p.classList.contains('open'),e=element();const panelType=e?.type||'page';if(p.dataset.kind!==panelType){delete p.dataset.tool;p.dataset.kind=panelType;}let html='';
    if(!e){html=`<p>Нажмите на текст или фото, чтобы изменить его.</p>${field('Название журнала',`<input data-document-name value="${esc(doc.name)}" maxlength="150">`)}${field('Цвет страницы',`<input type="color" data-background value="${page().background}">`)}<details open><summary>Макет этой страницы</summary><button class="ed-layout-button" data-layout="story">Текст и фотография</button><button class="ed-layout-button" data-layout="photos">Три фотографии</button><button class="ed-layout-button" data-layout="blank">Чистая страница</button></details><div class="ed-operations"><button data-action="page-before" ${index===0?'disabled':''}>← Раньше</button><button data-action="page-after" ${index===doc.pages.length-1?'disabled':''}>Позже →</button><button data-action="page-copy" ${doc.pages.length>=36?'disabled':''}>Копия страницы</button><button data-action="page-add" ${doc.pages.length>=36?'disabled':''}>Пустая страница</button><button class="danger" data-action="page-delete" ${doc.pages.length<=1?'disabled':''}>Удалить страницу</button></div><p class="ed-help">Все надписи и фотографии — отдельные элементы. Перетащите выделенный элемент, потяните за круглый маркер, чтобы изменить размер. Все действия можно отменить.</p>`;}
    else{if(e.type==='text'){html=field('Текст',`<textarea data-prop="text" maxlength="10000" placeholder="Ваша история…">${esc(e.text)}</textarea>`)+`<div class="ed-row">${field('Шрифт',`<select data-prop="font"><option value="serif" ${e.font==='serif'?'selected':''}>Журнальный</option><option value="sans" ${e.font==='sans'?'selected':''}>Современный</option><option value="italic" ${e.font==='italic'?'selected':''}>Рукописный курсив</option></select>`)}${number('Размер','size',e.size,1,1200,.01)}</div><div class="ed-toggle-row"><button data-toggle="bold" aria-label="Жирный" title="Жирный" class="${e.bold?'active':''}" aria-pressed="${e.bold}"><b>B</b></button><button data-toggle="italic" aria-label="Курсив" title="Курсив" class="${e.italic?'active':''}" aria-pressed="${e.italic}"><i>I</i></button><button data-toggle="underline" aria-label="Подчеркнуть" title="Подчеркнуть" aria-pressed="${!!e.underline}"><u>U</u></button><button data-toggle="strike" aria-label="Зачеркнуть" title="Зачеркнуть" aria-pressed="${!!e.strike}"><s>S</s></button></div><div class="ed-toggle-row">${[['left','Слева'],['center','По центру'],['right','Справа']].map(([value,label])=>`<button data-align="${value}" class="${e.align===value?'active':''}">${label}</button>`).join('')}</div><div class="ed-row">${field('Цвет текста',`<input type="color" data-prop="color" value="${e.color}">`)}${number('Прозрачность','opacity',e.opacity,.1,1,.1)}</div><div class="ed-row">${number('Межстрочный','lineHeight',e.lineHeight,.8,2,.05)}${number('Межбуквенный','letterSpacing',e.letterSpacing||0,-5,20,.1)}</div><div class="ed-overflow" hidden>Текст не помещается: увеличьте высоту блока или уменьшите шрифт.</div>`;}
      else{html=`<button class="ed-primary" style="width:100%" data-action="replace-photo">${e.asset?'Заменить фото':'Загрузить фото'}</button><p>JPG, PNG, WebP · до 20 МБ. ${authorMode?'Фотографии шаблона сохраняются в WordPress и видны покупателям.':'Фотографии остаются в вашем браузере.'}</p>${field('Как разместить',`<select data-prop="fit"><option value="cover" ${e.fit==='cover'?'selected':''}>Заполнить рамку</option><option value="contain" ${e.fit==='contain'?'selected':''}>Показать целиком</option></select>`)}${field('Фильтр',`<select data-prop="filter">${[['none','Без фильтра'],['grayscale','Чёрно-белый'],['sepia','Сепия'],['warm','Тёплый']].map(([v,n])=>`<option value="${v}" ${(e.filter||'none')===v?'selected':''}>${n}</option>`).join('')}</select>`)}<button data-toggle="flipX" aria-pressed="${!!e.flipX}">Отразить по горизонтали</button>${number('Прозрачность','opacity',e.opacity,.1,1,.1)}${field('Кадр по горизонтали',`<input type="range" data-prop="posX" min="0" max="100" value="${e.posX}">`)}${field('Кадр по вертикали',`<input type="range" data-prop="posY" min="0" max="100" value="${e.posY}">`)}`;}
      html+=`<details><summary>Размер и положение</summary><div class="ed-row">${number('Слева','x',Math.round(e.x),-e.w+MIN_VISIBLE,M.W-MIN_VISIBLE)}${number('Сверху','y',Math.round(e.y),-e.h+MIN_VISIBLE,M.H-MIN_VISIBLE)}${number('Ширина','w',Math.round(e.w),24,M.W-e.x)}${number('Высота','h',Math.round(e.h),24,M.H-e.y)}${number('Поворот, °','rotation',e.rotation,-180,180)}</div></details><div class="ed-operations"><button data-action="forward">На слой выше</button><button data-action="backward">На слой ниже</button><button data-action="duplicate">Дублировать</button><button class="danger" data-action="delete">Удалить</button></div>`;
    }
    const tools=e?(e.type==='photo'?[['▧','Заменить','replace-photo'],['⌗','Обрезать','tool-posX'],['◉','Фильтры','tool-filter'],['◐','Прозрачность','tool-opacity'],['⟳','Повернуть','tool-rotation'],['▱','Слои','layers'],['▢','Действия','tool-operations']]:[['T','Текст','tool-text'],['Aa','Шрифт','tool-font'],['↕','Размер','tool-size'],['●','Цвет','tool-color'],['☰','Выравнивание','tool-align'],['↔','Интервалы','tool-lineHeight'],['⟳','Положение','tool-rotation'],['▱','Слои','layers'],['▢','Действия','tool-operations']]):[['◉','Цвет страницы','tool-background'],['▧','Фон','background-photo'],['＋','Добавить','page-add'],['▢','Дублировать','page-copy'],['♲','Удалить','page-delete'],['⊞','Макеты','tool-layout'],['▢','Порядок','tool-operations']];
    p.innerHTML=`<div class="ed-sheet-head"><h2>${e?e.type==='text'?'Ваш текст':'Ваша фотография':'Страница '+(index+1)}</h2><button class="ed-panel-close" data-action="close-panel" aria-label="Закрыть инструменты">Готово</button></div><div class="ej-tool-tiles">${tools.map(([icon,label,act])=>`<button data-action="${act}"><span aria-hidden="true">${toolIcon(act,icon)}</span>${label}</button>`).join('')}</div><div class="ej-properties">${html}</div>`;p.classList.toggle('open',wasOpen);compactPanel(p,p.dataset.tool||(e?.type==='text'?'font':e?'posX':'background'));syncPanelLayout();checkOverflow();
  }
  function compactPanel(p,tool){
    p.dataset.tool=tool;p.classList.add('ej-expanded','ej-compact');
    const props=p.querySelector('.ej-properties');if(!props)return;
    const selectors={text:'[data-prop=text]',font:'[data-prop=font],[data-toggle=bold],[data-toggle=italic],[data-toggle=underline],[data-toggle=strike]',size:'[data-prop=size]',color:'[data-prop=color]',align:'[data-align]',lineHeight:'[data-prop=lineHeight],[data-prop=letterSpacing]',posX:'[data-prop=fit],[data-prop=posX],[data-prop=posY]',filter:'[data-prop=filter],[data-toggle=flipX]',opacity:'[data-prop=opacity]',rotation:'[data-prop=rotation]',background:'[data-background],[data-document-name]',layout:'[data-layout]',operations:'.ed-operations'};
    const selector=selectors[tool]||'details,.ed-operations';
    for(const child of props.children){const visible=child.matches(selector)||!!child.querySelector(selector);child.classList.toggle('ej-property-active',visible);if(visible&&child.tagName==='DETAILS')child.open=true;}
    p.querySelectorAll('.ej-tool-tiles [data-action]').forEach(b=>{const on=b.dataset.action==='tool-'+tool;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    const rail=p.querySelector('.ej-tool-tiles'),tab=rail?.querySelector('.active');if(tab){const left=tab.offsetLeft-rail.offsetLeft;if(left<rail.scrollLeft)rail.scrollLeft=left;else if(left+tab.offsetWidth>rail.scrollLeft+rail.clientWidth)rail.scrollLeft=left+tab.offsetWidth-rail.clientWidth;}
    p.scrollTop=0;
  }
  function checkOverflow(){const content=$('.ed-element.selected .ed-text-content'),warning=$('.ed-overflow');if(warning&&content)requestAnimationFrame(()=>{warning.hidden=content.scrollHeight<=content.clientHeight+2;});}
  function openPanel(focus){panel();const p=$('.ed-panel');p.classList.add('open');if(focus)compactPanel(p,focus);syncPanelLayout();if(focus)requestAnimationFrame(()=>{const target=$(`.ed-panel [data-prop="${focus}"]`);focusPanelField(target);});}
  function jump(i){if(i<0||i>=doc.pages.length)return;index=i;selected=null;inputSession=null;closePanel();render();const workspace=$('.ed-workspace');if(workspace){workspace.scrollTop=0;workspace.scrollLeft=0;}const thumb=$('.ed-thumb.active'),rail=$('.ed-pages');if(thumb&&rail)rail.scrollLeft=thumb.offsetLeft-rail.clientWidth/2+thumb.clientWidth/2;}
  function pick(id){if(selected!==id){const p=$('.ed-panel');p?.classList.remove('ej-expanded');if(p)delete p.dataset.tool;}selected=id;inputSession=null;paper();openPanel();}
  function addText(){if(page().elements.length>=100)return toast('На странице уже 100 элементов');change(()=>{const e=M.text('Ваш текст',60,300,450,130,34);page().elements.push(e);selected=e.id;});openPanel(matchMedia('(min-width:701px)').matches?'text':undefined);}
  function imagePicker(){uploadTarget={session,page:page().id,element:element()?.type==='photo'?selected:null};$('#ed-photo-file').value='';$('#ed-photo-file').click();}
  function confirmAction(title,description,onYes){dialog(`<h2>${title}</h2><p>${description}</p><button class="ed-primary" data-confirm>Продолжить</button><button data-close>Отмена</button>`);$('[data-confirm]').onclick=()=>{closeDialog();onYes();};}
  function dialog(html){closeDialog();const d=document.createElement('dialog');d.className='ed-dialog editor';d.id='ed-dialog';d.style.display='block';d.style.height='auto';d.innerHTML=html;document.body.append(d);d.addEventListener('click',e=>{const review=e.target.closest('[data-review-binding]');if(review){const i=Number(review.dataset.reviewBinding);closeDialog();jump(i);return;}if(e.target.closest('[data-close]'))closeDialog();});d.addEventListener('close',()=>d.remove());d.showModal();}
  function closeDialog(){$('#ed-dialog')?.close();$('#ed-dialog')?.remove();}
  function action(name){if(name==='binding-info')return bindingInfo();if(name.startsWith('tool-')){const prop=name.slice(5),p=$('.ed-panel');compactPanel(p,prop);syncPanelLayout();if(prop==='text')focusPanelField(p.querySelector('[data-prop=text]'));return;}if(name==='fullscreen'){document.querySelector('.editor').classList.toggle('ej-focus');requestAnimationFrame(fit);return;}if(name==='background-photo'){uploadTarget={session,page:page().id,element:null,background:true};$('#ed-photo-file').value='';$('#ed-photo-file').click();return;}const e=element(),list=page().elements,pos=list.indexOf(e);if(e?.locked&&['replace-photo','delete','forward','backward'].includes(name))return toast('Сначала разблокируйте элемент в панели «Слои»');switch(name){
    case 'layers':return layers();case 'zoom-in':zoomFactor=Math.min(3,zoomFactor+.25);return fit();case 'zoom-out':zoomFactor=Math.max(.5,zoomFactor-.25);return fit();case 'zoom-reset':viewMode='page';zoomFactor=1;$('.ed-workspace').scrollTop=0;$('.ed-workspace').scrollLeft=0;return fit();case 'view-toggle':viewMode=viewMode==='page'&&zoomFactor===1?'width':'page';zoomFactor=1;$('.ed-workspace').scrollTop=0;$('.ed-workspace').scrollLeft=0;return fit();case 'placeholder':return change(()=>{const e=M.photo(70,210,460,400);page().elements.push(e);selected=e.id;});case 'text':return addText();case 'photo':case 'replace-photo':return imagePicker();case 'undo':return undo();case 'redo':return redo();case 'edit':return openPanel();case 'font':return openPanel('font');case 'color':return openPanel('color');case 'settings':return openPanel();case 'effects':return openPanel('opacity');case 'close-panel':closePanel();return;case 'page':selected=null;paper();return openPanel();
    case 'duplicate':if(!e)return;if(list.length>=100)return toast('На странице уже 100 элементов');return change(()=>{const c=M.clone(e);c.id=M.id();c.x=Math.min(M.W-c.w,c.x+15);c.y=Math.min(M.H-c.h,c.y+15);list.push(c);selected=c.id;});
    case 'delete':if(!e)return;return change(()=>{list.splice(pos,1);selected=null;});
    case 'forward':if(!e||pos===list.length-1)return;return change(()=>{[list[pos],list[pos+1]]=[list[pos+1],list[pos]];});
    case 'backward':if(!e||pos===0)return;return change(()=>{[list[pos],list[pos-1]]=[list[pos-1],list[pos]];});
    case 'page-add':case 'page-copy':if(doc.pages.length>=36)return;return change(()=>{const p=name==='page-add'?M.page(doc.theme,index+1,'blank'):M.clone(page());p.id=M.id();p.elements.forEach(e=>e.id=M.id());doc.pages.splice(index+1,0,p);index++;selected=null;});
    case 'page-before':if(index<=1)return toast('Обложка остаётся первой страницей');return change(()=>{[doc.pages[index-1],doc.pages[index]]=[doc.pages[index],doc.pages[index-1]];index--;});
    case 'page-after':if(index===0)return toast('Обложка остаётся первой страницей');if(index===doc.pages.length-1)return;return change(()=>{[doc.pages[index+1],doc.pages[index]]=[doc.pages[index],doc.pages[index+1]];index++;});
    case 'page-delete':if(index===0)return toast('Обложку можно изменить, но нельзя удалить');if(doc.pages.length<=1)return;return confirmAction('Удалить страницу?',`Страница ${index+1} будет удалена. Действие можно отменить.`,()=>change(()=>{doc.pages.splice(index,1);index=Math.min(index,doc.pages.length-1);selected=null;}));
    case 'order':return order();case 'fresh-template':return freshTemplate();case 'save':return saveMenu();case 'preview':return preview();
  }}
  const MIN_VISIBLE=26,SNAP_THRESHOLD=7,GESTURE_CENTER=1100;
  function dragBounds(e){return {minX:Math.max(-M.W,-e.w+MIN_VISIBLE),maxX:M.W-MIN_VISIBLE,minY:Math.max(-M.H,-e.h+MIN_VISIBLE),maxY:M.H-MIN_VISIBLE};}
  function clampDrag(e,x,y){const b=dragBounds(e);return {x:Math.max(b.minX,Math.min(b.maxX,x)),y:Math.max(b.minY,Math.min(b.maxY,y))};}
  function axisSnap(position,size,targets){const points=[position,position+size/2,position+size];let best=null;for(const target of targets){for(const point of points){const delta=target-point,dist=Math.abs(delta);if(dist<=SNAP_THRESHOLD&&(!best||dist<best.dist))best={value:position+delta,guide:target,dist};}}return best;}
  function snapMove(e,x,y){const xs=[0,M.W/2,M.W],ys=[0,M.H/2,M.H];for(const other of page().elements){if(other.id===e.id)continue;xs.push(other.x,other.x+other.w/2,other.x+other.w);ys.push(other.y,other.y+other.h/2,other.y+other.h);}const sx=axisSnap(x,e.w,xs),sy=axisSnap(y,e.h,ys),bounded=clampDrag(e,sx?sx.value:x,sy?sy.value:y);return {x:bounded.x,y:bounded.y,guides:{x:sx?.guide??null,y:sy?.guide??null}};}
  function showGuides(guides){const layer=$('.ed-guide-layer');if(!layer)return;layer.innerHTML='';if(guides?.x!==null&&guides?.x!==undefined){const line=document.createElement('i');line.className='ed-guide ed-guide-v';line.style.left=guides.x+'px';layer.append(line);}if(guides?.y!==null&&guides?.y!==undefined){const line=document.createElement('i');line.className='ed-guide ed-guide-h';line.style.top=guides.y+'px';layer.append(line);}}
  function clearGuides(){const layer=$('.ed-guide-layer');if(layer)layer.innerHTML='';}
  function gestureHit(clientX,clientY){
    const stack=document.elementsFromPoint(clientX,clientY);
    const handle=stack.find(el=>el.matches?.('.ed-edge-handle[data-resize]'));
    const node=handle||stack.map(el=>el.closest?.('.ed-element[data-element]')).find(Boolean);
    return {node,resize:handle?.dataset.resize||null};
  }
  function centerGestureLayer(){const layer=$('.ed-gesture-layer');if(layer)layer.scrollTop=GESTURE_CENTER;}
  function positionGestureLayer(){
    const layer=$('.ed-gesture-layer'),area=$('.ed-workspace'),main=$('.ed-main');if(!layer||!area||!main)return;
    const a=area.getBoundingClientRect(),m=main.getBoundingClientRect();
    Object.assign(layer.style,{left:(a.left-m.left)+'px',top:(a.top-m.top)+'px',width:area.clientWidth+'px',height:area.clientHeight+'px'});
    if(layer.clientHeight&&!layer.dataset.ready){centerGestureLayer();layer.dataset.ready='1';}
  }
  function beginCanvasTouch(ev){
    if(!active)return;
    if(ev.touches.length!==1){finishCanvasTouch({type:'touchcancel'});return;}
    const t=ev.touches[0],hit=gestureHit(t.clientX,t.clientY),area=$('.ed-workspace');centerGestureLayer();
    const e=hit.node&&page().elements.find(item=>item.id===hit.node.dataset.element);
    if(e){if(selected!==e.id)delete $('.ed-panel').dataset.tool;selected=e.id;inputSession=null;paper();panel();}
    gesture={kind:e&&!e.locked?'canvas-touch':'canvas-pan',id:e?.id,touch:t.identifier,
      start:e?{x:e.x,y:e.y,w:e.w,h:e.h,rotation:e.rotation}:null,scale,
      scrollX:area.scrollLeft,scrollY:area.scrollTop,clientX:t.clientX,clientY:t.clientY,
      resize:hit.resize,changed:false};
  }
  function applyCanvasDelta(g,e,clientX,clientY){
    if(!e||e.locked)return;
    const dx=(clientX-g.clientX)/g.scale,dy=(clientY-g.clientY)/g.scale;
    if(!g.changed&&Math.hypot(clientX-g.clientX,clientY-g.clientY)<4)return;
    if(!g.changed){checkpoint();g.changed=true;}
    if(g.resize){const before={...e};Object.assign(e,M.resizeCorner(g.start,g.resize,dx,dy));if(e.type==='text'&&!fitTextToFrame(e))Object.assign(e,before);clearGuides();}
    else{const snapped=snapMove(e,g.start.x+dx,g.start.y+dy);e.x=snapped.x;e.y=snapped.y;showGuides(snapped.guides);}
    const node=$('.ed-element.selected');if(node){node.style.cssText=style(e);node.querySelector('.ed-text-content')?.classList.toggle('ed-text-fitted',!!e.autoFit);}
    updateBindingWarning();updateSelectionControls();
  }
  function moveCanvasTouch(ev){
    const g=gesture;if(!g||!g.kind?.startsWith('canvas-'))return;
    if(ev.touches.length!==1){finishCanvasTouch({type:'touchcancel'});return;}
    const t=[...ev.touches].find(t=>t.identifier===g.touch);if(!t)return;
    if(g.kind==='canvas-pan'){
      const dx=t.clientX-g.clientX,dy=t.clientY-g.clientY;if(Math.hypot(dx,dy)>=4)g.changed=true;
      const area=$('.ed-workspace');area.scrollLeft=g.scrollX-dx;area.scrollTop=g.scrollY-dy;updateSelectionControls();return;
    }
    applyCanvasDelta(g,page().elements.find(e=>e.id===g.id),t.clientX,t.clientY);
  }
  function finishCanvasTouch(ev){
    const g=gesture;if(!g||!g.kind?.startsWith('canvas-'))return;
    if(ev?.changedTouches&&![...ev.changedTouches].some(t=>t.identifier===g.touch))return;
    clearGuides();gesture=null;centerGestureLayer();
    if(g.kind==='canvas-touch'&&g.changed){render();schedule();}
    if(ev?.type==='touchcancel')return;
    if(g.id){if(g.kind==='canvas-touch'||!g.changed)openPanel();}
    else if(!g.changed){selected=null;inputSession=null;closePanel();render();}
  }
  function editedInput(target){const e=element(),prop=target.dataset.prop;if(e?.locked&&prop){panel();return toast('Сначала разблокируйте элемент в панели «Слои»');}const inputKey=(e?.id||page().id)+':'+(prop||(target.hasAttribute('data-background')?'background':'name'));if(inputSession!==inputKey){checkpoint();inputSession=inputKey;}
    if(target.hasAttribute('data-document-name'))doc.name=target.value.slice(0,150)||'Мой журнал';
    else if(target.hasAttribute('data-background'))page().background=target.value;
    else if(e&&prop){const ranges={letterSpacing:[-5,20],size:[1,1200],lineHeight:[.8,2],rotation:[-180,180],opacity:[.1,1],x:[Math.max(-M.W,-e.w+MIN_VISIBLE),M.W-MIN_VISIBLE],y:[Math.max(-M.H,-e.h+MIN_VISIBLE),M.H-MIN_VISIBLE],w:[24,Math.min(M.W*2,Math.max(24,M.W-e.x+MIN_VISIBLE))],h:[24,Math.min(M.H*2,Math.max(24,M.H-e.y+MIN_VISIBLE))],posX:[0,100],posY:[0,100]};if(ranges[prop]){if(target.value==='')return;const val=Number(target.value);if(!Number.isFinite(val))return;e[prop]=Math.max(ranges[prop][0],Math.min(ranges[prop][1],val));}else e[prop]=target.value;}
    if(e?.type==='text'){if(prop==='size')e.autoFit=false;else if(e.autoFit||prop==='w'||prop==='h')fitTextToFrame(e);}
    paper();checkOverflow();thumbnails();schedule();
  }
  function beginPointer(ev){if(ev.target.closest('.ed-gesture-layer'))return;if(ev.button!==0&&ev.pointerType==='mouse')return;const node=ev.target.closest('[data-element]');if(!node){selected=null;inputSession=null;closePanel();render();return;}const e=page().elements.find(e=>e.id===node.dataset.element);if(!e)return;if(e.locked){pick(e.id);return;}const resize=ev.target.closest('[data-resize]')?.dataset.resize||null;if(!resize)pick(e.id);const start={x:e.x,y:e.y,w:e.w,h:e.h,rotation:e.rotation};gesture={id:e.id,pointer:ev.pointerId,start,scale,clientX:ev.clientX,clientY:ev.clientY,resize,changed:false};$('.ed-workspace').setPointerCapture(ev.pointerId);ev.preventDefault();}
  function movePointer(ev){if(!gesture||gesture.pointer!==ev.pointerId||gesture.kind)return;applyCanvasDelta(gesture,element(),ev.clientX,ev.clientY);ev.preventDefault();}
  function endPointer(){if(!gesture||gesture.kind)return;const changed=gesture.changed;clearGuides();gesture=null;if(changed){render();schedule();}}

  async function loadPhoto(file,target){if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Выберите JPG, PNG или WebP. HEIC сначала сохраните как JPG.');return;}if(file.size>20*1024*1024){toast('Файл больше 20 МБ. Выберите фотографию поменьше.');return;}toast('Подготавливаем фотографию…');try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=data;});if(img.width*img.height>80000000)throw Error('Слишком большое разрешение');const url=data;if(!active||target.session!==session)return;const p=doc.pages.find(p=>p.id===target.page);if(!p)return toast('Страница уже удалена');if(!target.element&&p.elements.length>=100)return toast('На странице уже 100 элементов');checkpoint();const asset=M.id();if(Object.values(doc.assets).reduce((n,v)=>n+v.length,0)+url.length>90000000)throw Error('Проект превышает 90 МБ');doc.assets[asset]=url;let e=p.elements.find(e=>e.id===target.element);if(!e){e=target.background?M.photo(0,0,M.W,M.H):M.photo(70,210,460,400);target.background?p.elements.unshift(e):p.elements.push(e);}e.asset=asset;index=doc.pages.indexOf(p);selected=e.id;render();openPanel();schedule();toast('Фотография добавлена');}catch(err){toast(err.message||'Не удалось открыть фотографию. Попробуйте другой JPG или PNG.');}}
  function compact(){const d=M.clone(doc),used=new Set(d.pages.flatMap(p=>p.elements.filter(e=>e.type==='photo'&&e.asset).map(e=>e.asset)));for(const key of Object.keys(d.assets))if(!used.has(key))delete d.assets[key];return d;}
  function download(){const blob=new Blob([JSON.stringify(compact())],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(doc.name.replace(/[^a-zа-яё0-9 _-]/gi,'').trim()||'Мой журнал')+'.embrace.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('Файл журнала подготовлен для скачивания');}
  function saveMenu(){save().catch(()=>{});dialog(`<button class="ed-close" data-close aria-label="Закрыть сохранение">×</button><h2>Сохраните свою историю</h2><p>Черновик сохраняется автоматически в этом браузере. Скачайте файл с фотографиями, чтобы перенести журнал на другое устройство или сохранить резервную копию.</p><button class="ed-primary" data-download>Скачать файл журнала</button><button data-import>Открыть файл журнала</button><button data-my-projects>Мои журналы</button><button data-fresh-template>Восстановить исходный макет</button><p>Очистка данных браузера удаляет местные черновики. Файл журнала можно открыть здесь в любое время.</p>`);$('[data-my-projects]').onclick=()=>myProjects().catch(()=>toast('Не удалось открыть список черновиков'));$('[data-download]').onclick=download;$('[data-import]').onclick=()=>{$('#ed-import-file').value='';$('#ed-import-file').click();};$('[data-fresh-template]').onclick=freshTemplate;}
  async function importFile(file){if(!file)return;if(file.size>100000000)return toast('Файл слишком большой');try{const value=M.validate(JSON.parse(await file.text()));confirmAction('Открыть журнал?',`Текущий черновик будет заменён журналом «${esc(value.name)}». Сначала скачайте текущий журнал, если хотите сохранить обе версии.`,()=>{checkpoint();doc=value;index=0;selected=null;history=[];future=[];render();schedule();toast('Журнал открыт');});}catch{toast('Не удалось открыть файл. Нужен файл .embrace.json, сохранённый в этом редакторе.');}}
  function preview(){const placeholders=doc.pages.reduce((n,p)=>n+p.elements.filter(e=>e.type==='photo'&&!e.asset).length,0);dialog(`<button class="ed-close" data-close aria-label="Закрыть просмотр">×</button><h2>Ваш журнал · ${doc.pages.length} стр.</h2><p>${placeholders?`Ещё ${placeholders} мест для фотографий. Пустые рамки не печатаются.`:'Все фотографии на месте.'}</p>${authorMode?`<p>Готовые JPEG: А4, максимальное качество. Все страницы — одним ZIP-архивом, текущая — отдельным изображением. Разметка проколов и рамки редактора не сохраняются.</p><label>Разрешение<select data-jpeg-dpi><option value="300">300 ppi · 2480 × 3508 · телефон и ПК</option><option value="600">600 ppi · 4961 × 7016 · большой файл</option></select></label><label>Страницы<select data-jpeg-scope><option value="all">Весь журнал</option><option value="current">Текущая страница (${index+1})</option></select></label><p>JPEG использует сжатие. 600 ppi требует больше памяти и не улучшает маленькие исходные фото. На телефоне архив сохраняется в «Файлы».</p><button class="ed-primary" data-export-jpeg>Скачать JPEG</button>`:`<button class="ed-primary" data-print>Печать контрольной копии</button><button data-export-pdf>Скачать PDF для проверки</button>`}<p data-pdf-progress role="status"></p><div class="ed-preview">${doc.pages.map((p,i)=>`<div class="ed-preview-page" aria-label="Просмотр страницы ${i+1}"><div class="ed-preview-inner" style="background:${p.background}">${elementsHTML(p)}</div></div>`).join('')}</div>`);fitPreview();if(authorMode){$('[data-export-jpeg]').onclick=exportJpeg;return;}$('[data-print]').onclick=print;$('[data-export-pdf]').onclick=async()=>{const b=$('[data-export-pdf]'),s=$('[data-pdf-progress]');b.disabled=true;try{const file=await generatePdf((n,total)=>s.textContent='Подготовка PDF: '+n+' / '+total);const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.textContent='PDF готов — скачать';s.replaceChildren(a);a.click();setTimeout(()=>URL.revokeObjectURL(url),300000);}catch(e){s.textContent='Не удалось создать PDF: '+e.message;}finally{b.disabled=false;}};}
  async function print(approved=false){if(approved!==true&&bindingPages().length)return confirmAction('Проверьте область пружинки',`На страницах ${bindingPages().map(n=>n+' ('+sideLabel(n-1)+')').join(', ')} есть элементы в зоне проколов. Можно вернуться к редактированию или продолжить печать.`,()=>print(true));await document.fonts.ready;$('.ed-print-root')?.remove();const root=document.createElement('div');root.className='ed-print-root';root.innerHTML=doc.pages.map(p=>`<section class="ed-print-page"><div class="ed-print-inner" style="background:${p.background}">${elementsHTML(p)}</div></section>`).join('');document.body.append(root);await Promise.all([...root.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));window.print();}

  let pdfLibraries;
  function loadPdfLibraries(){return pdfLibraries||(pdfLibraries=Promise.all([window.EmbraceWP.assets+'vendor/jspdf.umd.min.js',window.EmbraceWP.assets+'vendor/html2canvas.min.js'].map(src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('library'));};document.head.append(s);}))).catch(e=>{pdfLibraries=null;throw e;}));}
  let imageExportBusy=false;
  async function exportJpeg(){
    if(imageExportBusy)return;
    const button=$('[data-export-jpeg]'),status=$('[data-pdf-progress]'),dpi=Number($('[data-jpeg-dpi]').value),onlyCurrent=$('[data-jpeg-scope]').value==='current';
    const controls=[button,$('[data-jpeg-dpi]'),$('[data-jpeg-scope]')];imageExportBusy=true;controls.forEach(b=>b.disabled=true);
    try{
      const file=await generatePdf((n,total)=>{if(!status.isConnected)throw Error('Экспорт отменён');status.textContent=`Готовим JPEG: ${n} / ${total}`;},{dpi,onlyCurrent});
      if(!status.isConnected)return;
      const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.textContent='Готово — скачать '+(onlyCurrent?'JPEG':'ZIP с JPEG');status.replaceChildren(a);a.click();setTimeout(()=>URL.revokeObjectURL(url),600000);
    }catch(e){if(status.isConnected)status.textContent='Не удалось подготовить JPEG: '+e.message+'. Для большого журнала попробуйте 300 ppi или одну страницу.';}
    finally{imageExportBusy=false;controls.forEach(b=>b.disabled=false);}
  }
  async function generatePdf(progress,jpeg=null){
    // Freeze page markup before asynchronous work; the export excludes editor guides and empty photos.
    const pages=doc.pages.map((p,i)=>({number:i+1,background:p.background,html:elementsHTML(p)})).filter(p=>!jpeg?.onlyCurrent||p.number===index+1);
    const width=jpeg?Math.round(210/25.4*jpeg.dpi):2480,height=jpeg?Math.round(297/25.4*jpeg.dpi):Math.round(M.H*width/M.W),entries=[];
    const filename=`embrace-${doc.theme}-${pages.length}pages.pdf`;
    await loadPdfLibraries();await document.fonts.ready;
    const pdf=jpeg?null:new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
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
        const frame=document.createElement('canvas');frame.width=Math.round(w*width/M.W);frame.height=Math.round(h*height/M.H);
        const ctx=frame.getContext('2d');ctx.scale(frame.width/w,frame.height/h);ctx.filter=img.style.filter||'none';if(img.style.transform==='scaleX(-1)'){ctx.translate(w,0);ctx.scale(-1,1);}ctx.drawImage(img,rect.x,rect.y,rect.w,rect.h);
        img.src=frame.toDataURL('image/png');img.style.filter='none';img.style.transform='none';img.style.objectFit='fill';img.style.objectPosition='50% 50%';await img.decode();frame.width=frame.height=1;
      }
      const target=document.createElement('canvas');target.width=width;target.height=height;
      const canvas=await window.html2canvas(host.firstElementChild,{canvas:target,scale:width/M.W,width:M.W,height:M.H,backgroundColor:pages[i].background,logging:false,scrollX:0,scrollY:0});
      try{if(jpeg){
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Недостаточно памяти для страницы')),'image/jpeg',1));
        entries.push({name:`page-${String(pages[i].number).padStart(3,'0')}.jpg`,data:window.EmbraceExportFiles.jpegDensity(new Uint8Array(await blob.arrayBuffer()),jpeg.dpi)});
      }else{if(i)pdf.addPage('a4','portrait');pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',0,0,210,297);}}
      finally{canvas.width=canvas.height=1;}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(jpeg){const base=(doc.name.replace(/[^a-zа-яё0-9 _-]/gi,'').trim()||'Журнал')+'-A4-'+jpeg.dpi+'ppi';return jpeg.onlyCurrent?new File([entries[0].data],base+'-'+entries[0].name,{type:'image/jpeg'}):new File([window.EmbraceExportFiles.zip(entries)],base+'.zip',{type:'application/zip'});}
    return new File([pdf.output('blob')],filename,{type:'application/pdf'});
    }finally{host.remove();}
  }
  const money=n=>Number(n).toLocaleString('ru-RU')+' ₽';
  const total=()=>Number(window.EmbraceWP.settings.base_price)+Math.max(0,doc.pages.length-20)*Number(window.EmbraceWP.settings.extra_price);
  function order(){
    if(![20,24,28,32,36].includes(doc.pages.length))return dialog(`<h2>Проверьте количество страниц</h2><p>Для заказа доступны 20, 24, 28, 32 или 36 страниц. Сейчас ${doc.pages.length}. Добавьте или удалите страницы, сохранив своё оформление.</p><button data-close>Вернуться к журналу</button>`);
    save().catch(()=>{});const empty=doc.pages.reduce((n,p)=>n+p.elements.filter(e=>e.type==='photo'&&!e.asset&&!e.hidden).length,0);
    const c=window.EmbraceWP,summary=`Журнал «${doc.name}», А4, ${doc.pages.length} страниц. Стоимость: ${money(total())}.`;
    dialog(`<button data-close class="ed-close" aria-label="Закрыть заказ">×</button><h2>Ваш журнал</h2><p>${esc(summary)}</p>${empty?`<p class="ed-binding-summary">Не заполнено мест для фото: ${empty}. Проверьте журнал перед отправкой.</p>`:''}<button data-download-project>Скачать редактируемый проект</button><label>Детали заказа<textarea readonly rows="3">${esc(summary)}</textarea></label><div class="ej-messengers">${[['telegram','Telegram'],['max','MAX'],['whatsapp','WhatsApp']].filter(([k])=>c.settings[k]).map(([k,n])=>`<a href="${esc(c.settings[k])}" target="_blank" rel="noopener noreferrer">${n} ↗</a>`).join('')}</div><p>Скачайте файл, откройте наш чат и прикрепите его. Заказ и фотографии не отправляются автоматически.</p>`);
    $('[data-download-project]').onclick=download;
  }
  function layers(){
    dialog(`<button class="ed-close" data-close aria-label="Закрыть слои">×</button><h2>Слои страницы</h2><div class="ej-layers">${[...page().elements].reverse().map(e=>`<div><button data-layer="${esc(e.id)}">${esc(e.type==='text'?e.text.slice(0,45)||'Текст':'Фотография')}</button><button data-lock="${esc(e.id)}">${e.locked?'Разблокировать':'Закрепить'}</button><button data-hide="${esc(e.id)}">${e.hidden?'Показать':'Скрыть'}</button></div>`).join('')}</div>`);
    $('#ed-dialog').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.hasAttribute('data-close'))return closeDialog();const id=b.dataset.layer||b.dataset.lock||b.dataset.hide,e=page().elements.find(e=>e.id===id);if(!e)return;
      if(b.dataset.layer){selected=id;closeDialog();render();openPanel();}else{change(()=>{if(b.dataset.lock)e.locked=!e.locked;else e.hidden=!e.hidden;});layers();}
    };
  }

  function keydown(ev){if(!active||$('#ed-dialog')?.open||document.querySelector('.order-dialog[open]'))return;const typing=/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)||ev.target.isContentEditable;if(ev.key==='Escape'){closePanel();selected=null;render();return;}if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='s'){ev.preventDefault();saveMenu();return;}if(typing)return;if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?redo():undo();return;}if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='y'){ev.preventDefault();redo();return;}if(ev.key==='Delete'||ev.key==='Backspace'){if(selected){ev.preventDefault();action('delete');}return;}if(ev.key==='Enter'&&selected){openPanel();return;}if(element()?.locked)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[ev.key];if(delta&&element()){ev.preventDefault();const e=element();change(()=>{const next=clampDrag(e,e.x+delta[0]*(ev.shiftKey?10:1),e.y+delta[1]*(ev.shiftKey?10:1));e.x=next.x;e.y=next.y;});}}
  function shell(){const themeName=doc.name;$('#app').innerHTML=`<section class="editor" aria-label="Конструктор журнала"><div class="ej-brand"><a href="${window.EmbraceWP.home}">Embrace<em>the moment</em></a><span>${authorMode?"Макет владельца":"Ваш личный журнал"}</span></div><header class="ed-top"><a href="#/template/${doc.theme}" aria-label="Вернуться к шаблону">${toolIcon('back','')}</a><div class="ed-name"><strong>${esc(themeName)}</strong><span class="ed-status" role="status">Черновик на этом устройстве</span></div><button data-action="preview" aria-label="Предпросмотр журнала">Просмотр</button><button data-action="save">Сохранить</button><button class="ed-order" data-action="order">Заказать</button></header><div class="ed-layout"><aside class="ed-pages" aria-label="Страницы журнала"></aside><div class="ed-main"><div class="ed-actions"><button data-action="text">${toolIcon('text','')}<span>Текст</span></button><button data-action="photo">${toolIcon('photo','')}<span>Фото</span></button><button data-action="layers">${toolIcon('layers','')}<span>Слои</span></button><button data-action="zoom-out" aria-label="Уменьшить масштаб">${toolIcon('zoom-out','')}</button><button data-action="zoom-reset" aria-label="Вписать страницу">100%</button><button data-action="zoom-in" aria-label="Увеличить масштаб">${toolIcon('zoom-in','')}</button><button class="ed-mobile-edit" data-action="edit">Страница</button><button class="ed-desktop-page" data-action="page">${toolIcon('page','')}<span>Страница</span></button><button class="ed-undo" data-action="undo" aria-label="Отменить действие">${toolIcon('undo','')}</button><button class="ed-redo" data-action="redo" aria-label="Повторить действие">${toolIcon('redo','')}</button></div><div class="ed-context-toolbar" aria-label="Инструменты выбранного элемента"></div><div class="ej-floating"><button data-action="undo" aria-label="Отменить действие">${toolIcon('undo','')}</button><button data-action="redo" aria-label="Повторить действие">${toolIcon('redo','')}</button><button data-action="fullscreen" aria-label="Развернуть рабочую область">${toolIcon('fullscreen','')}</button></div><div class="ed-binding-notice" role="status" aria-live="polite"><div><strong></strong><span class="ej-binding-message"></span></div><button data-action="binding-info" aria-label="Подробнее о зоне проколов">ⓘ</button></div><div class="ed-workspace"><div class="ed-paper-wrap"><div class="ed-paper" aria-label="Редактируемая страница"></div></div></div><div class="ed-selection-layer"></div><div class="ed-gesture-layer" aria-hidden="true"><div class="ed-gesture-spacer"></div></div><p class="ed-hint">Выберите элемент · Перетащите для перемещения · Потяните за маркер для изменения размера</p><div class="ed-navigation"><button class="ed-prev" aria-label="Предыдущая страница">${toolIcon('back','')}</button><span class="ed-page-number"></span><button class="ed-next" aria-label="Следующая страница">${toolIcon('next','')}</button><button class="ed-view-toggle" data-action="view-toggle" aria-label="Увеличить страницу по ширине">Крупнее</button></div></div><aside class="ed-panel" aria-label="Инструменты редактирования"></aside></div><input class="ed-file" id="ed-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><input class="ed-file" id="ed-import-file" type="file" accept=".json,.embrace.json,application/json"></section>`;
    const root=$('.editor');root.addEventListener('click',ev=>{const actionButton=ev.target.closest('[data-action]');if(actionButton&&!actionButton.disabled)return action(actionButton.dataset.action);const thumb=ev.target.closest('[data-page]');if(thumb)return jump(Number(thumb.dataset.page));const toggle=ev.target.closest('[data-toggle]');if(toggle&&element()&&!element().locked)return change(()=>element()[toggle.dataset.toggle]=!element()[toggle.dataset.toggle]);const align=ev.target.closest('[data-align]');if(align&&element()&&!element().locked)return change(()=>element().align=align.dataset.align);const layout=ev.target.closest('[data-layout]');if(layout)return confirmAction('Заменить макет страницы?','Тексты и фотографии на этой странице заменятся выбранной композицией. Это можно отменить.',()=>change(()=>{doc.pages[index]=M.page(doc.theme,index,layout.dataset.layout);selected=null;}));});
    root.addEventListener('input',ev=>{if(ev.target.matches('[data-prop],[data-background],[data-document-name]'))editedInput(ev.target);});root.addEventListener('change',ev=>{if(ev.target.matches('select[data-prop]'))editedInput(ev.target);if(ev.target.matches('input[type=number][data-prop]')){inputSession=null;panel();}});
    const gestureLayer=$('.ed-gesture-layer');
    if(gestureLayer){gestureLayer.addEventListener('scroll',()=>{if(gestureLayer.scrollTop<200||gestureLayer.scrollTop>gestureLayer.scrollHeight-gestureLayer.clientHeight-200)centerGestureLayer();},{passive:true});centerGestureLayer();gestureLayer.addEventListener('touchstart',beginCanvasTouch,{passive:true,capture:true});gestureLayer.addEventListener('touchmove',moveCanvasTouch,{passive:true,capture:true});gestureLayer.addEventListener('touchend',finishCanvasTouch,{passive:true,capture:true});gestureLayer.addEventListener('touchcancel',finishCanvasTouch,{passive:true,capture:true});}
    $('.ed-selection-layer').addEventListener('pointerdown',beginPointer);$('.ed-workspace').addEventListener('scroll',updateSelectionControls,{passive:true});
    $('.ed-prev').onclick=()=>jump(index-1);$('.ed-next').onclick=()=>jump(index+1);const clearWorkspaceSelection=ev=>{if(ev.target.closest('[data-element]'))return;const panelOpen=$('.ed-panel')?.classList.contains('open');if(selected||panelOpen){selected=null;inputSession=null;closePanel();render();}};$('.ed-workspace').addEventListener('pointerdown',clearWorkspaceSelection);$('.ed-workspace').addEventListener('pointerdown',beginPointer);$('.ed-workspace').addEventListener('pointermove',movePointer);$('.ed-workspace').addEventListener('pointerup',endPointer);$('.ed-workspace').addEventListener('pointercancel',endPointer);$('.ed-paper').addEventListener('dblclick',ev=>{if(ev.target.closest('[data-element]'))openPanel();});$('.ed-paper').addEventListener('focusin',ev=>{const el=ev.target.closest('[data-element]');if(el&&selected!==el.dataset.element){selected=el.dataset.element;panel();}});
    $('#ed-photo-file').onchange=ev=>loadPhoto(ev.target.files[0],uploadTarget);$('#ed-import-file').onchange=ev=>importFile(ev.target.files[0]);observer=new ResizeObserver(fit);observer.observe($('.ed-workspace'));render();viewportLayout();
  }
  async function mount(theme,count){authorMode=false;const token=++session;active=true;document.body.classList.add('editing');key='ej-'+window.EmbraceWP.id+'-'+count+'-'+(new URLSearchParams(location.search).get('project')||'main');index=0;selected=null;history=[];future=[];doc=null;$('#app').innerHTML='<div class="editor"><div class="ed-top">Открываем ваш журнал…</div></div>';let saved;try{await saveChain.catch(()=>{});saved=await read(key);}catch{}if(token!==session||!active)return;try{doc=saved?M.validate(saved):M.create(theme,count);}catch{doc=M.create(theme,count);toast('Не удалось восстановить черновик. Откройте сохранённый файл журнала.');}document.title=doc.name+' — редактор Embrace';shell();if(saved){status('Сохранено на этом устройстве');toast('Ваш черновик восстановлен');if(!doc.templateRevision){dialog('<h2>Готовые страницы уже здесь</h2><p>Для этого журнала доступен новый макет на 20 страниц с местами для фото и личными текстами. Ваш сохранённый черновик восстановлен.</p><button class="ed-primary" data-use-template>Открыть готовый макет</button><button data-close>Продолжить мой черновик</button>');$('[data-use-template]').onclick=freshTemplate;}}else save().catch(()=>{});}
  function leave(){gesture=null;if(active&&doc)save().catch(()=>{});active=false;session++;observer?.disconnect();closeDialog();$('.ed-print-root')?.remove();document.body.classList.remove('editing');}
  function preventInterfaceSelection(ev){
    if(!active)return;
    const target=ev.target?.nodeType===3?ev.target.parentElement:ev.target;
    if(!target?.closest?.('.editor,.ed-dialog'))return;
    if(target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]'))return;
    ev.preventDefault();
  }
  document.addEventListener('selectstart',preventInterfaceSelection);
  document.addEventListener('contextmenu',preventInterfaceSelection);
  document.addEventListener('keydown',keydown);window.addEventListener('beforeunload',ev=>{if(active&&dirty){save().catch(()=>{});ev.preventDefault();ev.returnValue='';}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&doc)save().catch(()=>{});});window.addEventListener('afterprint',()=>$('.ed-print-root')?.remove());
  window.MagazineEditor={mount,leave,getDocument:()=>compact(),async author(value){leave();authorMode=true;active=true;session++;key='author-'+value.theme;doc=M.validate(value);index=0;selected=null;history=[];future=[];dirty=false;document.body.classList.add('editing');shell();status('Шаблон WordPress');const top=$('.ed-top');top.querySelector('a').href=window.EmbraceWP.admin;const backup=top.querySelector('[data-action="save"]');backup.removeAttribute('data-action');backup.textContent='Скачать копию';backup.onclick=download;const b=top.querySelector('.ed-order');b.textContent='Сохранить шаблон';b.removeAttribute('data-action');b.onclick=async()=>{b.disabled=true;const rev=revision;try{await window.saveEmbraceTemplate(compact());toast('Шаблон сохранён в WordPress');if(rev===revision){dirty=false;status('Шаблон сохранён в WordPress');}}catch(e){toast(e.message);}finally{b.disabled=false;}};const p=document.createElement('button');p.dataset.action='placeholder';p.textContent='＋ Место для фото';$('.ed-actions').append(p);}};
})();
