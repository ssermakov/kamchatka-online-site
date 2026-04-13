(function() {
  'use strict';

  class TourStoryViewer {
    constructor() {
      console.log('[StoryViewer] Constructor started');
      this.el = document.getElementById('storyViewer');
      if (!this.el) {
        console.error('[StoryViewer] ERROR: Element #storyViewer not found in DOM');
        return;
      }
      console.log('[StoryViewer] Element #storyViewer found', this.el);

      this.progressEl = document.getElementById('storyProgress');
      this.mediaImg = document.getElementById('storyMedia');
      this.mediaVid = document.getElementById('storyVideo');
      this.textEl = document.getElementById('storyText');
      this.prevBtn = document.getElementById('storyPrev');
      this.nextBtn = document.getElementById('storyNext');
      this.closeBtn = document.getElementById('storyClose');
      this.instagramBtn = document.getElementById('storyInstagramBtn');
      this.overlay = document.querySelector('.story-viewer__overlay');
      this.loader = document.querySelector('.story-viewer__loader');

      console.log('[StoryViewer] Elements initialized:', {
        progressEl: !!this.progressEl,
        mediaImg: !!this.mediaImg,
        mediaVid: !!this.mediaVid,
        textEl: !!this.textEl,
        prevBtn: !!this.prevBtn,
        nextBtn: !!this.nextBtn,
        closeBtn: !!this.closeBtn,
        instagramBtn: !!this.instagramBtn,
        overlay: !!this.overlay,
        loader: !!this.loader
      });

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

      this.init();
    }

    init() {
      console.log('[StoryViewer] init() called');
      const dataEl = document.getElementById('tour-stories-data');
      if (!dataEl) {
        console.error('[StoryViewer] ERROR: Element #tour-stories-data not found');
        return;
      }
      console.log('[StoryViewer] Data element found:', dataEl);
      try {
        this.stories = JSON.parse(dataEl.textContent);
        console.log('[StoryViewer] Stories parsed successfully:', this.stories);
      } catch (e) {
        console.error('[StoryViewer] ERROR: Failed to parse JSON', e);
        return;
      }
      if (!Array.isArray(this.stories) || this.stories.length === 0) {
        console.warn('[StoryViewer] WARNING: No stories found or invalid format');
        return;
      }
      console.log('[StoryViewer] Stories array valid, count:', this.stories.length);
      this.bindEvents();
      console.log('[StoryViewer] init() completed');
    }

    bindEvents() {
      console.log('[StoryViewer] bindEvents() called');
      document.addEventListener('click', (e) => {
        const item = e.target.closest('.stories-item, .stories-item__link');
        if (item && this.el) {
          e.preventDefault();
          e.stopPropagation();
          const idx = parseInt(item.dataset.index, 10);
          console.log('[StoryViewer] Click on story item, index:', idx);
          if (!isNaN(idx)) this.open(idx);
        }
      }, true);

      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
        console.log('[StoryViewer] Prev button event bound');
      } else {
        console.warn('[StoryViewer] WARNING: Prev button not found');
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
        console.log('[StoryViewer] Next button event bound');
      } else {
        console.warn('[StoryViewer] WARNING: Next button not found');
      }
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.close());
        console.log('[StoryViewer] Close button event bound');
      } else {
        console.warn('[StoryViewer] WARNING: Close button not found');
      }
      if (this.overlay) {
        this.overlay.addEventListener('click', () => this.close());
        console.log('[StoryViewer] Overlay click event bound');
      } else {
        console.warn('[StoryViewer] WARNING: Overlay not found');
      }

      document.addEventListener('keydown', (e) => {
        if (!this.el || !this.el.classList.contains('open')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowRight') this.next();
        if (e.key === 'ArrowLeft') this.prev();
      });
      console.log('[StoryViewer] Keyboard events bound');

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
      console.log('[StoryViewer] Pause/resume events bound');

      if (this.textEl) {
        this.textEl.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('[StoryViewer] Text clicked, link:', this.currentLink);
          if (this.currentLink) window.open(this.currentLink, '_blank', 'noopener,noreferrer');
        });
        console.log('[StoryViewer] Text click event bound');
      } else {
        console.warn('[StoryViewer] WARNING: Text element not found');
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
      console.log('[StoryViewer] Touch events bound');

      // Проверка кнопки Instagram
      if (this.instagramBtn) {
        console.log('[StoryViewer] Instagram button found:', this.instagramBtn);
        console.log('[StoryViewer] Instagram button href:', this.instagramBtn.href);
      } else {
        console.error('[StoryViewer] ERROR: Instagram button #storyInstagramBtn not found!');
      }

      console.log('[StoryViewer] bindEvents() completed');
    }

    open(index) {
      console.log('[StoryViewer] open() called with index:', index);
      if (!this.el) {
        console.error('[StoryViewer] ERROR: Cannot open, element not found');
        return;
      }
      this.currentIndex = index;
      this.el.classList.add('open');
      this.el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      console.log('[StoryViewer] Viewer opened, classes added');
      this.show();
    }

    close() {
      console.log('[StoryViewer] close() called');
      if (!this.el) return;
      this.el.classList.remove('open');
      this.el.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      this.stopTimer();
      if (this.mediaVid) { this.mediaVid.pause(); this.mediaVid.src = ''; }
      this.currentLink = '';
      console.log('[StoryViewer] Viewer closed');
    }

    show() {
      console.log('[StoryViewer] show() called for index:', this.currentIndex);
      this.stopTimer();
      const story = this.stories[this.currentIndex];
      if (!story) {
        console.error('[StoryViewer] ERROR: No story found at index', this.currentIndex);
        return;
      }
      console.log('[StoryViewer] Story data:', story);

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

      // Проверка видимости кнопки Instagram при показе истории
      if (this.instagramBtn) {
        console.log('[StoryViewer] Instagram button visibility check:', {
          display: window.getComputedStyle(this.instagramBtn).display,
          visibility: window.getComputedStyle(this.instagramBtn).visibility,
          opacity: window.getComputedStyle(this.instagramBtn).opacity,
          zIndex: window.getComputedStyle(this.instagramBtn).zIndex
        });
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
      console.log('[StoryViewer] show() completed');
    }

    next() {
      console.log('[StoryViewer] next() called');
      if (this.currentIndex < this.stories.length - 1) { this.currentIndex++; this.show(); }
      else this.close();
    }

    prev() {
      console.log('[StoryViewer] prev() called');
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

  console.log('[StoryViewer] Script loaded, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[StoryViewer] DOMContentLoaded fired');
    new TourStoryViewer();
  });
})();