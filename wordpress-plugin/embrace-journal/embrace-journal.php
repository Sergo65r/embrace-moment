<?php
/**
 * Plugin Name: Embrace — редактор журналов
 * Description: Редактируемые макеты владельца и отдельные локальные проекты покупателей.
 * Version: 1.0.0
 */
defined('ABSPATH') || exit;
add_action('init', function () {
    register_post_type('embrace_layout', ['label'=>'Макеты Embrace','public'=>false,'show_ui'=>false,'supports'=>['title','revisions']]);
});
function ej_url($id, $author=false) { return add_query_arg(['embrace_journal'=>(int)$id]+($author?['ej_owner'=>1]:[]), home_url('/')); }
function ej_install() {
    $existing=get_option('embrace_editor_templates', []);
    $seeds=json_decode(file_get_contents(__DIR__.'/setup/templates.json'), true);
    foreach($seeds as $key=>$doc) {
        if(!empty($existing[$key]) && get_post($existing[$key]))continue;
        $id=wp_insert_post(['post_type'=>'embrace_layout','post_status'=>'publish','post_title'=>$doc['name'],'post_author'=>get_current_user_id()]);
        update_post_meta($id,'_ej_base',$key);
        $doc['assets']=(object)$doc['assets'];
        update_post_meta($id,'_ej_document',wp_slash(wp_json_encode($doc)));
        update_post_meta($id,'_ej_revision',1); $existing[$key]=$id;
    }
    update_option('embrace_editor_templates',$existing);
}
register_activation_hook(__FILE__,'ej_install');
add_action('admin_menu',function(){add_submenu_page('embrace','Редактор журналов','Редактор журналов','manage_options','embrace-journals','ej_admin');},20);
function ej_binding_profile(){
    $saved=get_option('embrace_binding_profile',[]);$width=(float)($saved['widthMm']??12);
    return ['widthMm'=>max(5,min(30,$width)),'confirmed'=>!empty($saved['confirmed'])];
}
add_action('admin_post_ej_binding',function(){
    if(!current_user_can('manage_options'))wp_die('Нет доступа',403);check_admin_referer('ej_binding');
    $width=filter_var(wp_unslash($_POST['width_mm']??''),FILTER_VALIDATE_FLOAT);
    if($width===false||$width<5||$width>30)wp_die('Укажите ширину зоны от 5 до 30 мм.');
    update_option('embrace_binding_profile',['widthMm'=>round($width,1),'confirmed'=>!empty($_POST['confirmed'])]);
    wp_safe_redirect(admin_url('admin.php?page=embrace-journals&binding_saved=1'));exit;
});
function ej_admin(){
    if(!current_user_can('manage_options'))return;
    echo '<div class="wrap"><h1>Редактор журналов Embrace</h1><p>Редактируйте исходные макеты здесь. Покупатели получают отдельную копию: их правки не меняют ваш шаблон.</p><p><b>Формат А4.</b> Фото в макетах пока представлены заменяемыми рамками. Для точного оформления по референсам загрузите отдельные исходники. Печатные отступы ещё уточняются.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;max-width:1100px">';
    foreach(get_posts(['post_type'=>'embrace_layout','post_status'=>'publish','numberposts'=>-1,'orderby'=>'ID','order'=>'ASC']) as $p){
        $doc=json_decode(get_post_meta($p->ID,'_ej_document',true),true);
        echo '<section style="padding:24px;background:#fff;border:1px solid #ddd;border-radius:12px"><h2>'.esc_html($p->post_title).'</h2><p>'.count($doc['pages']??[]).' страниц · версия '.(int)get_post_meta($p->ID,'_ej_revision',true).'</p><p><a class="button button-primary" href="'.esc_url(ej_url($p->ID,true)).'">Редактировать макет</a></p><a href="'.esc_url(ej_url($p->ID)).'">Открыть как покупатель →</a><p><small>Ссылка для кнопки на сайте:</small><br><input readonly style="width:100%" aria-label="Ссылка на редактор '.esc_attr($p->post_title).'" value="'.esc_attr(ej_url($p->ID)).'"></p></section>';
    }
    echo '</div><h2>Создать новый макет</h2><form method="post" action="'.esc_url(admin_url('admin-post.php')).'"><input type="hidden" name="action" value="ej_create">';wp_nonce_field('ej_create');
    echo '<p><label>Название <input name="title" required maxlength="150" class="regular-text"></label></p><p><label>Основа <select name="base"><option value="blank">Свой макет</option><option value="birthday">С днём рождения</option><option value="mama">Для мамы</option><option value="love">История любви</option></select></label></p>';
    submit_button('Создать и открыть редактор');echo '</form>';
    $binding=ej_binding_profile();
    echo '<h2>Зона пружины и проколов</h2><p>Обложка и нечётные страницы — слева; чётные — справа. Отступ измеряется от края А4. Направляющие видны в редакторе и предпросмотре, но не печатаются.</p>';
    if(isset($_GET['binding_saved']))echo '<div class="notice notice-success"><p>Настройки пружины сохранены.</p></div>';
    echo '<form method="post" action="'.esc_url(admin_url('admin-post.php')).'"><input type="hidden" name="action" value="ej_binding">';wp_nonce_field('ej_binding');
    echo '<p><label>Ширина зоны, мм <input type="number" name="width_mm" min="5" max="30" step="0.1" required value="'.esc_attr($binding['widthMm']).'"></label></p><p><label><input type="checkbox" name="confirmed" value="1" '.checked($binding['confirmed'],true,false).'> Отступ согласован с типографией</label></p><p>До согласования используется предварительная зона 12 мм. Шаг и размер нарисованных отверстий условные. Настройка применяется ко всем журналам, включая сохранённые черновики, после открытия редактора.</p>';
    submit_button('Сохранить зону пружины');echo '</form></div>';
}
add_action('admin_post_ej_create',function(){
    if(!current_user_can('manage_options'))wp_die('Нет доступа',403);check_admin_referer('ej_create');
    $title=sanitize_text_field(wp_unslash($_POST['title']??''));$base=sanitize_key($_POST['base']??'blank');
    $seeds=json_decode(file_get_contents(__DIR__.'/setup/templates.json'),true);if(!$title||!isset($seeds[$base]))wp_die('Укажите название и основу');
    $doc=$seeds[$base];$doc['name']=$title;$doc['assets']=(object)$doc['assets'];
    $id=wp_insert_post(['post_type'=>'embrace_layout','post_status'=>'publish','post_title'=>$title,'post_author'=>get_current_user_id()]);
    update_post_meta($id,'_ej_base',$base);update_post_meta($id,'_ej_document',wp_slash(wp_json_encode($doc)));update_post_meta($id,'_ej_revision',1);
    wp_safe_redirect(ej_url($id,true));exit;
});
function ej_valid($d){
    if(!is_array($d)||($d['version']??null)!==1||!is_string($d['name']??null)||mb_strlen($d['name'])>150||!in_array($d['theme']??'', ['birthday','mama','love','blank'],true)||!is_array($d['pages']??null)||count($d['pages'])<1||count($d['pages'])>36||!is_array($d['assets']??null))return false;
    $ids=[]; $number=static fn($v,$min,$max)=>(is_int($v)||is_float($v))&&is_finite((float)$v)&&$v>=$min&&$v<=$max;
    foreach($d['assets'] as $k=>$v)if(!preg_match('/^[a-zA-Z0-9_-]{1,100}$/',(string)$k)||!is_string($v)||!preg_match('~^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$~D',$v))return false;
    foreach($d['pages'] as $p){
        if(!is_array($p)||!is_string($p['id']??null)||!preg_match('/^[a-zA-Z0-9_-]{1,100}$/',$p['id'])||isset($ids[$p['id']])||!preg_match('/^#[0-9a-f]{6}$/i',$p['background']??'')||!is_array($p['elements']??null)||count($p['elements'])>100)return false;$ids[$p['id']]=true;
        foreach($p['elements'] as $e){
            if(!is_array($e)||!is_string($e['id']??null)||!preg_match('/^[a-zA-Z0-9_-]{1,100}$/',$e['id'])||isset($ids[$e['id']])||!in_array($e['type']??'', ['text','photo'],true))return false;$ids[$e['id']]=true;
            foreach(['x'=>[-600,600],'y'=>[-849,849],'w'=>[24,1200],'h'=>[24,1698],'rotation'=>[-180,180],'opacity'=>[.1,1]] as $key=>$r)if(!$number($e[$key]??null,...$r))return false;
            foreach(['locked','hidden','bold','italic','underline','strike','flipX','autoFit'] as $key)if(isset($e[$key])&&!is_bool($e[$key]))return false;
            if(isset($e['letterSpacing'])&&!$number($e['letterSpacing'],-5,20))return false;
            if(isset($e['filter'])&&!in_array($e['filter'],['none','grayscale','sepia','warm'],true))return false;
            if($e['type']==='text'){
                if(!is_string($e['text']??null)||mb_strlen($e['text'])>10000||!in_array($e['font']??'', ['serif','sans','italic'],true)||!in_array($e['align']??'', ['left','center','right'],true)||!preg_match('/^#[0-9a-f]{6}$/i',$e['color']??'')||!$number($e['size']??null,1,1200)||!$number($e['lineHeight']??null,.8,2))return false;
            }elseif(!in_array($e['fit']??'', ['cover','contain'],true)||!$number($e['posX']??null,0,100)||!$number($e['posY']??null,0,100)||(($e['asset']??null)!==null&&!isset($d['assets'][$e['asset']])))return false;
        }
    }return true;
}
add_action('rest_api_init',function(){register_rest_route('embrace-editor/v1','/template/(?P<id>\d+)',['methods'=>'POST','permission_callback'=>function($r){return current_user_can('manage_options')&&get_post_type((int)$r->get_url_params()['id'])==='embrace_layout';},'callback'=>function($r){
    if(strlen($r->get_body())>32000000)return new WP_Error('too_large','Шаблон превышает 32 МБ. Сохраните копию и уменьшите фотографии.',['status'=>413]);
    $id=(int)$r->get_url_params()['id'];$body=$r->get_json_params();$d=$body['document']??null;$revision=(int)get_post_meta($id,'_ej_revision',true);
    if(!ej_valid($d))return new WP_Error('invalid_document','Макет содержит некорректные данные.',['status'=>400]);
    if(($body['revision']??null)!==$revision)return new WP_Error('conflict','Шаблон изменён в другой вкладке. Скачайте свою копию перед обновлением страницы.',['status'=>409]);
    update_post_meta($id,'_ej_previous',get_post_meta($id,'_ej_document',true));$d['assets']=(object)$d['assets'];
    update_post_meta($id,'_ej_document',wp_slash(wp_json_encode($d)));update_post_meta($id,'_ej_revision',$revision+1);
    wp_update_post(['ID'=>$id,'post_title'=>sanitize_text_field($d['name'])]);return ['saved'=>true,'revision'=>$revision+1];
}]);});
add_action('template_redirect',function(){
    if(!isset($_GET['embrace_journal']))return;
    $id=absint($_GET['embrace_journal']);$p=get_post($id);$author=!empty($_GET['ej_owner']);
    if(!$p||$p->post_type!=='embrace_layout'||$p->post_status!=='publish'||($author&&!current_user_can('manage_options'))){status_header(403);exit('Нет доступа к этому макету. Для режима владельца войдите в WordPress.');}
    nocache_headers();header('X-Robots-Tag: noindex, nofollow');header('Content-Type: text/html; charset=utf-8');
    $base=get_post_meta($id,'_ej_base',true);$pages=absint($_GET['pages']??20);if(!in_array($pages,[20,24,28,32,36],true))$pages=20;
    $c=['binding'=>ej_binding_profile(),'id'=>$id,'base'=>$base,'author'=>$author,'pages'=>$pages,'revision'=>(int)get_post_meta($id,'_ej_revision',true),'document'=>json_decode(get_post_meta($id,'_ej_document',true)),'admin'=>admin_url('admin.php?page=embrace-journals'),'home'=>home_url('/'),'detail'=>home_url('/journal-'.$base.'/'),'settings'=>function_exists('embrace_options')?embrace_options():['base_price'=>3000,'extra_price'=>100],'endpoint'=>rest_url('embrace-editor/v1/template/'.$id),'nonce'=>$author?wp_create_nonce('wp_rest'):'','assets'=>plugins_url('assets/',__FILE__)];
    if(is_object($c['document']))$c['document']->assets=(object)($c['document']->assets??[]);
    ?><!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#faf7f3"><title>Редактор журнала — Embrace</title><link rel="stylesheet" href="<?php echo esc_url(get_theme_file_uri('assets/fonts/fonts.css')); ?>"><?php foreach(['editor.css','interface.css'] as $file): ?><link rel="stylesheet" href="<?php echo esc_url(plugins_url('assets/'.$file,__FILE__).'?v='.filemtime(__DIR__.'/assets/'.$file)); ?>"><?php endforeach; ?><script>window.EmbraceWP=<?php echo wp_json_encode($c,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT); ?>;</script></head><body><main id="app"></main><?php foreach(['editor-model.js','editor.js','bridge.js'] as $file): ?><script src="<?php echo esc_url(plugins_url('assets/'.$file,__FILE__).'?v='.filemtime(__DIR__.'/assets/'.$file)); ?>"></script><?php endforeach; ?></body></html><?php exit;
});
