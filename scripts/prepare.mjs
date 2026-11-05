import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const theme = path.join(root, 'wordpress-theme/embrace');
const plugin = path.join(root, 'wordpress-plugin/embrace-tools');
const source = 'C:/Users/Sergo65r/Desktop/embrace-moment-main';
const sourceCode = fs.readFileSync(path.join(source, 'app.js'), 'utf8');
const extract = (start, end, name) => vm.runInNewContext(sourceCode.slice(sourceCode.indexOf(start), sourceCode.indexOf(end)) + `\n${name}`, {}, {timeout:1000});
const templates = extract('const templates=', 'const app=', 'templates');
const groups = extract('const serviceGroups=', 'const productImage=', '({groups:serviceGroups,images:productImages})');
const legal = {};
for (const slug of ['seller','privacy','terms','consent']) {
  const html = fs.readFileSync(path.join(source, `${slug}.html`),'utf8');
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || '';
  legal[slug] = [...main.matchAll(/<(h[1-6]|p|ul|ol)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map(match=>({tag:match[1],content:match[3].replace(/\.\/index\.html#\//g,'/').replace(/\.\/(seller|privacy|terms|consent)\.html/g,'/$1/')}));
}
const settings = {base_price:3000,extra_price:100,telegram:'https://t.me/Asya_65r',max:'https://max.ru/u/f9LHodD0cOLXYLHtRu592LSMEA1EMB2cJrD4nZYo7YX8wPMzzqN-03yBNow',whatsapp:'https://wa.me/qr/H43L7V4ZOVDDO1'};
fs.mkdirSync(path.join(plugin,'setup/assets'),{recursive:true});
const assets = path.join(root,'.brief/materials/assets');
const files = [
  ...templates.flatMap(t=>[`cover-${t.id}-spiral-960.webp`,`spread-${t.id}-spiral-1536.webp`]),
  ...Object.values(groups.images).map(file=>`products/${file}-800.webp`),
  'icons/Telegram_ico.jpg','icons/Max_ico.jpg','icons/Whatsapp_Ico.jpg',
];
for (const file of files) {
  const dest = path.join(plugin,'setup/assets',file); fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.copyFileSync(path.join(assets,file),dest);
}
fs.writeFileSync(path.join(plugin,'setup/data.json'),JSON.stringify({templates,groups:groups.groups,images:groups.images,legal,settings,files},null,2));
const palette = {paper:['Бумага','#faf7f3'],ink:['Текст','#292824'],muted:['Приглушённый текст','#74706a'],terracotta:['Терракотовый','#ad7462'],line:['Тонкие линии','#e5dcd3'],porcelain:['Молочный','#fffdf9'],sand:['Песочный','#f2ede6']};
const font = (name,slug,family,faces) => ({name,slug,fontFamily:family,fontFace:faces.map(([file,weight,style='normal'])=>({fontFamily:name,fontWeight:String(weight),fontStyle:style,fontDisplay:'swap',src:[`file:./assets/fonts/${file}.ttf`]}))});
const json = {
  $schema:'https://schemas.wp.org/trunk/theme.json',version:3,
  settings:{appearanceTools:true,layout:{contentSize:'1180px',wideSize:'1440px'},color:{defaultPalette:false,palette:Object.entries(palette).map(([slug,[name,color]])=>({slug,name,color}))},spacing:{units:['px','rem','em','%','vw'],blockGap:true},typography:{customFontSize:true,lineHeight:true,fontFamilies:[
    font('Cormorant Garamond','cormorant',"'Cormorant Garamond', Georgia, serif",[['bb8f3c3b0ca40380',400],['75407d22188550d6',500],['705776b6237d1fd4',600],['a9565983a6247cbc',700],['374c6c52ce838c05',400,'italic'],['73152f8d0c78aab8',500,'italic']]),
    font('Manrope','manrope',"Manrope, Arial, sans-serif",[['755fa076675e6f61',400],['e6fa40b6715a310a',500],['900670474e93d412',600],['e7e0cf40cb44208e',700]])
  ]}},
  styles:{color:{background:'var:preset|color|paper',text:'var:preset|color|ink'},typography:{fontFamily:'var:preset|font-family|manrope',fontSize:'16px',lineHeight:'1.6'},spacing:{blockGap:'0px'},elements:{heading:{typography:{fontFamily:'var:preset|font-family|cormorant',fontWeight:'500'}},link:{color:{text:'inherit'},typography:{textDecoration:'none'}},button:{color:{background:'var:preset|color|terracotta',text:'#ffffff'},border:{radius:'8px'},typography:{fontFamily:'var:preset|font-family|manrope'}}}},
  templateParts:[{name:'header',title:'Шапка Embrace',area:'header'},{name:'footer',title:'Подвал Embrace',area:'footer'}]
};
fs.writeFileSync(path.join(theme,'theme.json'),JSON.stringify(json,null,2));
const header = `<!-- wp:group {"className":"header-inner","layout":{"type":"default"}} -->
<div class="wp-block-group header-inner"><!-- wp:navigation {"overlayMenu":"mobile","className":"header-nav","layout":{"type":"flex","orientation":"horizontal"}} -->
<!-- wp:navigation-link {"label":"Коллекция макетов","url":"/#templates","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Прочие услуги","url":"/services/","kind":"custom"} /-->
<!-- wp:navigation-link {"label":"Как это работает","url":"/#how","kind":"custom"} /-->
<!-- /wp:navigation -->
<!-- wp:paragraph {"className":"brand"} --><p class="brand"><a href="/">Embrace<em>the moment</em></a></p><!-- /wp:paragraph -->
<!-- wp:html --><div class="header-book"><a href="/#templates" aria-label="Коллекция журналов"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v15M3 4c4-1 6 0 9 1 3-1 5-2 9-1v15c-4-1-6 0-9 1-3-1-5-2-9-1z"/></svg></a></div><!-- /wp:html --></div><!-- /wp:group -->`;
const footer = `<!-- wp:group {"className":"footer-inner","layout":{"type":"default"}} --><div class="wp-block-group footer-inner"><!-- wp:paragraph {"className":"footer-brand"} --><p class="footer-brand"><a href="/">EMBRACE THE MOMENT</a></p><!-- /wp:paragraph --><!-- wp:paragraph {"className":"footer-note"} --><p class="footer-note">Ваши истории заслуживают страниц.</p><!-- /wp:paragraph --><!-- wp:paragraph {"className":"footer-legal"} --><p class="footer-legal"><a href="/seller/">О продавце</a></p><!-- /wp:paragraph --></div><!-- /wp:group -->`;
fs.writeFileSync(path.join(theme,'parts/header.html'),header);
fs.writeFileSync(path.join(theme,'parts/footer.html'),footer);
for (const [slug,title] of [['home','Главная Embrace'],['product','Карточка товара'],['contact','Заказы и вопросы'],['journal','Страница журнала']]) {
  fs.writeFileSync(path.join(theme,`patterns/${slug}.php`),`<?php\n/**\n * Title: ${title}\n * Slug: embrace/${slug}\n * Categories: embrace\n */\ndefined('ABSPATH') || exit;\necho get_option('embrace_pattern_${slug}', '');\n`);
}
console.log(`Prepared ${templates.length} journals, ${groups.groups.reduce((n,g)=>n+g.items.length,0)} products, ${files.length} media files.`);
