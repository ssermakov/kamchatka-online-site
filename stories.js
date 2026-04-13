(function() {
  'use strict';

  class TourStoryViewer {
    constructor() {
      this.el = document.getElementById('storyViewer');
      if (!this.el) return;

      this.progressEl = document.getElementById('storyProgress');
      this.mediaImg = document.getElementById('storyMedia');
      this.mediaVid = document.getElementById('storyVideo');
      this.textEl = document.getElementById('storyText');
      this.prevBtn = document.getElementById('storyPrev');
      this.nextBtn = document.getElementById('storyNext');
      this.closeBtn = document.getElementById('storyClose');
      this.overlay = document.querySelector('.story-viewer__overlay');
      this.loader = document.querySelector('.story-viewer__loader');

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
      this.currentInstagramUrl = '';

      this.init();
    }

    init() {
      const dataEl = document.getElementById('tour-stories-data');
      if (!dataEl) return;
      try {
        this.stories = JSON.parse(dataEl.textContent);
      } catch (e) {
        console.error('Stories: ошибка парсинга JSON', e);
        return;
      }
      if (!Array.isArray(this.stories) || this.stories.length === 0) return;
      
      this.bindEvents();
    }

    bindEvents() {
      // Обработчик открытия сторис по клику на превью
      document.addEventListener('click', (e) => {
        const item = e.target.closest('.stories-item, .stories-item__link');
        if (item && this.el) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(item.dataset.index, 10);
          if (!isNaN(idx)) this.open(idx);
        }
      });

      if (this.prevBtn) this.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
      if (this.nextBtn) this.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
      if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
      if (this.overlay) this.overlay.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (!this.el || !this.el.classList.contains('open')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
      });

      // Пауза/возобновление при взаимодействии
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
      this.el.addEventListener('touchstart', pause);
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

      // Обработчик клика на кнопку Instagram - ищем кнопку в момент клика
      this.el.addEventListener('click', (e) => {
        const instaBtn = e.target.closest('#storyInstagram');
        if (instaBtn && this.currentInstagramUrl) {
          e.stopPropagation();
          e.preventDefault();
          window.open(this.currentInstagramUrl, '_blank', 'noopener,noreferrer');
        }
      });

      // Свайпы
      this.el.addEventListener('touchstart', (e) => {
        this.touchStartY = e.touches[0].clientY;
        this.touchStartX = e.touches[0].clientX;
      });

      this.el.addEventListener('touchend', (e) => {
        const diffY = e.changedTouches[0].clientY - this.touchStartY;
        const diffX = e.changedTouches[0].clientX - this.touchStartX;
        if (Math.abs(diffY) > this.swipeThreshold && Math.abs(diffX) < Math.abs(diffY)) {
          if (diffY > 0) this.close();
        } else if (Math.abs(diffX) > this.swipeThreshold && Math.abs(diffY) < Math.abs(diffX)) {
          diffX < 0 ? this.next() : this.prev();
        }
      });
    }

    open(index) {
      if (!this.el) return;
      this.currentIndex = index;
      this.el.classList.add('open');
      this.el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      this.show();
    }

    close() {
      if (!this.el) return;
      this.el.classList.remove('open');
      this.el.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      this.stopTimer();
      if (this.mediaVid) { this.mediaVid.pause(); this.mediaVid.src = ''; }
      this.currentLink = '';
      this.currentInstagramUrl = '';
      
      // Скрываем кнопку Instagram при закрытии
      const instagramBtn = document.getElementById('storyInstagram');
      if (instagramBtn) {
        instagramBtn.classList.add('hidden');
        instagramBtn.removeAttribute('href');
      }
    }

    show() {
      this.stopTimer();
      const story = this.stories[this.currentIndex];
      if (!story) return;

      // Проверяем наличие кнопки Instagram (на случай если она не была найдена в init)
      const instagramBtn = document.getElementById('storyInstagram');
      console.log('DEBUG: instagramBtn найден в show()?', !!instagramBtn);

      if (this.loader) this.loader.classList.add('active');

      const rawUrl = story.url || '';
      const fixedUrl = (rawUrl.startsWith('http') || rawUrl.startsWith('/')) ? rawUrl : '/' + rawUrl;

      this.duration = story.type === 'video' ? 0 : (parseInt(story.duration, 10) || 5000);
      this.elapsed = 0;
      this.currentLink = story.link_url || '';
      this.currentInstagramUrl = story.instagram_url || '';

      // Обновляем видимость кнопки Instagram для текущей сторис
      if (instagramBtn) {
        const hasUrl = !!this.currentInstagramUrl && this.currentInstagramUrl.trim() !== '';
        console.log('DEBUG Instagram:', { 
          currentInstagramUrl: this.currentInstagramUrl, 
          hasUrl: hasUrl, 
          btnExists: !!instagramBtn 
        });
        if (hasUrl) {
          instagramBtn.classList.remove('hidden');
          instagramBtn.href = this.currentInstagramUrl;
        } else {
          instagramBtn.classList.add('hidden');
          instagramBtn.removeAttribute('href');
        }
      }

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
          this.mediaVid.removeEventListener('canplay', onReady);
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
    }

    next() {
      if (this.currentIndex < this.stories.length - 1) { this.currentIndex++; this.show(); }
      else this.close();
    }

    prev() {
      if (this.currentIndex > 0) { this.currentIndex--; this.show(); }
    }

    startTimer() {
      this.isPaused = false;
      this.startTime = Date.now() - this.elapsed;

      if (this.mediaVid && this.mediaVid.classList.contains('active')) {
        this.mediaVid.ontimeupdate = () => {
          if (!this.isPaused) {
            this.elapsed = this.mediaVid.currentTime * 1000;
            this.updateProgressUI();
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
      const fixedUrl = nextUrl.startsWith('http') || nextUrl.startsWith('/') ? nextUrl : '/' + nextUrl;
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
  }

  document.addEventListener('DOMContentLoaded', () => new TourStoryViewer());
})();