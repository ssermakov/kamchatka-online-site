# ИНСТРУКЦИЯ ПО УСТАНОВКЕ ПАКЕТА TOURISTCARDS

## ОБЩАЯ ИНФОРМАЦИЯ

Пакет `touristcards` предназначен для хранения интерактивных карточек туристических объектов с поддержкой вложенности (карточка внутри карточки).

**Требования:**
- MODX Revolution 2.8.8-pl
- PHP 5.6+
- MySQL 5.7+ или MariaDB 10.2+
- pdoTools 2.13.3 (опционально, для сниппетов)

---

## ШАГ 1: РАЗМЕЩЕНИЕ ФАЙЛОВ

### Вариант А: Ручная установка через FTP/SFTP

1. Скопируйте директорию `touristcards` в папку компонентов вашего сайта:
   ```
   /path/to/modx/core/components/touristcards/
   ```

2. Проверьте структуру файлов:
   ```
   core/components/touristcards/
   ├── package.builder.php           # Скрипт сборки
   └── model/
       ├── schema/
       │   └── touristcards.mysql.schema.xml  # XML-схема
       └── touristcards/
           ├── touristcards.class.php
           └── mysql/
               ├── touristcards.mysql.class.php
               └── touristcard.class.php
   ```

### Вариант Б: Установка через архив

1. Создайте ZIP-архив из директории `touristcards`
2. Распакуйте архив в `core/components/` на сервере

---

## ШАГ 2: НАСТРОЙКА ПУТЕЙ В PACKAGE.BUILDER.PHP

Откройте файл `package.builder.php` и найдите строку:

```php
$modxBasePath = dirname(dirname(dirname(dirname(__FILE__))));
```

Если ваш MODX установлен в нестандартную директорию, укажите абсолютный путь:

```php
$modxBasePath = '/var/www/mysite/public_html';  // Ваш путь к MODX
```

---

## ШАГ 3: ЗАПУСК СБОРКИ ПАКЕТА

### Способ 1: Через командную строку (CLI) - РЕКОМЕНДУЕТСЯ

1. Перейдите в директорию компонента:
   ```bash
   cd /path/to/modx/core/components/touristcards/
   ```

2. Запустите скрипт сборки:
   ```bash
   php package.builder.php
   ```

3. Проверьте вывод:
   ```
   [2024-01-15 10:30:00] === Начало сборки пакета touristcards ===
   [2024-01-15 10:30:00] Проверка XML-схемы...
   [2024-01-15 10:30:00] XML-схема найдена: ...
   [2024-01-15 10:30:01] Таблица tourist_cards создана успешно!
   [2024-01-15 10:30:01] === Сборка завершена ===
   ```

### Способ 2: Через браузер

1. Откройте в браузере:
   ```
   https://yoursite.com/core/components/touristcards/package.builder.php
   ```

2. **ВАЖНО:** После установки удалите или защитите этот файл!

### Способ 3: Изнутри MODX (через Snippet)

1. Создайте новый Snippet в админке MODX с именем `InstallTouristCards`
2. Вставьте код:
   ```php
   return require MODX_CORE_PATH . 'components/touristcards/package.builder.php';
   ```
3. Запустите сниппет один раз
4. Удалите сниппет после успешной установки

---

## ШАГ 4: ПРОВЕРКА УСТАНОВКИ

### Проверка через phpMyAdmin или консоль MySQL

1. Подключитесь к базе данных MODX
2. Выполните запрос:
   ```sql
   SHOW TABLES LIKE '%tourist_cards%';
   ```

3. Проверьте структуру таблицы:
   ```sql
   DESCRIBE tourist_cards;
   ```

Ожидаемые поля:
- `id` (int, PRIMARY KEY)
- `parent_id` (int, DEFAULT 0)
- `trigger_phrase` (varchar(255), UNIQUE)
- `title` (varchar(255))
- `content` (text)
- `image_url` (varchar(512))
- `tour_link` (varchar(512))
- `is_active` (tinyint(1), DEFAULT 1)
- `sortorder` (int, DEFAULT 0)
- `createdon` (int)
- `editedon` (int)

### Проверка через админку MODX

1. Зайдите в Системное меню → Namespace'ы
2. Найдите namespace `touristcards`
3. Проверьте пути:
   - Path: `{core_path}components/touristcards/`
   - Assets Path: `{assets_path}components/touristcards/`

---

## ШАГ 5: СОЗДАНИЕ ПЕРВОЙ КАРТОЧКИ (ТЕСТИРОВАНИЕ)

### Через SQL-запрос

