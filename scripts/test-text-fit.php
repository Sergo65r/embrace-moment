<?php
$id=(int)get_option('embrace_editor_templates')['birthday'];
$d=json_decode(get_post_meta($id,'_ej_document',true),true);
foreach([1,36.25,88.32,250,1200] as $size){$d['pages'][0]['elements'][0]['size']=$size;$d['pages'][0]['elements'][0]['autoFit']=true;if(!ej_valid($d))WP_CLI::error('Fitted size rejected: '.$size);}
$d['pages'][0]['elements'][0]['size']=1201;if(ej_valid($d))WP_CLI::error('Invalid size accepted');
$d['pages'][0]['elements'][0]['size']=32;$d['pages'][0]['elements'][0]['autoFit']='yes';if(ej_valid($d))WP_CLI::error('Invalid fitting mode accepted');
WP_CLI::success('Server accepts fitted text sizes, rejects invalid size and mode. No template changed.');
