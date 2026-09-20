(function(){
  'use strict';
  const channels=[
    {name:'MAX',url:'https://max.ru/u/f9LHodD0cOLXYLHtRu592LSMEA1EMB2cJrD4nZYo7YX8wPMzzqN-03yBNow'},
    {name:'Telegram',url:'https://t.me/Asya_65r'},
    {name:'WhatsApp',url:'https://wa.me/qr/H43L7V4ZOVDDO1'}
  ];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>n.toLocaleString('ru-RU')+' ₽';
  const price=n=>3000+Math.max(0,n-20)*100;
  let modal,previous,job=0,downloadUrl;
  function close(){job++;if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}modal?.close();modal?.remove();modal=null;previous?.focus();}
  function show(title,body){
    if(!modal){previous=document.activeElement;modal=document.createElement('dialog');modal.className='order-dialog';modal.setAttribute('aria-labelledby','order-title');document.body.append(modal);modal.addEventListener('cancel',ev=>{ev.preventDefault();close();});modal.addEventListener('click',ev=>{if(ev.target===modal)close();});}
    modal.innerHTML=`<button class="order-close" aria-label="Закрыть окно">×</button><span class="eyebrow">Embrace the moment</span><h2 id="order-title">${title}</h2>${body}`;
    modal.querySelector('.order-close').onclick=close;if(!modal.open)modal.showModal();
  }
  function messengers(file,summary=''){
    if(file)downloadUrl=URL.createObjectURL(file);
    show(file?'Отправьте макет':'Куда вам удобно написать?',`<p>${file?'PDF готов. Откройте наш профиль, затем прикрепите файл в чате. Через «Поделиться PDF» выберите мессенджер и наш контакт самостоятельно.':'Выберите мессенджер — откроется наш профиль для заказа или уточнения деталей.'}</p>${summary?`<p class="order-summary">${esc(summary)}</p>`:''}<div class="order-channels">${channels.map(c=>`<a href="${c.url}" target="_blank" rel="noopener noreferrer"><span>${c.name}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></a>`).join('')}</div>${file?'<div class="order-file-actions"><button class="order-primary" data-share>Поделиться PDF</button><a class="order-secondary" data-pdf>Скачать PDF</a><a class="order-secondary" data-check target="_blank" rel="noopener">Проверить PDF</a></div><p class="order-status" role="status">Файл ещё не отправлен. Подтвердите отправку в выбранном мессенджере.</p>':''}<p class="order-legal-note">До отправки фотографии и макет обрабатываются на вашем устройстве. После перехода или отправки через мессенджер применяются также правила выбранного сервиса. <a href="./privacy.html" target="_blank" rel="noopener">Подробнее</a>.</p>`);
    if(!file)return;
    const a=modal.querySelector('[data-pdf]');a.href=downloadUrl;a.download=file.name;modal.querySelector('[data-check]').href=downloadUrl;
    const share=modal.querySelector('[data-share]');const status=modal.querySelector('.order-status');
    if(!navigator.canShare?.({files:[file]})){share.hidden=true;status.textContent='Скачайте PDF, откройте наш профиль и прикрепите файл как документ.';}
    share.onclick=async()=>{try{await navigator.share({files:[file],title:'Макет журнала Embrace',text:summary});status.textContent='Файл передан выбранному приложению. Проверьте получателя и отправку в чате.';}catch(e){status.textContent=e.name==='AbortError'?'Отправка отменена. PDF можно скачать или попробовать снова.':'Не удалось открыть отправку. Скачайте PDF и прикрепите его в чате.';}};
  }
  function journal({name,theme,count,warnings,generate}){
    const summary=`Журнал «${name}». Макет: ${theme}. ${count} стр. А4. Сумма: ${money(price(count))}.`;
    show('Ваш заказ',`<dl class="order-details"><div><dt>Макет</dt><dd>${esc(theme)}</dd></div><div><dt>Название</dt><dd>${esc(name)}</dd></div><div><dt>Страниц А4</dt><dd>${count}</dd></div><div><dt>Итого</dt><dd>${money(price(count))}</dd></div></dl><p>20 страниц — 3 000 ₽. Каждая дополнительная страница — 100 ₽.</p>${warnings?`<p class="order-warning">${esc(warnings)}</p><label class="order-confirm"><input type="checkbox" data-review> Я проверил(а) макет и хочу продолжить</label>`:''}<div class="order-legal"><label class="order-confirm"><input type="checkbox" data-terms> <span>Я принимаю <a href="./terms.html" target="_blank" rel="noopener">условия заказа</a>.</span></label><label class="order-confirm"><input type="checkbox" data-consent> <span>Я даю отдельное <a href="./consent.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a>.</span></label></div><button class="order-primary" data-send disabled>Отправить</button><p class="order-status" role="status">Подготовим PDF и предложим выбрать мессенджер.</p>`);
    const button=modal.querySelector('[data-send]'),status=modal.querySelector('.order-status');
    const terms=modal.querySelector('[data-terms]'),consent=modal.querySelector('[data-consent]'),review=modal.querySelector('[data-review]');
    const updateReady=()=>button.disabled=!(terms.checked&&consent.checked&&(!review||review.checked));
    terms.onchange=updateReady;consent.onchange=updateReady;if(review)review.onchange=updateReady;updateReady();
    button.onclick=async()=>{button.disabled=true;const token=++job;status.textContent='Подготовка PDF…';try{const file=await generate((n,total)=>{if(token!==job)throw new Error('cancelled');status.textContent=`Подготовка PDF: ${n} из ${total} страниц…`;});if(token===job)messengers(file,summary);}catch(e){if(token!==job)return;status.textContent='Не удалось создать PDF. Попробуйте ещё раз. Ваш черновик сохранён в редакторе.';button.disabled=false;}};
  }
  document.addEventListener('click',ev=>{const b=ev.target.closest('[data-contact]');if(b){ev.preventDefault();messengers(null,b.dataset.contact);}});
  window.addEventListener('hashchange',close);
  window.EmbraceOrders={journal,contact:()=>messengers(),price};
})();
