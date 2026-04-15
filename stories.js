(function() {
  'use strict';

  class TourStoryViewer {
    constructor() {
      this.el = document.getElementById('storyViewer');
      if (!this.el) return;

      // Инициализация элементов (исправлены пробелы в ID из исходника)
      this.progressEl = document.getElementById('storyProgress');
      this.mediaImg   = document.getElementById('storyMedia');
      this.mediaVid   = document.getElementById('storyVideo');
      this.textEl     = document.getElementById('storyText');
      this.prevBtn    = document.getElementById('storyPrev');
      this.nextBtn    = document.getElementById('storyNext');
      this.closeBtn   = document.getElementById('storyClose');
      this.instagramBtn = document.getElementById('storyInstagramBtn');
      this.overlay    = this.el.querySelector('.story-viewer__overlay');
      this.loader     = this.el.querySelector('.story-viewer__loader');

      // Состояние
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
      this._triggerEl = null; // ♿ Для возврата фокуса

      // 📊 Метрика
      this.ymCounterId = 99999999; // ⚠️ ЗАМЕНИТЕ на ваш ID счётчика
      this.viewedStories = new Set();
      this.currentBlock = '';

      this.bindEvents();
      this.loadData('tour-stories-data'); // Загрузка общего JSON при старте
    }

    bindEvents() {
      // Делегирование клика на превью
      document.addEventListener('click', (e) => {
        const item = e.target.closest('.stories-item, .stories-item__link');
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();

        this._triggerEl = item; // ♿ Сохраняем элемент для возврата фокуса
        const block = item.dataset.block;
        const idx = parseInt(item.dataset.index, 10);

        if (block && !isNaN(idx)) this.open(block, idx);
        else if (!isNaN(idx)) this.open(idx);
      }, true);

      if (this.prevBtn) this.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
      if (this.nextBtn) this.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
      if (this.overlay) this.overlay.addEventListener('click', () => this.close());

      if (this.instagramBtn) {
        this.instagramBtn.addEventListener('click', (e) => e.stopPropagation());
      }

      document.addEventListener('keydown', (e) => {
        if (!this.el || !this.el.classList.contains('open')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
      });

      // Пауза/Старт
      const pause = () => { this.isPaused = true; if (this.mediaVid && !this.mediaVid.paused) this.mediaVid.pause(); };
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

      if (this.textEl) {
        this.textEl.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.currentLink) window.open(this.currentLink, '_blank', 'noopener,noreferrer');
        });
      }

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

    loadData(jsonId) {
      const el = document.getElementById(jsonId);
      if (el) {
        try { this.stories = JSON.parse(el.textContent); } catch (e) { console.error('JSON parse error:', e); }
      }
    }

    open(blockOrIndex, index) {
      if (typeof blockOrIndex === 'number') {
        this.currentBlock = '';
        this.currentIndex = blockOrIndex;
      } else {
        this.currentBlock = blockOrIndex; // 🔍 Для сегментации в Метрике
        this.loadData('tour-stories-data-' + blockOrIndex);
        this.currentIndex = index;
      }

      this.el.classList.add('open');
      this.el.setAttribute('aria-hidden', 'false');
      this.el.setAttribute('role', 'dialog'); // ♿ Семантика модалки
      this.el.setAttribute('aria-modal', 'true');
      document.body.style.overflow = 'hidden';
      
      this.show();
    }

    close() {
      if (!this.el) return;
      this.el.classList.remove('open');
      this.el.setAttribute('aria-hidden', 'true');
      this.el.removeAttribute('role');
      this.el.removeAttribute('aria-modal');
      document.body.style.overflow = '';
      
      this.stopTimer();
      if (this.mediaVid) { this.mediaVid.pause(); this.mediaVid.src = ''; }
      this.currentLink = '';
      
      // ♿ Возвращаем фокус на элемент, открывший сторис
      if (this._triggerEl) this._triggerEl.focus();
    }

    show() {
      this.stopTimer();
      const story = this.stories[this.currentIndex];
      if (!story) { this.close(); return; }

      if (this.loader) this.loader.classList.add('active');

      const rawUrl = story.url || '';
      const fixedUrl = (rawUrl.startsWith('http') || rawUrl.startsWith('/')) ? rawUrl : '/' + rawUrl;

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

        const hideAndStart = () => { if (this.loader) this.loader.classList.remove('active'); this.startTimer(); };
        if (this.mediaImg.complete && this.mediaImg.naturalWidth > 0) hideAndStart();
        else {
          this.mediaImg.onload = hideAndStart;
          this.mediaImg.onerror = hideAndStart;
        }
      }

      this.updateProgressUI();
      this.preloadNext();

      // 📊 Отправка цели в Яндекс.Метрику
      this.trackView(story);
    }

    next() { if (this.currentIndex < this.stories.length - 1) { this.currentIndex++; this.show(); } else { this.close(); } }
    prev() { if (this.currentIndex > 0) { this.currentIndex--; this.show(); } }

    startTimer() {
      this.isPaused = false;
      this.startTime = Date.now() - this.elapsed;
      if (this.mediaVid && this.mediaVid.classList.contains('active')) {
        this.mediaVid.ontimeupdate = () => { if (!this.isPaused) { this.elapsed = this.mediaVid.currentTime * 1000; this.updateProgressUI(); } };
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
      const next = this.stories[this.currentIndex + 1];
      if (!next) return;
      const url = next.url.startsWith('http') || next.url.startsWith('/') ? next.url : '/' + next.url;
      if (next.type === 'image') { new Image().src = url; }
      else { const v = document.createElement('video'); v.src = url; v.preload = 'metadata'; }
    }

    stopTimer() {
      this.isPaused = true;
      if (this.progressFrame) cancelAnimationFrame(this.progressFrame);
      if (this.mediaVid) this.mediaVid.ontimeupdate = null;
    }

    /** 📊 Яндекс.Метрика: отслеживание просмотра */
    trackView(story) {
      const key = `${this.currentBlock || 'global'}:${this.currentIndex}`;
      if (this.viewedStories.has(key)) return; // Дедупликация
      this.viewedStories.add(key);

      if (typeof ym === 'function') {
        ym(this.ymCounterId, 'reachGoal', 'story_viewed', {
          block: this.currentBlock,
          index: this.currentIndex,
          type: story.type,
          has_link: !!story.link_url
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => new TourStoryViewer());
})();