```sql
INSERT INTO tourist_cards (
    parent_id, 
    trigger_phrase, 
    title, 
    content, 
    image_url, 
    tour_link, 
    is_active, 
    sortorder, 
    createdon, 
    editedon
) VALUES (
    0,
    'красная площадь',
    'Красная площадь',
    '<p>Главная площадь Москвы.</p>',
    '/assets/images/red-square.jpg',
    'https://example.com/tour/red-square',
    1,
    0,
    UNIX_TIMESTAMP(),
    UNIX_TIMESTAMP()
);
```

### Через PHP (в Snippet или processor)

```php
<?php
$card = $modx->newObject('TouristCard');
$card->set('parent_id', 0);
$card->set('trigger_phrase', 'красная площадь');
$card->set('title', 'Красная площадь');
$card->set('content', '<p>Главная площадь Москвы.</p>');
$card->set('image_url', '/assets/images/red-square.jpg');
$card->set('tour_link', 'https://example.com/tour/red-square');
$card->set('is_active', 1);
$card->set('sortorder', 0);
$card->save();

echo "Карточка создана с ID: " . $card->get('id');
```

---

## ШАГ 6: ИСПОЛЬЗОВАНИЕ В КОДЕ

### Получение карточки по trigger_phrase

```php
$card = $modx->getObject('TouristCard', array(
    'trigger_phrase' => 'красная площадь',
    'is_active' => 1
));

if ($card) {
    echo $card->get('title');
    echo $card->get('content');
}
```

### Получение дочерних карточек

```php
$parent = $modx->getObject('TouristCard', 1);
$children = $parent->getChildCards();

foreach ($children as $child) {
    echo $child->get('title');
}
```

### Получение родительской карточки

```php
$child = $modx->getObject('TouristCard', 5);
$parent = $child->getParentCard();

if ($parent) {
    echo "Родитель: " . $parent->get('title');
}
```

---

## ОТЛАДКА

### Включение логирования

В файле `package.builder.php` найдите функцию `logMessage()`:

```php
function logMessage($message, $level = modX::LOG_LEVEL_INFO) {
    global $modx;
    
    // РАСКОММЕНТИРУЙТЕ СЛЕДУЮЩУЮ СТРОКУ:
    // $modx->log($level, '[touristcards] ' . $message);
    
    if (PHP_SAPI === 'cli') {
        echo '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n";
    }
}
```

Удалите `//` перед `$modx->log()` для записи логов в системный журнал MODX.

### Просмотр логов

1. Админка MODX → Отчёты → Журнал ошибок
2. Или файл: `/path/to/modx/core/cache/logs/error.log`

---

## ВОЗМОЖНЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### Ошибка: "Cannot find MODX config.core.php"

**Решение:** Отредактируйте `package.builder.php` и укажите правильный путь к MODX.

### Ошибка: "Table already exists"

**Решение:** Это не ошибка. Таблица уже была создана ранее. Продолжайте работу.

### Ошибка: "Class 'TouristCard' not found"

**Решение:** Проверьте, что все файлы модели находятся в правильных директориях:
- `model/touristcards/touristcards.class.php`
- `model/touristcards/mysql/touristcards.mysql.class.php`
- `model/touristcards/mysql/touristcard.class.php`

### Права доступа

Убедитесь, что веб-сервер имеет права на запись в:
- Директорию `core/components/`
- Директорию `core/cache/`

---

## БЕЗОПАСНОСТЬ

**ВАЖНО:** После успешной установки:

1. Удалите файл `package.builder.php` или ограничьте доступ к нему:

   ```apache
   # В .htaccess директории touristcards
   <Files "package.builder.php">
       Deny from all
   </Files>
   ```

2. Никогда не оставляйте builder-скрипт в продакшене!

---

## ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Структура базы данных

```
tourist_cards
├── id (PRIMARY KEY)
├── parent_id (FOREIGN KEY → tourist_cards.id)
├── trigger_phrase (UNIQUE INDEX)
├── title
├── content
├── image_url
├── tour_link
├── is_active (INDEX)
├── sortorder (INDEX)
├── createdon
└── editedon
```

### Поддержка вложенности

- `parent_id = 0` — корневая карточка
- `parent_id = N` — дочерняя карточка (N = ID родителя)
- Глубина вложенности не ограничена

### Совместимость

- PHP 5.6+ (используются только совместимые конструкции)
- MODX Revolution 2.8.8-pl
- xPDO 2.0+
- MySQL 5.7+ / MariaDB 10.2+

---

## ЛИЦЕНЗИЯ

Пакет распространяется под лицензией GPL v2.

## АВТОР

Создано для MODX Revolution 2.8.8-pl
