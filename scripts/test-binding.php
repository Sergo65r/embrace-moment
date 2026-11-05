<?php
$profile=ej_binding_profile();
if($profile['widthMm']<5||$profile['widthMm']>30||!is_bool($profile['confirmed']))WP_CLI::error('Invalid active profile');
$testProfile=['widthMm'=>18.5,'confirmed'=>true];
$filter=static function()use(&$testProfile){return $testProfile;};
add_filter('pre_option_embrace_binding_profile',$filter);
if(ej_binding_profile()!==['widthMm'=>18.5,'confirmed'=>true])WP_CLI::error('Custom width not applied');
$testProfile=['widthMm'=>100,'confirmed'=>false];if(ej_binding_profile()['widthMm']!==30)WP_CLI::error('Width clamp failed');
remove_filter('pre_option_embrace_binding_profile',$filter);
wp_set_current_user(0);ob_start();ej_admin();$guest=ob_get_clean();if($guest!=='')WP_CLI::error('Guest can see owner settings');
wp_set_current_user(get_user_by('login','sergo_owner')->ID);ob_start();ej_admin();$html=ob_get_clean();
foreach(['name="width_mm"','name="confirmed"','name="_wpnonce"','value="ej_binding"'] as $needle)if(!str_contains($html,$needle))WP_CLI::error('Missing binding setting: '.$needle);
WP_CLI::success('Binding profile defaults/custom width/clamp and owner-only settings verified; no settings changed.');
