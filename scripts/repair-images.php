<?php
// Run through Studio WP-CLI. Repairs only empty image references, preserving edits.
if (!defined('WP_CLI') || !WP_CLI) exit;
$data = json_decode(file_get_contents(__DIR__.'/../wordpress-plugin/embrace-tools/setup/data.json'), true);
$lookup = [];
foreach ($data['templates'] as $template) {
    $file = 'cover-'.$template['id'].'-spiral-960.webp';
    $lookup['Журнал «'.$template['name'].'»'] = $file;
    $lookup['Обложка журнала «'.$template['name'].'»'] = $file;
    $lookup['Разворот «'.$template['spreadTitle'].'»'] = 'spread-'.$template['id'].'-spiral-1536.webp';
}
foreach ($data['images'] as $title => $file) $lookup[$title] = 'products/'.$file.'-800.webp';
$attachments = [];
foreach (get_posts(['post_type'=>'attachment', 'post_status'=>'inherit', 'numberposts'=>-1]) as $attachment) {
    $source = get_post_meta($attachment->ID, '_embrace_source', true);
    if ($source) $attachments[$source] = ['id'=>$attachment->ID, 'url'=>wp_get_attachment_url($attachment->ID)];
}
$repair = function ($content) use ($lookup, $attachments) {
    $walk = function ($blocks) use (&$walk, $lookup, $attachments) {
        foreach ($blocks as &$block) {
            if ($block['blockName'] === 'core/image' && preg_match('/<img\b[^>]*src=""[^>]*alt="([^"]*)"/', $block['innerHTML'], $matches)) {
                $alt = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $file = $lookup[$alt] ?? null;
                if (!$file || !isset($attachments[$file])) WP_CLI::error('No media match for '.$alt);
                $media = $attachments[$file];
                $block['attrs']['id'] = $media['id'];
                $html = str_replace(['src=""', 'class="wp-image-"'], ['src="'.esc_url($media['url']).'"', 'class="wp-image-'.$media['id'].'"'], $block['innerHTML']);
                $block['innerHTML'] = $html;
                $block['innerContent'] = [$html];
                update_post_meta($media['id'], '_wp_attachment_image_alt', $alt);
            }
            if ($block['innerBlocks']) $block['innerBlocks'] = $walk($block['innerBlocks']);
        }
        return $blocks;
    };
    return serialize_blocks($walk(parse_blocks($content)));
};
$backup = ['pages'=>[], 'patterns'=>[]];
$changes = [];
foreach (get_posts(['post_type'=>'page','post_status'=>'any','numberposts'=>-1,'meta_key'=>'_embrace_managed','meta_value'=>1]) as $page) {
    $fixed = $repair($page->post_content);
    if ($fixed !== $page->post_content) {
        $backup['pages'][$page->ID] = $page->post_content;
        $changes[$page->ID] = $fixed;
    }
}
$patterns = [];
foreach (['home','contact','product','journal'] as $key) {
    $option = 'embrace_pattern_'.$key;
    $old = get_option($option, ''); $new = $repair($old);
    if ($old !== $new) { $backup['patterns'][$option] = $old; $patterns[$option] = $new; }
}
if ($changes || $patterns) {
    $path = __DIR__.'/../backups/before-image-repair-'.gmdate('Ymd-His').'.json';
    if (file_put_contents($path, wp_json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false) WP_CLI::error('Backup failed.');
    foreach ($changes as $id=>$content) {
        $result=wp_update_post(wp_slash(['ID'=>$id,'post_content'=>$content]), true);
        if (is_wp_error($result)) WP_CLI::error($result->get_error_message());
    }
    foreach ($patterns as $key=>$content) update_option($key, $content);
}
WP_CLI::success('Repaired '.count($changes).' pages and '.count($patterns).' patterns. Existing non-image content preserved.');
