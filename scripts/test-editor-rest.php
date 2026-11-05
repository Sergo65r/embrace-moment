<?php
if(!defined('WP_CLI')||!WP_CLI)exit;
$id=(int)get_option('embrace_editor_templates')['birthday'];
$d=json_decode(get_post_meta($id,'_ej_document',true),true);
$rev=(int)get_post_meta($id,'_ej_revision',true);
wp_set_current_user(get_user_by('login','sergo_owner')->ID);
$run=function($doc,$revision)use($id){$r=new WP_REST_Request('POST','/embrace-editor/v1/template/'.$id);$r->set_header('Content-Type','application/json');$r->set_body(wp_json_encode(['document'=>$doc,'revision'=>$revision]));return rest_do_request($r)->get_status();};
if($run($d,$rev-1)!==409)WP_CLI::error('Stale revision accepted');
$bad=$d;$bad['pages'][0]['elements'][0]['color']='red;background:url(x)';
if($run($bad,$rev)!==400)WP_CLI::error('Invalid style accepted');
if((int)get_post_meta($id,'_ej_revision',true)!==$rev)WP_CLI::error('Rejected request changed template');
WP_CLI::success('Stale revision 409; invalid style 400; saved template unchanged; revision '.$rev);
