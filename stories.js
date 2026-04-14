(function() {
  'use strict';

  class TourStoryViewer {
    constructor() {
      console.group('[StoryViewer] 🚀 Инициализация');
      
      this.el = document.getElementById('storyViewer');
      if (!this.el) {
        console.error('❌ ОШИБКА: Элемент #storyViewer не найден в DOM');
        console.log('💡 Возможные причины:');
        console.log('   1. Шаблон tpl.stories.viewer.txt не вызван на странице');
        console.log('   2. JS загружается до рендеринга HTML');
        console.log('   3. Кэш MODX требует очистки');

        const allViewers = document.querySelectorAll('.story-viewer');
        console.log('🔍 Найдено элементов .story-viewer:', allViewers.length);
        allViewers.forEach((v, i) => {
          console.log(`   [${i}]`, v.id, v.innerHTML.substring(0, 100));
        });

        console.groupEnd();
        return;
      }
      console.log('✅ #storyViewer найден');

      // Инициализация элементов
      this.progressEl = document.getElementById('storyProgress');
      this.mediaImg   = document.getElementById('storyMedia');
      this.mediaVid   = document.getElementById('storyVideo');
      this.textEl     = document.getElementById('storyText');
      this.prevBtn    = document.getElementById('storyPrev');
      this.nextBtn    = document.getElementById('storyNext');
      this.closeBtn   = document.getElementById('storyClose');
      this.instagramBtn = document.getElementById('storyInstagramBtn');
      this.overlay    = document.querySelector('.story-viewer__overlay');
      this.loader     = document.querySelector('.story-viewer__loader');

      // Логирование элементов
      console.log('🔍 Проверка элементов viewer:', {
        instagramBtn: this.instagramBtn ? '✅ найден' : '❌ НЕ НАЙДЕН',
        loader: this.loader ? '✅ найден' : '❌ НЕ НАЙДЕН',
        progressEl: this.progressEl ? '✅ найден' : '❌ НЕ НАЙДЕН'
      });

      // Фоллбэк для Instagram кнопки
      if (!this.instagramBtn) {
        console.log('🔄 Попытка найти кнопку альтернативными методами...');
        this.instagramBtn = this.el.querySelector('#storyInstagramBtn') || 
                            this.el.querySelector('.story-viewer__instagram-btn');
        console.log('   Альтернативный поиск:', this.instagramBtn ? '✅ найден' : '❌ НЕ НАЙДЕН');
      }

      // Состояние просмотра
      this.stories = [];
      this.currentIndex = 0;
      this.progressFrame = null;
      this.isPaused = false;
      this.duration = 0;
      this.startTime = 0;
      this.elapsed = 0;
      this.touchStartY = 0;
      this.touchStartX = 0;
      this.swipeThreshold = 50;
      this.currentLink = '';

      // 🔑 Yandex.Metrica настройки
      this.ymCounterId = 12345678; // ⚠️ ЗАМЕНИТЕ на номер вашего счётчика Метрики
      this.viewedStories = new Set();
      this.currentBlock = '';

      this.bindEvents();
      console.log('🎯 Обработчики событий привязаны');

      // Инициализация данных
      const dataEl = document.getElementById('tour-stories-data');
      if (dataEl) {
        try {
          this.stories = JSON.parse(dataEl.textContent);
          console.log('📦 Успешный парсинг JSON. Количество историй:', this.stories.length);
        } catch (e) {
          console.error('❌ ОШИБКА парсинга JSON:', e);
        }
      }

      console.groupEnd();
    }

    bindEvents() {
      // Делегирование клика на превью
      document.addEventListener('click', (e) => {
        const item = e.target.closest('.stories-item, .stories-item__link');
        if (!item) return;

        e.preventDefault();
        e.stopPropagation();

        const block = item.dataset.block;
        const idx = parseInt(item.dataset.index, 10);

        console.group('[StoryViewer] 🖱️ Клик по сторис');
        console.log('📍 Элемент:', item);
        console.log('🏷️ data-block:', block || '❌ НЕ УКАЗАН');
        console.log('🔢 data-index:', idx);

        if (block && !isNaN(idx)) {
          this.open(block, idx);
        } else if (!isNaN(idx)) {
          this.open(idx);
        } else {
          console.warn('⚠️ У кликнутого элемента отсутствуют data-block или data-index');
        }
        console.groupEnd();
      }, true);

      // Навигация
      if (this.prevBtn) this.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
      if (this.nextBtn) this.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
      if (this.overlay) this.overlay.addEventListener('click', () => this.close());

      // Кнопка Instagram
      if (this.instagramBtn) {
        this.instagramBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('🔵 Клик по кнопке Instagram зафиксирован');
        });
      }

      // Клавиатура
      document.addEventListener('keydown', (e) => {
        if (!this.el || !this.el.classList.contains('open')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
      });

      // Пауза/Старт
      const pause = () => {
        this.isPaused = true;
        if (this.mediaVid && !this.mediaVid.paused) this.mediaVid.pause();
      };
      const resume = () => {
        this.isPaused = false;
        if (this.mediaVid && this.mediaVid.classList.contains('active')) {
          if (this.mediaVid.paused) this.mediaVid.play().catch(() => {});
        } else {
          this.startTime = Date.now() - this.elapsed;
          this.progressFrame = requestAnimationFrame(() => this.tick());
        }
      };

      this.el.addEventListener('mousedown', pause);
      this.el.addEventListener('touchstart', pause, { passive: true });
      this.el.addEventListener('mouseup', resume);
      this.el.addEventListener('mouseleave', resume);
      this.el.addEventListener('touchend', resume);
      this.el.addEventListener('touchcancel', resume);

      // Клик по тексту (ссылка)
      if (this.textEl) {
        this.textEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.currentLink) window.open(this.currentLink, '_blank', 'noopener,noreferrer');
        });
      }

      // Свайпы
      this.el.addEventListener('touchstart', (e) => {
        this.touchStartY = e.touches[0].clientY;
        this.touchStartX = e.touches[0].clientX;
      }, { passive: true });

      this.el.addEventListener('touchend', (e) => {
        const diffY = e.changedTouches[0].clientY - this.touchStartY;
        const diffX = e.changedTouches[0].clientX - this.touchStartX;
        if (Math.abs(diffY) > this.swipeThreshold && Math.abs(diffX) < Math.abs(diffY)) {
          if (diffY > 0) this.close();
        } else if (Math.abs(diffX) > this.swipeThreshold && Math.abs(diffY) < Math.abs(diffX)) {
          diffX < 0 ? this.next() : this.prev();
        }
      }, { passive: true });
    }

    open(blockOrIndex, index) {
      console.group('[StoryViewer] 🔓 open()');

      if (typeof blockOrIndex === 'number') {
        this.currentBlock = ''; // Сброс блока при прямом вызове по индексу
        this.currentIndex = blockOrIndex;
        this.show();
        console.groupEnd();
        return;
      }

      const [block, idx] = [blockOrIndex, index];
      this.currentBlock = block || ''; // 🔑 Сохраняем текущий блок для метрики

      console.log('📥 Запрашиваемый блок:', block);
      console.log('📥 Запрашиваемый индекс:', idx);

      const jsonId = 'tour-stories-data-' + block;
      const jsonEl = document.getElementById(jsonId);
      if (!jsonEl) {
        console.error('❌ Скрипт #' + jsonId + ' НЕ НАЙДЕН в DOM!');
        this.diagnoseMissingJson();
        console.groupEnd();
        return;
      }

      try {
        this.stories = JSON.parse(jsonEl.textContent);
        console.log('📦 Успешный парсинг JSON. Количество историй:', this.stories.length);
      } catch (err) {
        console.error('❌ ОШИБКА парсинга JSON:', err);
        console.groupEnd();
        return;
      }

      this.currentIndex = idx;
      this.el.classList.add('open');
      this.el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      
      console.groupEnd();
      this.show();
    }

    close() {
      console.log('[StoryViewer] ❌ close()');
      if (!this.el) return;
      this.el.classList.remove('open');
      this.el.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      this.stopTimer();
      if (this.mediaVid) { this.mediaVid.pause(); this.mediaVid.src = ''; }
      this.currentLink = '';
    }

    show() {
      console.group('[StoryViewer] 🎬 show()');
      this.stopTimer();
      
      const story = this.stories[this.currentIndex];
      if (!story) {
        console.error('❌ История с индексом', this.currentIndex, 'отсутствует');
        console.groupEnd();
        this.close();
        return;
      }

      if (this.loader) this.loader.classList.add('active');

      const rawUrl = story.url || '';
      const fixedUrl = (rawUrl.indexOf('http') === 0 || rawUrl.indexOf('/') === 0) ? rawUrl : '/' + rawUrl;

      this.duration = story.type === 'video' ? 0 : (parseInt(story.duration, 10) || 5000);
      this.elapsed = 0;
      this.currentLink = story.link_url || '';

      if (this.textEl) {
        this.textEl.textContent = story.text || '';
        this.textEl.classList.toggle('visible', !!story.text);
        this.textEl.classList.toggle('has-link', !!this.currentLink);
      }

      if (story.type === 'video' && this.mediaVid) {
        if (this.mediaImg) this.mediaImg.classList.remove('active');
        this.mediaVid.classList.add('active');
        this.mediaVid.src = fixedUrl;
        this.mediaVid.load();
        this.mediaVid.muted = true;
        this.mediaVid.playsInline = true;

        const onReady = () => {
          if (this.loader) this.loader.classList.remove('active');
          if (this.mediaVid.duration) {
            this.duration = this.mediaVid.duration * 1000;
            this.startTime = Date.now() - this.elapsed;
          }
          this.startTimer();
        };

        if (this.mediaVid.readyState >= 3) onReady();
        else this.mediaVid.addEventListener('canplay', onReady, { once: true });

        this.mediaVid.play().catch(() => {});
        this.mediaVid.addEventListener('ended', () => this.next(), { once: true });
      } else if (this.mediaImg) {
        if (this.mediaVid) { this.mediaVid.pause(); this.mediaVid.classList.remove('active'); }
        this.mediaImg.classList.add('active');
        this.mediaImg.src = fixedUrl;

        const hideLoaderAndStart = () => {
          if (this.loader) this.loader.classList.remove('active');
          this.startTimer();
        };

        if (this.mediaImg.complete && this.mediaImg.naturalWidth > 0) hideLoaderAndStart();
        else {
          this.mediaImg.onload = hideLoaderAndStart;
          this.mediaImg.onerror = () => {
            if (this.loader) this.loader.classList.remove('active');
            this.startTimer();
          };
        }
      }

      this.updateProgressUI();
      this.preloadNext();
      
      // 🔑 Отправка цели в Яндекс.Метрику
      this.trackView(story);

      console.groupEnd();
    }

    next() {
      if (this.currentIndex < this.stories.length - 1) {
        this.currentIndex++;
        this.show();
      } else {
        this.close();
      }
    }

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.show();
      }
    }

    startTimer() {
      this.isPaused = false;
      this.startTime = Date.now() - this.elapsed;

      if (this.mediaVid && this.mediaVid.classList.contains('active')) {
        const self = this;
        this.mediaVid.ontimeupdate = function() {
          if (!self.isPaused) {
            self.elapsed = this.currentTime * 1000;
            self.updateProgressUI();
          }
        };
      } else {
        this.progressFrame = requestAnimationFrame(() => this.tick());
      }
    }

    tick() {
      if (this.isPaused) return;
      this.elapsed = Date.now() - this.startTime;
      this.updateProgressUI();
      if (this.duration > 0 && this.elapsed >= this.duration) this.next();
      else this.progressFrame = requestAnimationFrame(() => this.tick());
    }

    updateProgressUI() {
      if (!this.progressEl) return;
      const bar = this.progressEl.querySelector('.story-viewer__progress-bar');
      if (bar) bar.style.width = (this.duration > 0 ? Math.min((this.elapsed / this.duration) * 100, 100) : 0) + '%';
    }

    preloadNext() {
      const nextIdx = this.currentIndex + 1;
      if (!this.stories[nextIdx]) return;
      const nextUrl = this.stories[nextIdx].url;
      if (!nextUrl) return;
      const fixedUrl = (nextUrl.indexOf('http') === 0 || nextUrl.indexOf('/') === 0) ? nextUrl : '/' + nextUrl;
      
      if (this.stories[nextIdx].type === 'image') {
        const img = new Image(); img.src = fixedUrl;
      } else {
        const vid = document.createElement('video');
        vid.src = fixedUrl; vid.preload = 'metadata'; vid.playsInline = true;
      }
    }

    stopTimer() {
      this.isPaused = true;
      if (this.progressFrame) cancelAnimationFrame(this.progressFrame);
      if (this.mediaVid) this.mediaVid.ontimeupdate = null;
    }

    diagnoseMissingJson() {
      console.group('🔍 Диагностический скан DOM');
      const allScripts = document.querySelectorAll('script[id^="tour-stories-data-"]');
      if (allScripts.length === 0) {
        console.warn('⚠️ В странице ОТСУТСТВУЮТ любые скрипты с данными сторис.');
        console.log('💡 Проверьте: 1) Сниппет сохранён? 2) Кэш MODX очищен? 3) Вызов в шаблоне верный?');
      } else {
        console.log('✅ Найдены следующие блоки данных в DOM:');
        allScripts.forEach(s => {
          try {
            const data = JSON.parse(s.textContent);
            console.log(`📜 ID: ${s.id} | Записей: ${data.length}`);
          } catch {
            console.warn(`❌ Сломанный JSON в #${s.id}`);
          }
        });
      }
      console.groupEnd();
    }

    /**
     * 🔑 Отправка цели в Яндекс.Метрику
     * Защищена от дубликатов (Set) и передаёт параметры для сегментации
     */
    trackView(story) {
      const key = `${this.currentBlock || 'global'}:${this.currentIndex}`;
      
      // Дедупликация: цель сработает только при первом показе этой сторис за сессию
      if (this.viewedStories.has(key)) return;
      this.viewedStories.add(key);

      if (typeof ym === 'function') {
        ym(this.ymCounterId, 'reachGoal', 'story_viewed', {
          block: this.currentBlock,
          index: this.currentIndex,
          type: story.type,
          has_link: !!story.link_url,
          duration_ms: this.duration
        });
        console.log('[StoryViewer] 📊 Yandex.Metrica: story_viewed отправлена', { key });
      } else {
        console.warn('[StoryViewer] ⚠️ ym() не найден. Убедитесь, что код Метрики подключён на странице.');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    console.log('[StoryViewer] 🟢 DOMContentLoaded. Запуск класса...');
    new TourStoryViewer();
  });
})();
