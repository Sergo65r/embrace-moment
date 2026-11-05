<?php
/**
 * Plugin Name: Embrace — управление витриной
 * Description: Настройки цен и контактов, блок выбора страниц журнала и оформление заказа через мессенджеры.
 * Version: 1.0.0
 * Requires PHP: 8.2
 */
defined('ABSPATH') || exit;

function embrace_options() {
    return wp_parse_args(get_option('embrace_options', []), [
        'base_price' => 3000, 'extra_price' => 100,
        'telegram' => '', 'max' => '', 'whatsapp' => '',
    ]);
}
function embrace_money($amount) { return number_format_i18n((float) $amount, 0) . ' ₽'; }
function embrace_sanitize_options($input) {
    $old = embrace_options();
    $input = is_array($input) ? $input : [];
    $result = [];
    foreach (['base_price', 'extra_price'] as $key) {
        $result[$key] = isset($input[$key]) && is_numeric($input[$key]) ? min(1000000, max(0, (int) $input[$key])) : $old[$key];
    }
    foreach (['telegram' => ['t.me', 'telegram.me'], 'max' => ['max.ru'], 'whatsapp' => ['wa.me', 'api.whatsapp.com']] as $key => $hosts) {
        $url = esc_url_raw($input[$key] ?? '', ['https']);
        if ($url && !in_array(strtolower(wp_parse_url($url, PHP_URL_HOST) ?? ''), $hosts, true)) {
            add_settings_error('embrace_options', $key, 'Проверьте адрес ' . $key . ': требуется официальная ссылка мессенджера.');
            $result[$key] = $old[$key];
        } else { $result[$key] = $url; }
    }
    return $result;
}
add_action('admin_init', function () {
    register_setting('embrace_settings', 'embrace_options', ['sanitize_callback' => 'embrace_sanitize_options']);
});
add_action('admin_menu', function () {
    add_menu_page('Управление Embrace', 'Embrace', 'manage_options', 'embrace', 'embrace_admin', 'dashicons-book-alt', 3);
});
function embrace_admin() {
    if (!current_user_can('manage_options')) return;
    $options = embrace_options();
    if(function_exists('ej_admin'))echo '<div class="notice notice-info"><p><a class="button button-primary" href="'.esc_url(admin_url('admin.php?page=embrace-journals')).'">Редактор журналов — открыть макеты</a></p></div>';
    echo '<div class="wrap"><h1>Embrace — управление сайтом</h1><p>Содержимое и оформление меняются в визуальном редакторе WordPress. Изменения сохраняются в базе сайта.</p>';
    echo '<p><a class="button button-primary" href="' . esc_url(admin_url('site-editor.php')) . '">Открыть визуальный редактор</a> <a class="button" href="' . esc_url(admin_url('edit.php?post_type=page')) . '">Страницы и товары</a> <a class="button" href="' . esc_url(admin_url('upload.php')) . '">Фотографии</a></p>';
    echo '<h2>Как редактировать</h2><ol><li><b>Главная и услуги:</b> откройте страницу, выберите текст, картинку или карточку. Через список блоков можно дублировать и перемещать целые разделы.</li><li><b>Новый товар:</b> на странице «Прочие услуги» продублируйте группу «Карточка товара» и замените изображение, название, описание и цену. Кнопка заказа автоматически использует данные карточки.</li><li><b>Новая страница:</b> создайте страницу и добавьте паттерн из категории «Embrace — готовые разделы».</li><li><b>Шапка и подвал:</b> Редактор → Паттерны → Части шаблона.</li><li><b>Шрифты и цвета:</b> Редактор → Стили. Используйте предпросмотр телефона перед сохранением.</li><li><b>Журнал:</b> обложка и разворот — обычные блоки изображений. Выбор страниц — блок «Цена и страницы журнала». Содержимое макетов меняйте в Embrace → Редактор журналов. Покупатель открывает свою копию через «Создать журнал».</li></ol>';
    settings_errors('embrace_options');
    echo '<form action="options.php" method="post">'; settings_fields('embrace_settings');
    echo '<h2>Общие цены журналов</h2><p>Эти цены одновременно обновляют коллекцию и калькуляторы на страницах журналов.</p><table class="form-table">';
    foreach (['base_price' => 'Стоимость 20 страниц, ₽', 'extra_price' => 'Дополнительная страница, ₽', 'telegram' => 'Telegram', 'max' => 'MAX', 'whatsapp' => 'WhatsApp'] as $key => $label) {
        $number = in_array($key, ['base_price', 'extra_price'], true);
        echo '<tr><th><label for="embrace-' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td><input class="regular-text" id="embrace-' . esc_attr($key) . '" name="embrace_options[' . esc_attr($key) . ']" type="' . ($number ? 'number' : 'url') . '" ' . ($number ? 'min="0" max="1000000" required ' : '') . 'value="' . esc_attr($options[$key]) . '"></td></tr>';
    }
    echo '</table><p>Заказ передаётся вами через выбранный мессенджер. Сайт не отправляет сообщения автоматически и не принимает оплату.</p>';
    submit_button('Сохранить цены и контакты'); echo '</form></div>';
}
add_action('init', function () {
    wp_register_script('embrace-price-editor', plugins_url('blocks/journal-price/editor.js', __FILE__), ['wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components'], filemtime(__DIR__ . '/blocks/journal-price/editor.js'), true);
    wp_localize_script('embrace-price-editor', 'embracePriceDefaults', [
        'base' => embrace_options()['base_price'], 'extra' => embrace_options()['extra_price'], 'settingsUrl' => admin_url('admin.php?page=embrace'),
    ]);
    register_block_type(__DIR__ . '/blocks/journal-price', ['render_callback' => 'embrace_render_price']);
});
function embrace_render_price($attributes) {
    $options = embrace_options();
    if (($attributes['mode'] ?? 'selector') === 'teaser') {
        return '<div ' . get_block_wrapper_attributes(['class' => 'journal-teaser-price']) . '>от ' . esc_html(embrace_money($options['base_price'])) . '</div>';
    }
    $name = sanitize_text_field($attributes['journal'] ?? 'Журнал');
    $template_keys=['С днём рождения'=>'birthday','Для мамы'=>'mama','История любви'=>'love','Свой макет'=>'blank'];
    $templates=get_option('embrace_editor_templates',[]);
    $template_id=$templates[$template_keys[$name]??'blank']??0;
    $editor_url=$template_id && function_exists('ej_url') ? ej_url($template_id) : '';
    $id = wp_unique_id('embrace-pages-');
    ob_start(); ?>
    <div <?php echo get_block_wrapper_attributes(['class' => 'journal-order']); ?> data-editor-url="<?php echo esc_url($editor_url); ?>" data-base="<?php echo esc_attr($options['base_price']); ?>" data-extra="<?php echo esc_attr($options['extra_price']); ?>" data-journal="<?php echo esc_attr($name); ?>">
        <div class="price-row"><output class="journal-total" aria-live="polite"><?php echo esc_html(embrace_money($options['base_price'])); ?></output><span class="price-note">20 страниц · базовая стоимость</span></div>
        <fieldset><legend>Количество страниц</legend><div class="page-options"><?php foreach ([20,24,28,32,36] as $count): ?>
            <label><input type="radio" name="<?php echo esc_attr($id); ?>" value="<?php echo $count; ?>" <?php checked($count, 20); ?>><span><?php echo $count; ?></span></label>
        <?php endforeach; ?></div></fieldset>
        <p class="quantity-note">20 страниц, включая обложку. Дополнительная страница — <?php echo esc_html(embrace_money($options['extra_price'])); ?>, лист (2 страницы) — <?php echo esc_html(embrace_money($options['extra_price'] * 2)); ?>.</p>
        <button type="button" class="embrace-button create-journal">Создать журнал <span aria-hidden="true">→</span></button>
        <p class="editor-note"><?php echo $editor_url ? 'Откроется редактор. Замените фото и тексты, сохраните свой журнал.' : 'Редактор скоро появится. Пока можно обсудить заказ с нами.'; ?></p>
    </div>
    <?php return ob_get_clean();
}
add_action('wp_footer', function () {
    $options = embrace_options();
    $icons = get_option('embrace_messenger_icons', []); ?>
    <dialog class="embrace-dialog order-dialog" aria-labelledby="embrace-order-title">
        <button type="button" class="dialog-close" aria-label="Закрыть">×</button>
        <p class="eyebrow">СОХРАНИМ ВАШУ ИСТОРИЮ</p><h2 id="embrace-order-title">Обсудим ваш заказ</h2>
        <p class="order-intro">Выберите удобный мессенджер. Уточним детали, стоимость и срок изготовления.</p>
        <div class="order-summary" hidden><label for="embrace-order-text">Детали заказа</label><textarea id="embrace-order-text" rows="4" readonly></textarea><button class="copy-order" type="button">Скопировать детали</button></div>
        <div class="messenger-links"><?php foreach (['telegram' => 'Telegram', 'max' => 'MAX', 'whatsapp' => 'WhatsApp'] as $key => $label): if (!$options[$key]) continue; ?>
            <a href="<?php echo esc_url($options[$key]); ?>" target="_blank" rel="noopener noreferrer" class="messenger messenger-<?php echo esc_attr($key); ?>"><span class="messenger-label"><?php if (!empty($icons[$key])): ?><img src="<?php echo esc_url($icons[$key]); ?>" alt="" width="28" height="28"><?php endif; ?><?php echo esc_html($label); ?></span><span aria-hidden="true">↗</span></a>
        <?php endforeach; ?></div><p class="copy-status" role="status"></p><p class="order-footnote">Скопируйте детали и отправьте их в выбранном чате. Открытие мессенджера само по себе не отправляет заказ.</p>
    </dialog>
    <dialog class="embrace-dialog image-dialog" aria-label="Увеличенный пример журнала"><button type="button" class="dialog-close" aria-label="Закрыть">×</button><img alt=""><p></p></dialog>
<?php });
