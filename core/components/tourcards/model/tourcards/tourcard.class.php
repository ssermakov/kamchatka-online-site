<?php
/**
 * Класс TourCard для компонента TourCards
 * 
 * Представляет карточку тура с возможностью вложенности через parent_id.
 * Сгенерирован автоматически на основе XML-схемы xPDO.
 * 
 * @package tourcards
 * @subpackage model
 * 
 * Пример использования:
 *   $card = $modx->newObject('TourCard');
 *   $card->set('trigger_phrase', 'Экскурсия по Москве');
 *   $card->save();
 * 
 *   // Получение родителя:
 *   $parent = $card->getOne('Parent');
 * 
 *   // Получение дочерних элементов:
 *   $children = $card->getMany('Children');
 */
class TourCard extends xPDOObject
{
    /**
     * Переопределение конструктора для инициализации временных меток
     * 
     * @param xPDO &$xpdo Экземпляр xPDO
     */
    public function __construct(& $xpdo)
    {
        parent::__construct($xpdo);
        
        // Устанавливаем временные метки при создании нового объекта
        // Это гарантирует, что created_at и updated_at будут заполнены
        $this->set('created_at', date('Y-m-d H:i:s'));
        $this->set('updated_at', date('Y-m-d H:i:s'));
    }
    
    /**
     * Автоматическое обновление updated_at при сохранении
     * 
     * Переопределяем метод save() для автоматического обновления
     * временной метки updated_at при каждом изменении записи.
     * 
     * @param boolean $cacheFlag Флаг кэширования (не используется в данной реализации)
     * @return boolean Результат сохранения
     */
    public function save($cacheFlag = true)
    {
        // Обновляем updated_at только для существующих записей
        // Для новых записей updated_at уже установлен в конструкторе
        if ($this->isNew()) {
            $this->set('created_at', date('Y-m-d H:i:s'));
        }
        $this->set('updated_at', date('Y-m-d H:i:s'));
        
        return parent::save($cacheFlag);
    }
    
    /**
     * Получение родительской карточки
     * 
     * Удобный метод для получения родителя с проверкой существования.
     * Использует агрегатное отношение Parent, определённое в схеме.
     * 
     * @return TourCard|null Родительская карточка или null если нет родителя
     */
    public function getParent()
    {
        return $this->getOne('Parent');
    }
    
    /**
     * Получение дочерних карточек
     * 
     * Возвращает коллекцию дочерних карточек, отсортированных по позиции.
     * Использует композитное отношение Children из схемы.
     * 
     * @param integer $limit Максимальное количество дочерних элементов
     * @return array Массив объектов TourCard
     */
    public function getChildren($limit = 0)
    {
        $c = $this->xpdo->newQuery('TourCard');
        $c->where(array(
            'parent_id' => $this->get('id'),
            'active' => true
        ));
        $c->sortby('position', 'ASC');
        
        if ($limit > 0) {
            $c->limit($limit);
        }
        
        return $this->xpdo->getCollection('TourCard', $c);
    }
    
    /**
     * Проверка активности карточки
     * 
     * @return boolean true если карточка активна
     */
    public function isActive()
    {
        return (boolean) $this->get('active');
    }
    
    /**
     * Получение полного URL изображения
     * 
     * Если изображение задано относительным путём, добавляет базовый URL сайта.
     * 
     * @return string Полный URL изображения или пустая строка
     */
    public function getImageUrl()
    {
        $image = $this->get('image');
        
        if (empty($image)) {
            return '';
        }
        
        // Проверяем, является ли путь абсолютным URL
        if (strpos($image, 'http://') === 0 || strpos($image, 'https://') === 0) {
            return $image;
        }
        
        // Добавляем базовый URL сайта для относительных путей
        $baseUrl = $this->xpdo->getOption('site_url', null, '/');
        return rtrim($baseUrl, '/') . '/' . ltrim($image, '/');
    }
}
