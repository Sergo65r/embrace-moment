(() => {
  'use strict';
  const money = n => Number(n).toLocaleString('ru-RU') + ' ₽';
  const order = document.querySelector('.order-dialog');
  const zoom = document.querySelector('.image-dialog');
  let opener;
  function openDialog(dialog, trigger) {
    if (!dialog) return;
    opener = trigger || document.activeElement;
    dialog.showModal();
    dialog.querySelector('.dialog-close')?.focus();
  }
  document.querySelectorAll('.embrace-dialog').forEach(dialog => {
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => opener?.focus());
  });
  function discuss(summary, trigger, journal = false) {
    if (!order) return;
    order.querySelector('h2').textContent = journal ? 'Начнём вашу историю' : 'Обсудим ваш заказ';
    order.querySelector('.order-intro').textContent = journal
      ? 'Онлайн-редактор журнала ещё готовится. Уже сейчас можно обсудить оформление и заказ с нами.'
      : 'Выберите удобный мессенджер. Уточним детали, стоимость и срок изготовления.';
    order.querySelector('.order-summary').hidden = !summary;
    order.querySelector('textarea').value = summary;
    order.querySelector('.copy-status').textContent = '';
    openDialog(order, trigger);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href="#order"]');
    if (!link) return;
    event.preventDefault();
    const card = link.closest('.service-card');
    const title = card?.querySelector('h3')?.textContent?.trim();
    const price = card?.querySelector('.service-price')?.textContent?.trim();
    discuss(title ? `Здравствуйте! Хочу заказать: ${title}. Цена на сайте: ${price || 'уточнить'}.` : '', link);
  });
  order?.querySelector('.copy-order').addEventListener('click', async () => {
    const field = order.querySelector('textarea');
    try {
      await navigator.clipboard.writeText(field.value);
      order.querySelector('.copy-status').textContent = 'Детали скопированы. Вставьте их в чат.';
    } catch {
      field.focus(); field.select();
      order.querySelector('.copy-status').textContent = 'Выделили детали заказа. Скопируйте текст через меню устройства.';
    }
  });
  document.querySelectorAll('.journal-order').forEach(block => {
    const base = Number(block.dataset.base), extra = Number(block.dataset.extra);
    const selected = () => Number(block.querySelector('input:checked')?.value || 20);
    block.addEventListener('change', () => {
      const pages = selected();
      block.querySelector('.journal-total').textContent = money(base + (pages - 20) * extra);
      block.querySelector('.price-note').textContent = pages === 20 ? '20 страниц · базовая стоимость' : `${pages} страниц · с дополнительными страницами`;
      block.querySelector('.quantity-note').textContent = `${pages} страниц, включая обложку. Дополнительная страница — ${money(extra)}, лист (2 страницы) — ${money(extra * 2)}.`;
    });
    block.querySelector('.create-journal')?.addEventListener('click', event => {
      const pages = selected();
      if (block.dataset.editorUrl) {
        const url = new URL(block.dataset.editorUrl, location.origin);
        url.searchParams.set('pages', pages);
        location.href = url.href;
        return;
      }
      discuss(`Здравствуйте! Хочу обсудить журнал «${block.dataset.journal}». ${pages} страниц, формат А4. Стоимость по сайту: ${money(base + (pages - 20) * extra)}.`, event.currentTarget, true);
    });
  });
  document.querySelectorAll('.journal-gallery').forEach(gallery => {
    const figures = [...gallery.querySelectorAll(':scope > figure')];
    if (!figures.length) return;
    const labels = figures.map((figure, index) => figure.querySelector('figcaption')?.textContent || `Пример ${index + 1}`);
    const stage = document.createElement('div'); stage.className = 'gallery-stage'; stage.tabIndex = 0;
    stage.setAttribute('role', 'region'); stage.setAttribute('aria-label', 'Примеры журнала. Используйте стрелки для переключения');
    gallery.prepend(stage); figures.forEach(figure => stage.append(figure));
    const controls = document.createElement('div'); controls.className = 'gallery-tabs'; controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Выберите пример');
    const counter = document.createElement('span'); counter.className = 'gallery-counter'; counter.setAttribute('aria-live','polite');
    const buttons = figures.map((figure, index) => {
      const button = document.createElement('button'); button.type = 'button';
      const img = figure.querySelector('img').cloneNode(); img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.alt = ''; img.loading='lazy';
      const text = document.createElement('span'); text.textContent=labels[index]; button.append(img,text);
      button.addEventListener('click', () => show(index)); controls.append(button); return button;
    });
    let index = 0;
    function show(next) {
      index = (next + figures.length) % figures.length;
      figures.forEach((figure, i) => { figure.hidden = i !== index; });
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      counter.textContent = `${index + 1} / ${figures.length}`;
    }
    function button(label, text, className, action) {
      const element = document.createElement('button'); element.type = 'button'; element.className = className; element.setAttribute('aria-label', label); element.textContent = text; element.addEventListener('click', action); stage.append(element);
    }
    button('Предыдущий пример', '‹', 'gallery-prev', () => show(index - 1));
    button('Следующий пример', '›', 'gallery-next', () => show(index + 1));
    function enlarge(trigger) {
      const source = figures[index].querySelector('img'), target = zoom?.querySelector('img');
      if (!target) return;
      target.src = source.src; target.alt = source.alt; zoom.querySelector('p').textContent = labels[index]; openDialog(zoom,trigger);
    }
    button('Увеличить изображение', '⛶', 'gallery-zoom', event => enlarge(event.currentTarget));
    figures.forEach(figure=>figure.querySelector('img')?.addEventListener('click',()=>enlarge(stage)));
    stage.append(counter); gallery.append(controls);
    stage.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); show(index + (event.key === 'ArrowRight' ? 1 : -1)); }
    });
    let touch;
    stage.addEventListener('touchstart', event => { touch = event.touches[0]; }, {passive:true});
    stage.addEventListener('touchend', event => {
      if (!touch) return;
      const dx=event.changedTouches[0].clientX-touch.clientX,dy=event.changedTouches[0].clientY-touch.clientY;
      if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)) show(index+(dx<0?1:-1));
      touch=null;
    }, {passive:true});
    gallery.classList.add('gallery-ready'); show(0);
  });
})();
