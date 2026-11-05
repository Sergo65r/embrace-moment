from pathlib import Path
p=Path('wordpress-plugin/embrace-journal/assets/editor.js')
s=p.read_text(encoding='utf-8')
def change_function(start,end,new):
    global s
    a=s.index('  '+start);b=s.index('  '+end,a)
    s=s[:a]+new+'\n'+s[b:]
s=s.replace("gesture=null,uploadTarget", "gesture=null,zoomFactor=1,uploadTarget")
s=s.replace("indexedDB.open('embrace-journals',1)","indexedDB.open('embrace-studio-projects',1)")
s=s.replace("key=theme+'-'+count", "key='ej-'+window.EmbraceWP.id+'-'+count+'-'+(new URLSearchParams(location.search).get('project')||'main')")
s=s.replace("p.elements.map(e=>", "p.elements.filter(e=>!e.hidden).map(e=>")
s=s.replace("font-family:${fonts[e.font]};", "font-family:${fonts[e.font]};letter-spacing:${e.letterSpacing||0}px;text-decoration:${[e.underline?'underline':'',e.strike?'line-through':''].join(' ')};")
s=s.replace("object-fit:${e.fit};", "filter:${({none:'none',grayscale:'grayscale(1)',sepia:'sepia(1)',warm:'sepia(.25) saturate(1.1)'})[e.filter||'none']};transform:${e.flipX?'scaleX(-1)':'none'};object-fit:${e.fit};")
s=s.replace("${doc.assets[e.asset]}","${esc(doc.assets[e.asset])}")
s=s.replace("doc.pages.length>=60","doc.pages.length>=36")
s=s.replace("if(ev.pointerType==='touch'&&matchMedia('(max-width:700px)').matches)return;","")
s=s.replace("const resize=!!ev.target.closest('[data-resize]');pick(e.id);", "if(e.locked){pick(e.id);return;}const resize=!!ev.target.closest('[data-resize]');pick(e.id);")
s=s.replace("if(ev.key==='Enter'&&selected){openPanel();return;}","if(ev.key==='Enter'&&selected){openPanel();return;}if(element()?.locked)return;")
# Text resizing must not silently shrink the user's chosen type size.
a=s.index("if(e.type==='text'&&g.start.size){",s.index('  function movePointer'))
b=s.index('clearGuides();',a)
s=s[:a]+s[b:]
a=s.index("if(g.resize&&e.type==='text'){",s.index('  function movePointer'))
b=s.index('updateBindingWarning();',a)
s=s[:a]+'}'+s[b:]
change_function('function fit(){','function viewportLayout()',r'''  function fit(){
    fitPreview();const area=$('.ed-workspace'),wrap=$('.ed-paper-wrap');if(!area||!wrap)return;
    const cs=getComputedStyle(area),aw=area.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ah=area.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    scale=Math.max(.12,Math.min(1,aw/(M.W+24),ah/(M.H+24)))*zoomFactor;
    wrap.style.width=M.W*scale+'px';wrap.style.height=M.H*scale+'px';$('.ed-paper').style.transform=`scale(${scale})`;
    area.classList.toggle('ed-zoomed',zoomFactor>1);const z=$('[data-action="zoom-reset"]');if(z)z.textContent=Math.round(zoomFactor*100)+'%';
  }
''')
change_function('function bindingPages(){','function freshTemplate()',r'''  function bindingPages(){return [];}
  function bindingSummary(){return '<p class="ed-binding-summary">А4 · PDF для проверки. Вылеты и отступ под пружину пока не согласованы.</p>';}
  function updateBindingWarning(){const hint=$('.ed-hint');if(hint)hint.textContent='А4 · Поля печати уточняются · '+doc.pages.length+' стр. · '+money(total());}
''')
s=s.replace('width:${M.BINDING_X}px','width:0px')
change_function('function freshTemplate(){','function field(',r'''  function freshTemplate(){confirmAction('Восстановить исходный макет?','Ваше текущее оформление заменится макетом владельца. Перед этим можно скачать копию. Действие можно отменить.',()=>change(()=>{const base=M.create(doc.theme,Math.max(20,doc.pages.length));doc.pages=base.pages;Object.assign(doc.assets,base.assets);index=0;selected=null;closePanel();}));}
''')
# Extend actual controls; all properties survive import and owner save validation.
s=s.replace("else{if(e.type==='text'){", "else{if(e.type==='text'){")
s=s.replace("${number('Интервал','lineHeight',e.lineHeight,.8,2,.05)}", "${number('Межстрочный','lineHeight',e.lineHeight,.8,2,.05)}${number('Межбуквенный','letterSpacing',e.letterSpacing||0,-5,20,.1)}")
s=s.replace("<div class=\"ed-overflow\" hidden>","<div class=\"ed-toggle-row\"><button data-toggle=\"underline\" aria-pressed=\"${!!e.underline}\"><u>Подчеркнуть</u></button><button data-toggle=\"strike\" aria-pressed=\"${!!e.strike}\"><s>Зачеркнуть</s></button></div><div class=\"ed-overflow\" hidden>")
s=s.replace("${field('Кадр по горизонтали'", "${field('Фильтр',`<select data-prop=\"filter\">${[['none','Без фильтра'],['grayscale','Чёрно-белый'],['sepia','Сепия'],['warm','Тёплый']].map(([v,n])=>`<option value=\"${v}\" ${(e.filter||'none')===v?'selected':''}>${n}</option>`).join('')}</select>`)}<button data-toggle=\"flipX\" aria-pressed=\"${!!e.flipX}\">Отразить по горизонтали</button>${field('Кадр по горизонтали'")
s=s.replace("case 'placeholder':", "case 'layers':return layers();case 'zoom-in':zoomFactor=Math.min(3,zoomFactor+.25);return fit();case 'zoom-out':zoomFactor=Math.max(.5,zoomFactor-.25);return fit();case 'zoom-reset':zoomFactor=1;return fit();case 'placeholder':")
s=s.replace("case 'page-before':if(index===0)return;", "case 'page-before':if(index<=1)return toast('Обложка остаётся первой страницей');")
s=s.replace("case 'page-after':if(index===doc.pages.length-1)return;", "case 'page-after':if(index===0)return toast('Обложка остаётся первой страницей');if(index===doc.pages.length-1)return;")
s=s.replace("case 'page-delete':if(doc.pages.length<=1)return;", "case 'page-delete':if(index===0)return toast('Обложку можно изменить, но нельзя удалить');if(doc.pages.length<=1)return;")
# Keep original image bytes, alpha and resolution. Reject oversized decoded dimensions explicitly.
a=s.index('const ratio=Math.min(1,4000/')
b=s.index('if(!active||target.session',a)
s=s[:a]+'const url=data;'+s[b:]
s=s.replace("const asset=M.id();doc.assets[asset]=url;", "const asset=M.id();if(Object.values(doc.assets).reduce((n,v)=>n+v.length,0)+url.length>90000000)throw Error('Проект превышает 90 МБ');doc.assets[asset]=url;")
s=s.replace("toast('Не удалось открыть фотографию. Попробуйте другой JPG или PNG.');", "toast(err.message||'Не удалось открыть фотографию. Попробуйте другой JPG или PNG.');")
s=s.replace("['./vendor/jspdf.umd.min.js','./vendor/html2canvas.min.js']", "[window.EmbraceWP.assets+'vendor/jspdf.umd.min.js',window.EmbraceWP.assets+'vendor/html2canvas.min.js']")
s=s.replace('Печать / сохранить PDF','Печать контрольной копии').replace('Скачать PDF файлом','Скачать PDF для проверки')
s=s.replace("'./privacy.html'","window.EmbraceWP.home+'privacy/'")
change_function('function order(){','function keydown(',r'''  const money=n=>Number(n).toLocaleString('ru-RU')+' ₽';
  const total=()=>Number(window.EmbraceWP.settings.base_price)+Math.max(0,doc.pages.length-20)*Number(window.EmbraceWP.settings.extra_price);
  function order(){
    if(![20,24,28,32,36].includes(doc.pages.length))return dialog(`<h2>Проверьте количество страниц</h2><p>Для заказа доступны 20, 24, 28, 32 или 36 страниц. Сейчас ${doc.pages.length}. Добавьте или удалите страницы, сохранив своё оформление.</p><button data-close>Вернуться к журналу</button>`);
    save().catch(()=>{});const empty=doc.pages.reduce((n,p)=>n+p.elements.filter(e=>e.type==='photo'&&!e.asset&&!e.hidden).length,0);
    const c=window.EmbraceWP,summary=`Журнал «${doc.name}», А4, ${doc.pages.length} страниц. Стоимость: ${money(total())}.`;
    dialog(`<button data-close class="ed-close" aria-label="Закрыть заказ">×</button><h2>Ваш журнал</h2><p>${esc(summary)}</p>${empty?`<p class="ed-binding-summary">Не заполнено мест для фото: ${empty}. Проверьте журнал перед отправкой.</p>`:''}${bindingSummary()}<button data-download-project>Скачать редактируемый проект</button><button data-preview-project>Проверить страницы и PDF</button><label>Детали заказа<textarea readonly rows="3">${esc(summary)}</textarea></label><div class="ej-messengers">${[['telegram','Telegram'],['max','MAX'],['whatsapp','WhatsApp']].filter(([k])=>c.settings[k]).map(([k,n])=>`<a href="${esc(c.settings[k])}" target="_blank" rel="noopener noreferrer">${n} ↗</a>`).join('')}</div><p>Скачайте файл, откройте наш чат и прикрепите его. Заказ и фотографии не отправляются автоматически.</p>`);
    $('[data-download-project]').onclick=download;$('[data-preview-project]').onclick=preview;
  }
  function layers(){
    dialog(`<button class="ed-close" data-close aria-label="Закрыть слои">×</button><h2>Слои страницы</h2><div class="ej-layers">${[...page().elements].reverse().map(e=>`<div><button data-layer="${esc(e.id)}">${esc(e.type==='text'?e.text.slice(0,45)||'Текст':'Фотография')}</button><button data-lock="${esc(e.id)}">${e.locked?'Разблокировать':'Закрепить'}</button><button data-hide="${esc(e.id)}">${e.hidden?'Показать':'Скрыть'}</button></div>`).join('')}</div>`);
    $('#ed-dialog').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;if(b.hasAttribute('data-close'))return closeDialog();const id=b.dataset.layer||b.dataset.lock||b.dataset.hide,e=page().elements.find(e=>e.id===id);if(!e)return;
      if(b.dataset.layer){selected=id;closeDialog();render();openPanel();}else{change(()=>{if(b.dataset.lock)e.locked=!e.locked;else e.hidden=!e.hidden;});layers();}
    };
  }
''')
# A real brand header + page strip, matched to the references without squeezing controls.
s=s.replace('<header class="ed-top">','<div class="ej-brand"><a href="${window.EmbraceWP.home}">Embrace<em>the moment</em></a><span>${authorMode?"Макет владельца":"Ваш личный журнал"}</span></div><header class="ed-top">')
s=s.replace('<button class="ed-mobile-edit"', '<button data-action="layers">Слои</button><button data-action="zoom-out" aria-label="Уменьшить масштаб">−</button><button data-action="zoom-reset" aria-label="Вписать страницу">100%</button><button data-action="zoom-in" aria-label="Увеличить масштаб">＋</button><button class="ed-mobile-edit"')
s=s.replace("rail.scrollLeft=scroll;rail.scrollTop=top;", "rail.insertAdjacentHTML('beforeend','<button class=\"ed-thumb ej-add-page\" data-action=\"page-add\" aria-label=\"Добавить страницу\">＋<small>Добавить<br>страницу</small></button>');rail.scrollLeft=scroll;rail.scrollTop=top;")
s=s.replace("<button data-import>Открыть файл журнала</button>","<button data-import>Открыть файл журнала</button><button data-new-project>Создать отдельный проект</button>")
s=s.replace("$('[data-download]').onclick=download;", "$('[data-new-project]').onclick=()=>{const url=new URL(location.href);url.searchParams.set('project',M.id());location.href=url.href;};$('[data-download]').onclick=download;")
s=s.replace('Начать с готового макета · 20 страниц','Восстановить исходный макет')
# Only numerical inputs convert to numbers, new filter option stays a string.
s=s.replace("['text','font','align','color','fit']", "['text','font','align','color','fit','filter']")
p.write_text(s,encoding='utf-8')
# Validation covers every style-bearing property; arbitrary CSS/URLs cannot enter the renderer.
m=Path('wordpress-plugin/embrace-journal/assets/editor-model.js')
t=m.read_text(encoding='utf-8').replace('d.pages.length>60','d.pages.length>36')
t=t.replace("typeof p.id!=='string'||ids.has(p.id)","typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)||ids.has(p.id)")
t=t.replace("ids.add(e.id);", "ids.add(e.id);for(const k of ['locked','hidden','bold','italic','underline','strike','flipX'])if(e[k]!==undefined&&typeof e[k]!=='boolean')throw Error('Некорректный стиль');if(e.letterSpacing!==undefined&&!finite(e.letterSpacing,-5,20))throw Error('Некорректный интервал');if(e.filter!==undefined&&!['none','grayscale','sepia','warm'].includes(e.filter))throw Error('Некорректный фильтр');")
m.write_text(t,encoding='utf-8')
