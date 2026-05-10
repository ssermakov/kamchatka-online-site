<?php
/**
 * Класс модели TouristCard для работы с таблицей tourist_cards
 * 
 * Расширяет xPDOObject и предоставляет доступ к полям карточки туристического объекта.
 * Совместимо с MODX Revolution 2.8.8-pl и PHP 5.6+
 * 
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:
 * 
 * // Получение карточки по trigger_phrase
 * $card = $modx->getObject('TouristCard', array('trigger_phrase' => 'московский кремль'));
 * 
 * // Получение активной карточки по ID
 * $card = $modx->getObject('TouristCard', array('id' => 1, 'is_active' => 1));
 * 
 * // Получение всех дочерних карточек
 * $children = $card->getMany('Children');
 * 
 * // Получение родительской карточки
 * $parent = $card->getOne('Parent');
 * 
 * // Создание новой карточки
 * $newCard = $modx->newObject('TouristCard');
 * $newCard->set('title', 'Новая достопримечательность');
 * $newCard->save();
 */

// Требование базового класса xPDOObject
require_once dirname(dirname(dirname(__FILE__))) . '/modx/modx.class.php';

class TouristCard extends xPDOObject {
    
    /**
     * Конструктор класса
     * 
     * @param xPDO &$xpdo Ссылка на экземпляр xPDO
     */
    public function __construct(& $xpdo) {
        parent::__construct($xpdo);
    }
    
    /**
     * Получает родительскую карточку
     * 
     * @return TouristCard|null Родительская карточка или null если нет родителя
     */
    public function getParentCard() {
        return $this->getOne('Parent');
    }
    
    /**
     * Получает все дочерние карточки
     * 
     * @param array $criteria Дополнительные условия выборки
     * @return array Массив дочерних карточек
     */
    public function getChildCards($criteria = array()) {
        // По умолчанию получаем только активные дочерние карточки
        if (empty($criteria)) {
            $criteria = array('is_active' => 1);
        }
        
        return $this->getMany('Children', $criteria);
    }
    
    /**
     * Проверяет, является ли карточка корневой (не имеет родителя)
     * 
     * @return bool True если карточка корневая
     */
    public function isRoot() {
        $parentId = $this->get('parent_id');
        return empty($parentId) || ($parentId == 0);
    }
    
    /**
     * Проверяет, активна ли карточка
     * 
     * @return bool True если карточка активна
     */
    public function isActive() {
        return (int)$this->get('is_active') === 1;
    }
    
    /**
     * Устанавливает timestamp редактирования
     * 
     * Вызывается автоматически при сохранении изменений.
     */
    public function updateEditedOn() {
        $this->set('editedon', time());
    }
    
    /**
     * Переопределение метода save для автоматического обновления timestamp
     * 
     * @param boolean $cacheFlag Флаг кэширования
     * @return bool Результат сохранения
     */
    public function save($cacheFlag = true) {
        // Если запись не новая, обновляем editedon
        if (!$this->isNew()) {
            $this->updateEditedOn();
        } else {
            // Для новой записи устанавливаем createdon
            if (!$this->get('createdon')) {
                $this->set('createdon', time());
            }
        }
        
        return parent::save($cacheFlag);
    }
    
    /**
     * Статический метод для получения активной карточки по trigger_phrase
     * 
     * @param xPDO &$xpdo Ссылка на экземпляр xPDO
     * @param string $phrase Триггер-фраза для поиска
     * @return TouristCard|null Найденная карточка или null
     */
    public static function getActiveByPhrase(& $xpdo, $phrase) {
        $c = $xpdo->newQuery('TouristCard');
        $c->where(array(
            'trigger_phrase' => $phrase,
            'is_active' => 1,
        ));
        
        return $xpdo->getObject('TouristCard', $c);
    }
    
    /**
     * Статический метод для получения всех активных корневых карточек
     * 
     * @param xPDO &$xpdo Ссылка на экземпляр xPDO
     * @param int $limit Максимальное количество записей
     * @param int $offset Смещение
     * @return array Массив карточек
     */
    public static function getActiveRootCards(& $xpdo, $limit = 10, $offset = 0) {
        $c = $xpdo->newQuery('TouristCard');
        $c->where(array(
            'parent_id' => 0,
            'is_active' => 1,
        ));
        $c->sortby('sortorder', 'ASC');
        $c->sortby('id', 'ASC');
        $c->limit($limit, $offset);
        
        return $xpdo->getCollection('TouristCard', $c);
    }
}
