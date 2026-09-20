$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$appPath = Join-Path $root "app.js"
$indexPath = Join-Path $root "index.html"

if (!(Test-Path $appPath) -or !(Test-Path $indexPath)) {
    Write-Host ""
    Write-Host "ОШИБКА: app.js или index.html не найдены." -ForegroundColor Red
    Write-Host "Распакуйте содержимое архива прямо в корень папки embrace-moment,"
    Write-Host "где уже лежат app.js, index.html и папка assets."
    Write-Host ""
    Read-Host "Нажмите Enter"
    exit 1
}

$required = @(
    "assets\products\print_bw-400.webp",
    "assets\products\print_bw-800.webp",
    "assets\products\print_color-400.webp",
    "assets\products\print_color-800.webp",
    "assets\products\lamination-400.webp",
    "assets\products\lamination-800.webp"
)

foreach ($rel in $required) {
    if (!(Test-Path (Join-Path $root $rel))) {
        Write-Host "ОШИБКА: не найден файл $rel" -ForegroundColor Red
        Read-Host "Нажмите Enter"
        exit 1
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$app = [System.IO.File]::ReadAllText($appPath)
$index = [System.IO.File]::ReadAllText($indexPath)

# Резервные копии создаются один раз.
if (!(Test-Path "$appPath.bak-product-images")) {
    Copy-Item $appPath "$appPath.bak-product-images"
}
if (!(Test-Path "$indexPath.bak-product-images")) {
    Copy-Item $indexPath "$indexPath.bak-product-images"
}

# Ламинирование: заменяем старую картинку photo_size на отдельную.
$app = [regex]::Replace(
    $app,
    '"Ламинирование фотографий"\s*:\s*"[^"]+"',
    '"Ламинирование фотографий": "lamination"',
    1
)

# Чёрно-белая печать.
if ($app -match '"Чёрно-белая печать"\s*:') {
    $app = [regex]::Replace(
        $app,
        '"Чёрно-белая печать"\s*:\s*"[^"]+"',
        '"Чёрно-белая печать": "print_bw"',
        1
    )
} else {
    $pattern = '("Журнал А4"\s*:\s*"jurnal")'
    if ($app -notmatch $pattern) {
        Write-Host "ОШИБКА: не удалось найти объект productImages в app.js." -ForegroundColor Red
        Write-Host "app.js не изменён."
        Read-Host "Нажмите Enter"
        exit 1
    }
    $app = [regex]::Replace(
        $app,
        $pattern,
        '"Чёрно-белая печать": "print_bw", $1',
        1
    )
}

# Цветная печать.
if ($app -match '"Печать с цветными элементами"\s*:') {
    $app = [regex]::Replace(
        $app,
        '"Печать с цветными элементами"\s*:\s*"[^"]+"',
        '"Печать с цветными элементами": "print_color"',
        1
    )
} else {
    $pattern = '("Чёрно-белая печать"\s*:\s*"print_bw")'
    $app = [regex]::Replace(
        $app,
        $pattern,
        '$1, "Печать с цветными элементами": "print_color"',
        1
    )
}

# Обновляем только app.js в index.html, чтобы Telegram/браузер не держал старый кэш.
$index = [regex]::Replace(
    $index,
    '<script\s+src="\./app\.js(?:\?v=[^"]*)?"></script>',
    '<script src="./app.js?v=products1"></script>',
    1
)

[System.IO.File]::WriteAllText($appPath, $app, $utf8NoBom)
[System.IO.File]::WriteAllText($indexPath, $index, $utf8NoBom)

Write-Host ""
Write-Host "ГОТОВО." -ForegroundColor Green
Write-Host "Добавлены изображения:"
Write-Host "  - Чёрно-белая печать"
Write-Host "  - Печать с цветными элементами"
Write-Host "  - Ламинирование фотографий"
Write-Host ""
Write-Host "В GitHub Desktop должны появиться:"
Write-Host "  app.js"
Write-Host "  index.html"
Write-Host "  6 новых файлов в assets/products/"
Write-Host ""
Write-Host "Файлы *.bak-product-images в commit НЕ добавляйте."
Write-Host ""
Read-Host "Нажмите Enter"
