(function (wp) {
  const el = wp.element.createElement;
  const {InspectorControls, useBlockProps} = wp.blockEditor;
  const {PanelBody, SelectControl, TextControl, Notice} = wp.components;
  const money = n => Number(n).toLocaleString('ru-RU') + ' ₽';
  wp.blocks.registerBlockType('embrace/journal-price', {
    edit: function ({attributes, setAttributes}) {
      const settings = window.embracePriceDefaults || {base:3000, extra:100};
      const teaser = attributes.mode === 'teaser';
      return el(wp.element.Fragment, null,
        el(InspectorControls, null, el(PanelBody, {title:'Настройки журнала'},
          el(SelectControl,{label:'Вид блока',value:attributes.mode,options:[{label:'Выбор страниц и цена',value:'selector'},{label:'Цена «от» для карточки',value:'teaser'}],onChange:mode=>setAttributes({mode})}),
          !teaser && el(TextControl,{label:'Название журнала в заказе',value:attributes.journal,onChange:journal=>setAttributes({journal})}),
          el('p', null, 'Цены общие для всей коллекции. Измените их в разделе Embrace.'),
          el('a',{href:settings.settingsUrl,target:'_blank',rel:'noopener'},'Настроить цены'))),
        el('div',useBlockProps({className:teaser?'journal-teaser-price':'journal-order'}),
          teaser ? 'от '+money(settings.base) : el(wp.element.Fragment,null,
            el('div',{className:'price-row'},el('span',{className:'journal-total'},money(settings.base)),el('span',{className:'price-note'},'20 страниц · базовая стоимость')),
            el('p',null,'Количество страниц'),el('div',{className:'page-options editor-page-options'},[20,24,28,32,36].map(n=>el('span',{key:n,className:n===20?'selected':''},n))),
            el('p',{className:'quantity-note'},'Дополнительная страница — '+money(settings.extra)),
            el('div',{className:'embrace-button'},'Создать журнал →'),el('p',{className:'editor-note'},'Открывает редактор журнала. Макеты доступны в Embrace → Редактор журналов.'))));
    },
    save: () => null
  });
})(window.wp);
