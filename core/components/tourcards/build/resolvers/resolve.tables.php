<?php
/**
 * Резолвер для создания таблиц базы данных при установке компонента TourCards
 * 
 * Этот файл вызывается автоматически установщиком MODX в процессе установки/обновления.
 * Создаёт таблицы на основе xPDO-схемы, если они ещё не существуют.
 * 
 * @package tourcards
 * @subpackage build
 * 
 * @param xPDOObject &$object Объект транспорта (передаётся установщиком)
 * @param string $options Опции установки (JSON)
 * 
 * @return boolean true при успешном создании таблиц
 */

// Получаем экземпляр xPDO из объекта транспорта
$xpdo =& $object->xpdo;

// Устанавливаем уровень логирования для отладки
// В продакшене можно закомментировать или установить LOG_LEVEL_ERROR
$level = $xpdo->getLogLevel();
$xpdo->setLogLevel(modX::LOG_LEVEL_INFO);

// Определяем целевую директорию для логов (ECHO для видимости при установке)
$xpdo->setLogTarget('ECHO');

$xpdo->log(modX::LOG_LEVEL_INFO, '=== Начало создания таблиц TourCards ===');

// Путь к XML-схеме компонента
// Используем dirname(__DIR__) для получения пути к корню компонента
$schemaPath = dirname(dirname(__FILE__)) . '/model/schema/tourcards.mysql.schema.xml';

// Проверяем существование файла схемы
if (!file_exists($schemaPath)) {
    $xpdo->log(modX::LOG_LEVEL_ERROR, "Файл схемы не найден: {$schemaPath}");
    $xpdo->setLogLevel($level);
    return false;
}

$xpdo->log(modX::LOG_LEVEL_INFO, "Найдена схема: {$schemaPath}");

// Загружаем схему в формате XML
$schema = simplexml_load_file($schemaPath);
if (!$schema) {
    $xpdo->log(modX::LOG_LEVEL_ERROR, "Не удалось загрузить XML-схему");
    $xpdo->setLogLevel($level);
    return false;
}

// Получаем префикс таблиц из конфигурации MODX
// Это важно для правильной работы в мультидоменных установках
$tablePrefix = $xpdo->getOption('table_prefix', null, 'modx_');

// Имя таблицы из схемы (без префикса)
$tableName = 'tourcards_cards';
$fullTableName = $tablePrefix . $tableName;

$xpdo->log(modX::LOG_LEVEL_INFO, "Проверка таблицы: {$fullTableName}");

// Проверяем, существует ли уже таблица
// Используем xPDO Manager для проверки существования таблицы
$manager = $xpdo->getManager();

// Получаем имя класса модели
$className = 'TourCard';

// Проверяем существование таблицы через SQL-запрос к INFORMATION_SCHEMA
// Это более надёжный способ для MySQL 5.7+/8.0
$dbName = $xpdo->getConfig('dbname');
$sql = "SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = '{$dbName}' 
        AND table_name = '{$fullTableName}'";
$stmt = $xpdo->query($sql);
$tableExists = $stmt && (int)$stmt->fetchColumn() > 0;

if ($tableExists) {
    $xpdo->log(modX::LOG_LEVEL_INFO, "Таблица {$fullTableName} уже существует. Пропускаем создание.");
    
    // Закомментированный лог для отладки структуры таблицы
    // $xpdo->log(modX::LOG_LEVEL_INFO, "Структура таблицы проверена и актуальна");
} else {
    $xpdo->log(modX::LOG_LEVEL_INFO, "Создание таблицы {$fullTableName}...");
    
    // Создаём таблицу используя xPDO createTable()
    // Это предпочтительный метод для совместимости с разными версиями MySQL
    $created = $manager->createTable($className, array(
        'engine' => 'InnoDB',
        'charset' => 'utf8mb4',
        'collate' => 'utf8mb4_unicode_ci'
    ));
    
    // Альтернативный вариант: создание через прямой SQL (если createTable не работает)
    // Раскомментируйте, если возникнут проблемы с createTable():
    /*
    $sql = "CREATE TABLE `{$fullTableName}` (
        `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
        `trigger_phrase` VARCHAR(255) NOT NULL DEFAULT '',
        `image` VARCHAR(512) DEFAULT NULL,
        `text` TEXT,
        `tour_link` VARCHAR(512) DEFAULT NULL,
        `active` TINYINT(1) NOT NULL DEFAULT 1,
        `position` INT(11) NOT NULL DEFAULT 0,
        `parent_id` INT(11) UNSIGNED DEFAULT NULL,
        `created_at` DATETIME DEFAULT NULL,
        `updated_at` DATETIME DEFAULT NULL,
        PRIMARY KEY (`id`),
        UNIQUE KEY `trigger_phrase` (`trigger_phrase`),
        KEY `parent_id` (`parent_id`),
        KEY `active_position` (`active`, `position`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $created = $xpdo->exec($sql);
    */
    
    if ($created) {
        $xpdo->log(modX::LOG_LEVEL_INFO, "Таблица {$fullTableName} успешно создана!");
        
        // Закомментированный детальный лог для отладки
        // $xpdo->log(modX::LOG_LEVEL_INFO, "Таблица создана с полями: id, trigger_phrase, image, text, tour_link, active, position, parent_id, created_at, updated_at");
        // $xpdo->log(modX::LOG_LEVEL_INFO, "Индексы: PRIMARY KEY (id), UNIQUE (trigger_phrase), INDEX (parent_id), INDEX (active, position)");
    } else {
        $xpdo->log(modX::LOG_LEVEL_ERROR, "Ошибка при создании таблицы {$fullTableName}");
        $xpdo->setLogLevel($level);
        return false;
    }
}

// Восстанавливаем исходный уровень логирования
$xpdo->setLogLevel($level);

$xpdo->log(modX::LOG_LEVEL_INFO, '=== Завершение создания таблиц TourCards ===');

// Возвращаем true для продолжения установки
return true;
