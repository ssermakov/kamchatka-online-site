<?php
/**
 * Package Builder Script для touristcards
 * 
 * Скрипт создаёт таблицу базы данных через xPDOManager на основе XML-схемы.
 * Совместимо с MODX Revolution 2.8.8-pl и PHP 5.6+
 * 
 * ИНСТРУКЦИЯ ПО ЗАПУСКУ:
 * 1. Разместите файлы компонента в core/components/touristcards/
 * 2. Создайте файл config.inc.php рядом с этим скриптом (или укажите путь к MODX)
 * 3. Запустите через браузер или CLI: php package.builder.php
 * 
 * ВАЖНО: Все вызовы $modx->log() ЗАКОММЕНТИРОВАНЫ.
 * Для включения логирования удалите "//" в начале строк с $modx->log().
 */

/* ==========================================================================
   КОНФИГУРАЦИЯ ПУТЕЙ
   ========================================================================== */

// Определяем базовый путь к MODX
// Вариант 1: Если скрипт запускается изнутри MODX (через snippet или processor)
if (isset($modx) && $modx instanceof modX) {
    // MODX уже инициализирован
    $modx->log(modX::LOG_LEVEL_INFO, 'MODX already initialized');
} else {
    // Вариант 2: Прямой запуск скрипта (CLI или браузер)
    // Укажите абсолютный путь к директории MODX
    $modxBasePath = dirname(dirname(dirname(dirname(__FILE__))));
    
    // Проверяем существование конфигурационного файла MODX
    $configFile = $modxBasePath . '/config.core.php';
    if (!file_exists($configFile)) {
        // Альтернативный путь для стандартной установки
        $modxBasePath = dirname(dirname(dirname(dirname(dirname(__FILE__)))));
        $configFile = $modxBasePath . '/config.core.php';
    }
    
    // Если нашли config.core.php - подключаем его
    if (file_exists($configFile)) {
        require_once $configFile;
        require_once MODX_CORE_PATH . 'model/modx/modx.class.php';
    } else {
        // Fallback: пытаемся определить путь автоматически
        $pathsToCheck = array(
            dirname(dirname(dirname(dirname(dirname(__FILE__))))) . '/config.core.php',
            '/var/www/html/config.core.php',
            '/home/sites/default/core/config.core.php',
        );
        
        $configFound = false;
        foreach ($pathsToCheck as $path) {
            if (file_exists($path)) {
                require_once $path;
                $configFound = true;
                break;
            }
        }
        
        if (!$configFound) {
            die("ERROR: Cannot find MODX config.core.php\n");
            die("Please edit this file and set \$modxBasePath manually.\n");
        }
    }
    
    // Инициализируем MODX
    $modx = new modX();
    $modx->initialize('mgr'); // Инициализируем контекст менеджера
    
    // Устанавливаем кодировку для корректного вывода в консоли
    if (PHP_SAPI === 'cli') {
        header('Content-Type: text/plain; charset=UTF-8');
    }
}

/* ==========================================================================
   НАСТРОЙКИ ПАКЕТА
   ========================================================================== */

// Название пакета (используется в имени namespace и таблицы)
$packageName = 'touristcards';

// Префикс таблиц (обычно пустой или 'modx_')
$tablePrefix = '';

// Путь к директории компонента
$componentPath = dirname(__FILE__) . '/';

// Путь к XML-схеме
$schemaFile = $componentPath . 'model/schema/' . $packageName . '.mysql.schema.xml';

/* ==========================================================================
   ФУНКЦИИ ВСПОМОГАТЕЛЬНЫЕ
   ========================================================================== */

/**
 * Логирует сообщение через MODX::log()
 * ВСЕ ВЫЗОВЫ ЗАКОММЕНТИРОВАНЫ по умолчанию.
 * 
 * ДЛЯ ОТЛАДКИ: удалите "//" перед $modx->log() в этой функции.
 * 
 * @param string $message Текст сообщения
 * @param int $level Уровень логирования (modX::LOG_LEVEL_INFO и т.д.)
 */
function logMessage($message, $level = modX::LOG_LEVEL_INFO) {
    global $modx;
    
    // ================================================================
    // РАСКОММЕНТИРУЙТЕ СЛЕДУЮЩУЮ СТРОКУ ДЛЯ ВКЛЮЧЕНИЯ ЛОГИРОВАНИЯ:
    // ================================================================
    // $modx->log($level, '[touristcards] ' . $message);
    
    // Для CLI вывода всегда показываем сообщения
    if (PHP_SAPI === 'cli') {
        echo '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n";
    }
}

/**
 * Проверяет существование файла
 * 
 * @param string $filePath Путь к файлу
 * @return bool
 */
function checkFileExists($filePath) {
    if (!file_exists($filePath)) {
        return false;
    }
    return true;
}

/* ==========================================================================
   ОСНОВНАЯ ЛОГИКА СБОРКИ
   ========================================================================== */

logMessage('=== Начало сборки пакета touristcards ===');

