<?php
/**
 * Скрипт сборки xPDO-модели для компонента TourCards
 * 
 * Этот скрипт генерирует PHP-классы модели на основе XML-схемы.
 * Запускается из командной строки или через браузер (с осторожностью).
 * 
 * Использование:
 *   php build.schema.php
 * 
 * Или через веб-интерфейс (только в режиме разработки!):
 *   http://yoursite.com/core/components/tourcards/build/build.schema.php
 * 
 * @package tourcards
 * @subpackage build
 */

// Определяем базовые константы MODX
define('MODX_BASE_PATH', dirname(dirname(dirname(__DIR__))) . '/');
define('MODX_CORE_PATH', MODX_BASE_PATH . 'core/');

// Инициализируем MODX
require_once MODX_CORE_PATH . 'model/modx/modx.class.php';
$modx = new modX();
$modx->initialize('mgr');
$modx->setLogLevel(modX::LOG_LEVEL_INFO);
$modx->setLogTarget('ECHO');

// Путь к компоненту
$componentPath = dirname(__DIR__);

echo "\n=== Генерация модели TourCards ===\n\n";

// Загружаем модель xPDOGenerator
$modx->loadClass('xpdo.xpdo', MODX_CORE_PATH . 'model/', true, true);

// Проверяем существование схемы
$schemaFile = $componentPath . '/model/schema/tourcards.mysql.schema.xml';
if (!file_exists($schemaFile)) {
    echo "Ошибка: Файл схемы не найден: {$schemaFile}\n";
    exit(1);
}

echo "Найден файл схемы: {$schemaFile}\n";

// Создаём экземпляр xPDOGenerator для генерации классов модели
// xPDOGenerator - стандартный класс MODX для работы со схемами
$generator = $modx->getService(
    'generator',
    'xpdo.xpdo.XPDOGenerator',
    MODX_CORE_PATH . 'model/'
);

// Путь, куда будут сгенерированы классы модели
$modelPath = $componentPath . '/model/';

// Параметры генерации:
// - regenerate: пересоздавать ли существующие файлы (true для полной перегенерации)
// - class_extension: базовый класс для всех моделей (xPDOObject)
// - class_overwrite: перезаписывать ли файлы полностью (true для чистой генерации)
// - platform: целевая платформа MySQL для совместимости
$options = array(
    'regenerate' => true,           // Пересоздаём все файлы модели
    'class_extension' => 'xPDOObject',  // Базовый класс для совместимости с MODX 2.8.8
    'class_overwrite' => true,      // Полная перезапись файлов
    'platform' => 'mysql'           // Целевая СУБД
);

echo "Начало генерации классов модели...\n";

// Генерируем классы модели из XML-схемы
// generateModel() возвращает количество созданных классов
$count = $generator->generateModel(
    $schemaFile,      // Путь к XML-схеме
    $modelPath,       // Куда сохранять сгенерированные файлы
    $options          // Параметры генерации
);

if ($count === false) {
    echo "Ошибка при генерации модели!\n";
    echo "Проверьте права доступа к директории: {$modelPath}\n";
    exit(1);
}

echo "\nУспешно сгенерировано классов: {$count}\n";

// Выводим список сгенерированных файлов для проверки
echo "\nСгенерированные файлы:\n";
$modelDir = $modelPath . 'tourcards/';
if (is_dir($modelDir)) {
    $files = scandir($modelDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'php') {
            echo "  - {$file}\n";
        }
    }
}

// Закомментированный лог для отладки (активируется при необходимости)
// $modx->log(modX::LOG_LEVEL_INFO, "Модель TourCards успешно сгенерирована. Классов: {$count}");

echo "\n=== Генерация завершена ===\n";
echo "\nСледующие шаги:\n";
echo "1. Проверьте сгенерированные файлы в: {$modelDir}\n";
echo "2. При необходимости доработайте класс TourCard вручную (методы, логика)\n";
echo "3. Запустите установку компонента для создания таблиц в БД\n";
echo "   (resolve.tables.php создаст таблицы автоматически)\n\n";
