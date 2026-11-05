<?php
defined('ABSPATH') || exit;
add_action('after_setup_theme', function () {
    add_theme_support('editor-styles');
    add_editor_style('assets/site.css');
});
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('embrace-site', get_theme_file_uri('assets/site.css'), [], filemtime(get_theme_file_path('assets/site.css')));
    wp_enqueue_script('embrace-site', get_theme_file_uri('assets/site.js'), [], filemtime(get_theme_file_path('assets/site.js')), true);
});
add_action('init', function () {
    register_block_pattern_category('embrace', ['label' => 'Embrace — готовые разделы']);
});
add_action('wp_head', function () {
    if (is_singular()) {
        $description = get_the_excerpt();
        if ($description) echo '<meta name="description" content="' . esc_attr(wp_strip_all_tags($description)) . '">' . "\n";
    }
    echo '<meta name="theme-color" content="#faf7f3">' . "\n";
});