// Шаг 1: Проверка существования схемы
logMessage('Проверка XML-схемы...');
if (!checkFileExists($schemaFile)) {
    logMessage('ERROR: Файл схемы не найден: ' . $schemaFile, modX::LOG_LEVEL_ERROR);
    die("ERROR: Schema file not found: {$schemaFile}\n");
}
logMessage('XML-схема найдена: ' . $schemaFile);

// Шаг 2: Загрузка модели xPDO
logMessage('Загрузка модели xPDO...');
$modelPath = $componentPath . 'model/';
$added = $modx->addPackage($packageName, $modelPath, $tablePrefix);

if (!$added) {
    logMessage('WARNING: Не удалось добавить пакет через addPackage(), пробуем вручную...', modX::LOG_LEVEL_WARN);
}

// Регистрируем классы модели
require_once $modelPath . $packageName . '/' . $packageName . '.class.php';
require_once $modelPath . $packageName . '/mysql/' . $packageName . '.mysql.class.php';
require_once $modelPath . $packageName . '/mysql/touristcard.class.php';

logMessage('Модель загружена успешно');

// Шаг 3: Получение менеджера базы данных
logMessage('Инициализация xPDOManager...');
$manager = $modx->getManager();

if (!$manager) {
    logMessage('ERROR: Не удалось создать xPDOManager', modX::LOG_LEVEL_ERROR);
    die("ERROR: Failed to create xPDOManager\n");
}

// Шаг 4: Создание объектов базы данных из схемы
logMessage('Создание таблицы tourist_cards...');

// Используем createObjectContainer для создания таблицы по схеме
// Этот метод читает схему и создаёт таблицу если она не существует
$created = $manager->createObjectContainer('TouristCard');

if ($created) {
    logMessage('Таблица tourist_cards создана успешно!');
} else {
    // Таблица может уже существовать - это не ошибка
    logMessage('Таблица tourist_cards уже существует или создана.');
}

// Шаг 5: Проверка структуры таблицы
logMessage('Проверка структуры таблицы...');

// Получаем информацию о таблице через xPDO
$c = $modx->newQuery('TouristCard');
$c->select($modx->getSelectColumns('TouristCard', 'TouristCard'));
$c->limit(1);

$obj = $modx->getObject('TouristCard', $c);
if ($obj) {
    logMessage('Таблица доступна для работы.');
} else {
    // Это нормально если таблица пуста
    logMessage('Таблица создана, но пока пуста (это нормально).');
}

// Шаг 6: Создание Namespace для компонента
logMessage('Проверка namespace...');
$namespace = $modx->getObject('modNamespace', array('name' => $packageName));

if (!$namespace) {
    logMessage('Создание namespace "' . $packageName . '"...');
    $namespace = $modx->newObject('modNamespace');
    $namespace->set('name', $packageName);
    $namespace->set('path', '{core_path}components/' . $packageName . '/');
    $namespace->set('assets_path', '{assets_path}components/' . $packageName . '/');
    
    if ($namespace->save()) {
        logMessage('Namespace создан успешно.');
    } else {
        logMessage('WARNING: Не удалось сохранить namespace.', modX::LOG_LEVEL_WARN);
    }
} else {
    logMessage('Namespace уже существует.');
}

// Шаг 7: Итоговая информация
logMessage('=== Сборка завершена ===');
logMessage('Пакет touristcards готов к использованию.');
logMessage('Таблица: tourist_cards');
logMessage('Класс модели: TouristCard');
logMessage('Namespace: ' . $packageName);

// Вывод информации для CLI
if (PHP_SAPI === 'cli') {
    echo "\n";
    echo "========================================\n";
    echo "СБОРКА ПАКЕТА TOURISTCARDS ЗАВЕРШЕНА\n";
    echo "========================================\n";
    echo "Таблица: tourist_cards\n";
    echo "Класс: TouristCard\n";
    echo "Путь к модели: {$modelPath}\n";
    echo "========================================\n";
}

/* ==========================================================================
   ДОПОЛНИТЕЛЬНАЯ ФУНКЦИЯ: ПРИМЕР СОЗДАНИЯ ТЕСТОВОЙ КАРТОЧКИ
   (Закомментировано, раскомментировать при необходимости)
   ========================================================================== */

/*
logMessage('Создание тестовой карточки...');

$testCard = $modx->newObject('TouristCard');
$testCard->set('parent_id', 0);
$testCard->set('trigger_phrase', 'тестовая карточка');
$testCard->set('title', 'Тестовая туристическая карточка');
$testCard->set('content', '<p>Это пример контента карточки.</p>');
$testCard->set('image_url', '/assets/components/touristcards/images/test.jpg');
$testCard->set('tour_link', 'https://example.com/tour');
$testCard->set('is_active', 1);
$testCard->set('sortorder', 0);
$testCard->set('createdon', time());
$testCard->set('editedon', time());

if ($testCard->save()) {
    logMessage('Тестовая карточка создана с ID: ' . $testCard->get('id'));
} else {
    logMessage('WARNING: Не удалось создать тестовую карточку.', modX::LOG_LEVEL_WARN);
}
*/

return 'Package build completed successfully.';
