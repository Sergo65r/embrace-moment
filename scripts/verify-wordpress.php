<?php
if (!defined('WP_CLI') || !WP_CLI) exit;
$errors=[]; $count=0;
$pages=get_posts(['post_type'=>'page','post_status'=>'publish','numberposts'=>-1,'meta_key'=>'_embrace_managed','meta_value'=>1]);
$scan=function($blocks) use (&$scan,&$errors,&$count) {
    foreach($blocks as $block) {
        if($block['blockName']==='core/image') {
            $count++; $id=$block['attrs']['id']??0;
            if(!$id || !is_file(get_attached_file($id))) $errors[]='Missing attachment '.$id;
            if(preg_match('/src=""/', $block['innerHTML'])) $errors[]='Empty image URL';
        }
        if($block['innerBlocks'])$scan($block['innerBlocks']);
    }
};
foreach($pages as $page) {
    $scan(parse_blocks($page->post_content));
    $render=do_blocks($page->post_content);
    if(preg_match('/<img[^>]*src=""/',$render))$errors[]='Empty rendered image '.$page->ID;
}
if(count($pages)!==10 || $count!==34)$errors[]='Unexpected page or image count';
if(get_stylesheet()!=='embrace')$errors[]='Theme inactive';
if(!function_exists('embrace_render_price'))$errors[]='Plugin inactive';
$admins=get_users(['role'=>'administrator']);
if(count($admins)!==1)$errors[]='Expected one owner';
if(get_option('users_can_register'))$errors[]='Public registration enabled';
wp_set_current_user(0);
$request=new WP_REST_Request('POST','/wp/v2/pages/'.get_option('page_on_front'));
$request->set_param('title','Unauthorized test');
$denied=rest_do_request($request);
if(!in_array($denied->get_status(),[401,403],true))$errors[]='Anonymous edit was not denied';
wp_set_current_user($admins[0]->ID);
$read=new WP_REST_Request('GET','/wp/v2/pages/'.get_option('page_on_front'));
$read->set_param('context','edit');
if(rest_do_request($read)->get_status()!==200)$errors[]='Owner cannot access editor content';
$result=['pages'=>count($pages),'image_blocks'=>$count,'administrators'=>count($admins),'anonymous_edit_status'=>$denied->get_status(),'errors'=>$errors];
WP_CLI::line(wp_json_encode($result,JSON_UNESCAPED_UNICODE));
if($errors)WP_CLI::error('Verification failed');
WP_CLI::success('WordPress content, attachments and edit permissions verified.');
