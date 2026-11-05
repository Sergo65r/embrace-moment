<?php
// One-time local setup. Never runs from a public web request.
if (!defined('WP_CLI') || !WP_CLI) exit;
if (get_option('embrace_seed_version') === '1.0') { WP_CLI::success('Content already installed; existing edits preserved.'); return; }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$data = json_decode(file_get_contents(__DIR__ . '/data.json'), true, 512, JSON_THROW_ON_ERROR);
global $media;
$media = [];
foreach ($data['files'] as $file) {
    $found = get_posts(['post_type'=>'attachment','post_status'=>'inherit','numberposts'=>1,'meta_key'=>'_embrace_source','meta_value'=>$file]);
    if ($found) { $id=$found[0]->ID; }
    else {
        $temporary=wp_tempnam(basename($file)); copy(__DIR__.'/assets/'.$file,$temporary);
        $id=media_handle_sideload(['name'=>basename($file),'tmp_name'=>$temporary],0);
        if (is_wp_error($id)) { WP_CLI::error($file . ': ' . $id->get_error_message()); }
        update_post_meta($id,'_embrace_source',$file);
    }
    $media[$file] = ['id'=>$id,'url'=>wp_get_attachment_url($id)];
}
function eb($name, $attrs=[], $html=null) {
    $json=$attrs ? ' '.wp_json_encode($attrs,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : '';
    return $html === null ? '<!-- wp:'.$name.$json.' /-->' : '<!-- wp:'.$name.$json.' -->'.$html.'<!-- /wp:'.$name.' -->';
}
function eg($class, $content, $name='', $anchor='', $tag='div') {
    $attrs=['className'=>$class,'layout'=>['type'=>'default']];
    if ($name) $attrs['metadata']=['name'=>$name];
    if ($anchor) $attrs['anchor']=$anchor;
    if ($tag !== 'div') $attrs['tagName']=$tag;
    return eb('group',$attrs,'<'.$tag.($anchor?' id="'.esc_attr($anchor).'"':'').' class="wp-block-group '.esc_attr($class).'">'.$content.'</'.$tag.'>');
}
function ep($text, $class='') { return eb('paragraph',$class?['className'=>$class]:[], '<p'.($class?' class="'.esc_attr($class).'"':'').'>'.$text.'</p>'); }
function eh($text, $level=2, $class='') {
    $attrs=[]; if ($level!==2) $attrs['level']=$level; if ($class) $attrs['className']=$class;
    return eb('heading',$attrs,'<h'.$level.' class="wp-block-heading'.($class?' '.esc_attr($class):'').'">'.$text.'</h'.$level.'>');
}
function ei($file,$alt,$class='',$caption='',$link='') {
    global $media;
    $m=$media[$file]; update_post_meta($m['id'],'_wp_attachment_image_alt',$alt);
    $attrs=['id'=>$m['id'],'sizeSlug'=>'full','linkDestination'=>$link?'custom':'none'];
    if ($class) $attrs['className']=$class;
    $img='<img src="'.esc_url($m['url']).'" alt="'.esc_attr($alt).'" class="wp-image-'.$m['id'].'"/>';
    if ($link) $img='<a href="'.esc_url($link).'">'.$img.'</a>';
    return eb('image',$attrs,'<figure class="wp-block-image size-full'.($class?' '.esc_attr($class):'').'">'.$img.($caption?'<figcaption class="wp-element-caption">'.esc_html($caption).'</figcaption>':'').'</figure>');
}
function ebutton($text,$url,$class='') {
    return eb('button',$class?['className'=>$class]:[], '<div class="wp-block-button'.($class?' '.esc_attr($class):'').'"><a class="wp-block-button__link wp-element-button" href="'.esc_url($url).'">'.$text.'</a></div>');
}
function ebuttons($content,$class='') { return eb('buttons',$class?['className'=>$class]:[],'<div class="wp-block-buttons'.($class?' '.esc_attr($class):'').'">'.$content.'</div>'); }
function elist($items) { return eb('list',[],'<ul class="wp-block-list">'.implode('',array_map(fn($item)=>eb('list-item',[],'<li>'.$item.'</li>'),$items)).'</ul>'); }
function eswitch($services=false) { return ebuttons(ebutton('Журналы','/#templates',$services?'is-style-outline':'').ebutton('Прочие услуги','/services/',$services?'':'is-style-outline'),'category-switch'); }
function especs() {
    $items=[
        ['<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>','Формат','А4 · 21 × 29,7 см','На пружинке'],
        ['<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2c5 0 4-11-6-11Z"/><circle cx="7" cy="10" r=".7"/><circle cx="11" cy="7" r=".7"/><circle cx="16" cy="8" r=".7"/>','Печать','Полноцветная',''],
        ['<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>','Изготовление','3–4 рабочих дня',''],
        ['<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 18 6-6 4 4 3-3 5 5"/>','Наполнение','Ваши фото и тексты',''],
    ];
    $html=''; foreach($items as [$svg,$label,$value,$note]) {
        $icon=eb('html',[],'<div class="spec-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.$svg.'</svg></div>');
        $html.=eg('spec-item',$icon.eg('spec-copy',ep($label).ep($value,'spec-value').($note?ep($note,'spec-note'):'')),$label);
    }
    return eg('specs',$html,'Характеристики журнала');
}
function econtact() {
    return eg('service-contact',ep('Заказы и вопросы','eyebrow').eh('Расскажите, что хотите напечатать').ep('Подскажем по формату и срокам, уточним стоимость нестандартного заказа.','contact-description').ebuttons(ebutton('Заказать или уточнить детали　 →','#order')),'Заказы и вопросы');
}
function epage($slug,$title,$content,$description='') {
    $page=get_page_by_path($slug,OBJECT,'page');
    $args=['post_title'=>$title,'post_name'=>$slug,'post_content'=>$content,'post_excerpt'=>$description,'post_type'=>'page','post_status'=>'publish'];
    if ($page) $args['ID']=$page->ID;
    $id=wp_insert_post(wp_slash($args),true);
    if (is_wp_error($id)) WP_CLI::error($id->get_error_message());
    update_post_meta($id,'_embrace_managed',1);
    return $id;
}
$cards='';
foreach($data['templates'] as $t) {
    $url='/journal-'.$t['id'].'/';
    $cards.=eg('journal-card',ei('cover-'.$t['id'].'-spiral-960.webp','Обложка журнала «'.$t['name'].'»','','',$url).eh('<a href="'.$url.'">'.esc_html($t['name']).'</a>',3).eg('card-bottom',eb('embrace/journal-price',['mode'=>'teaser']).ebutton('→',$url,'card-arrow')),'Журнал: '.$t['name']);
}
$hero=eg('hero',eg('hero-copy',ep('Личное становится вечным','eyebrow').eh('Создай свой<br><em>журнал.</em>',1).ep('Твои истории. Твои моменты.<br>Журнал, в котором главное — ты.','hero-description').ebuttons(ebutton('Выбрать макет　 →','/#templates'))).eg('hero-art',ei('cover-love-spiral-960.webp','Журнал «История любви»','hero-back').ei('cover-birthday-spiral-960.webp','Журнал «С днём рождения»','hero-front').ep('Сохраняй<br>главное','hero-signature')),'Первый экран');
$collection=eg('collection',eg('section-heading',ep('Коллекция личных историй','eyebrow').eh('С чего начнётся ваша?').ep('Четыре макета. Бесконечно много ваших историй.','section-description')).eg('journal-grid',$cards,'Четыре макета').especs(),'Коллекция макетов','templates','section');
$steps=''; foreach([
    ['01','Выберите свою историю','Найдите близкий вам макет и нужное количество страниц — от 20 до 36.'],
    ['02','Соберите самое личное','Подберите любимые фотографии, важные даты и слова, которые хочется сохранить.'],
    ['03','Обсудим детали вместе','Напишите нам в удобном мессенджере. Согласуем оформление, стоимость и срок изготовления.'],
] as [$n,$title,$description]) $steps.=eg('step',ep($n,'step-number').eg('step-copy',eh($title,3).ep($description,'step-description')),$title);
$how=eg('how',eg('how-heading',ep('От идеи до журнала','eyebrow').eh('Легко создать.<br><em>Приятно сохранить.</em>')).eg('steps',$steps),'Как это работает','how','section');
$home=eswitch().$hero.$collection.$how;
$homeId=epage('home','Главная',$home,'Персональные журналы, фотографии и подарки Embrace the moment. Сохраните ваши истории на страницах.');
update_option('show_on_front','page'); update_option('page_on_front',$homeId);
update_option('blogname','Embrace the Moment');update_option('blogdescription','Ваши истории заслуживают страниц.');
update_option('embrace_pattern_home',$home);
update_option('embrace_pattern_contact',econtact());
foreach($data['templates'] as $t) {
    $gallery=eg('journal-gallery',ei('cover-'.$t['id'].'-spiral-960.webp','Обложка журнала «'.$t['name'].'»','','Обложка').ei('spread-'.$t['id'].'-spiral-1536.webp','Разворот «'.$t['spreadTitle'].'»','',$t['spreadLabel']),'Обложка и разворот');
    $left=eg('journal-visual',$gallery.ep('Пример оформления обложки и разворота. Добавьте свои фотографии и слова.','gallery-caption'));
    $right=eg('journal-copy',ep(esc_html($t['tag']),'eyebrow').eh(esc_html($t['name']),1).ep(esc_html($t['subtitle']),'journal-subtitle').ep(esc_html($t['description']),'journal-description').eb('embrace/journal-price',['journal'=>$t['name']]),'Описание и стоимость');
    $inside=eg('inside',ep('Внутри этого макета','eyebrow').eh(esc_html($t['spreadTitle'])).ep(esc_html($t['hint']),'inside-hint').elist(array_map('esc_html',$t['chapters'])),'Что внутри журнала');
    $content=eg('detail',ep('<a href="/#templates">‹　Все макеты</a>','back-link').eg('detail-grid',$left.$right).eg('journal-extras',especs().$inside),'Страница журнала');
    epage('journal-'.$t['id'],$t['name'],$content,$t['description']);
    if ($t['id']==='birthday') update_option('embrace_pattern_journal',$content);
}
$serviceSections='';$jump='';$productPattern='';
foreach($data['groups'] as $g) {
    $jump.=ebutton(esc_html($g['label']),'#'.$g['id'],'is-style-outline');$productCards='';
    foreach($g['items'] as [$name,$price,$description]) {
        $card=eg('service-card',ei('products/'.$data['images'][$name].'-800.webp',$name).eg('service-card-body',eh(esc_html($name),3).ep(esc_html($description),'service-description').ep(esc_html($price),'service-price').ebuttons(ebutton('Заказать','#order','is-style-outline'))),'Карточка товара: '.$name);
        $productCards.=$card;if(!$productPattern)$productPattern=$card;
    }
    $serviceSections.=eg('service-group',eg('service-group-head',ep($g['id']==='print'?'Печать':'Сделано для вас','eyebrow').eh(esc_html($g['label'])).ep(esc_html($g['intro']),'service-intro')).eg('service-grid',$productCards,'Карточки товаров').($g['id']==='photos'?ep('Размер фотографии меньше А7 можно подобрать индивидуально.','service-note'):''),$g['label'],$g['id'],'section');
}
$services=eswitch(true).eg('services-page',ep('<a href="/">‹　На главную</a>','back-link').eg('services-heading',ep('Embrace the moment','eyebrow').eh('Прочие услуги',1).ep('Печатные подарки, фотографии и документы. Выберите то, что хочется сохранить или подарить.','services-intro')).ebuttons($jump,'service-jump').$serviceSections.econtact().ep('Ваши материалы для печати остаются конфиденциальными. Условия индивидуального заказа уточняются перед изготовлением.','service-finish'),'Прочие услуги');
epage('services','Прочие услуги',$services,'Печатные подарки, фотопечать, сувениры и печать документов. Каталог и цены Embrace the moment.');
update_option('embrace_pattern_product',$productPattern);
foreach($data['legal'] as $slug=>$elements) {
    $content=ep('<a href="/">‹　Вернуться на сайт</a>','back-link');$title='';
    foreach($elements as $element) {
        $tag=$element['tag']; $html=wp_kses_post($element['content']);
        if(preg_match('/^h([1-6])$/',$tag,$match)) { $content.=eh($html,(int)$match[1]); if($tag==='h1')$title=wp_strip_all_tags($html); }
        elseif(in_array($tag,['ul','ol'],true)) { preg_match_all('/<li[^>]*>([\s\S]*?)<\/li>/i',$html,$items);$content.=elist($items[1]); }
        else $content.=ep($html);
    }
    epage($slug,$title?:$slug,eg('legal-page',$content),$title);
}
if (!get_option('embrace_options')) update_option('embrace_options',$data['settings']);
update_option('embrace_messenger_icons',[
    'telegram'=>$media['icons/Telegram_ico.jpg']['url'],
    'max'=>$media['icons/Max_ico.jpg']['url'],
    'whatsapp'=>$media['icons/Whatsapp_Ico.jpg']['url'],
]);
update_option('permalink_structure','/%postname%/');flush_rewrite_rules();
update_option('embrace_seed_version','1.0');
WP_CLI::success('Installed 10 editable pages, 4 journal layouts, 20 product cards and 31 media assets.');
