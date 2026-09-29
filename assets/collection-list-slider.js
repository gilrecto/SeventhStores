(() => {
  customElements.whenDefined('swiper-slider').then(() => {
    if (customElements.get('collection-list-slider')) return;

    class CollectionListSlider extends customElements.get('swiper-slider') {
      connectedCallback() {
        this.abortController?.abort();
        this.abortController = new AbortController();
        const { signal } = this.abortController;
        this.viewport = this.querySelector('.swiper');
        this.options = JSON.parse(this.querySelector('[data-rail-options]').textContent);
        this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.playButton = this.querySelector('[data-rail-play]');

        this.addEventListener('focusin', (event) => {
          if (!event.target.closest('[data-rail-play]')) this.stopAutoplay();
        }, { signal });
        this.addEventListener('pointerdown', (event) => {
          if (!event.target.closest('[data-rail-play]')) this.stopAutoplay();
        }, { signal });
        this.playButton?.addEventListener('click', () => this.toggleAutoplay(), { signal });
        this.motion.addEventListener('change', () => {
          if (this.motion.matches) this.stopAutoplay();
          if (this.swiperInstance) this.swiperInstance.params.speed = this.motion.matches ? 0 : 400;
          this.updatePlayButton(Boolean(this.swiperInstance?.autoplay?.running));
        }, { signal });
        this.addEventListener('shopify:block:select', (event) => {
          this.enhance();
          this.stopAutoplay();
          const slide = event.target.closest('.swiper-slide');
          const index = this.originalSlides?.indexOf(slide) ?? -1;
          if (index < 0 || !this.swiperInstance) return;
          if (this.swiperInstance.params.loop) this.swiperInstance.slideToLoop(index, 0);
          else this.swiperInstance.slideTo(index, 0);
        }, { signal });

        if (window.Shopify?.designMode || !('IntersectionObserver' in window)) {
          this.frame = requestAnimationFrame(() => this.enhance());
        } else {
          this.visibilityObserver = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) this.enhance();
          }, { rootMargin: '300px' });
          this.visibilityObserver.observe(this);
        }
      }

      readLayout() {
        const style = getComputedStyle(this);
        return {
          slidesPerView: Number.parseFloat(style.getPropertyValue('--rail-per-view')),
          spaceBetween: Number.parseFloat(style.getPropertyValue('--rail-gap')),
        };
      }

      enhance() {
        if (!this.isConnected || this.swiperInstance || !this.viewport.clientWidth) return;
        this.visibilityObserver?.disconnect();
        this.originalSlides = [...this.querySelectorAll('.swiper-slide')];
        const layout = this.readLayout();
        const slideWidth = this.originalSlides[0]?.getBoundingClientRect().width || 1;
        const initialSlide = Math.round(Math.abs(this.viewport.scrollLeft) / (slideWidth + layout.spaceBetween));
        const loop = this.options.loop && this.originalSlides.length >= Math.ceil(this.options.maxSlides) + 1;
        const autoplay = this.options.autoplay;

        this.viewport.scrollLeft = 0;
        this.config = {
          ...layout,
          breakpoints: {},
          initialSlide,
          loop,
          freeMode: false,
          speed: this.motion.matches ? 0 : 400,
          watchOverflow: true,
          autoplay: autoplay ? {
            delay: this.options.delay,
            disableOnInteraction: true,
            pauseOnMouseEnter: true,
          } : false,
          navigation: this.options.navigation ? {
            prevEl: this.querySelector('[data-rail-prev]'),
            nextEl: this.querySelector('[data-rail-next]'),
          } : false,
          pagination: this.options.pagination ? {
            el: this.querySelector('[data-rail-pagination]'),
            type: 'fraction',
          } : false,
          a11y: {
            prevSlideMessage: this.options.previousLabel,
            nextSlideMessage: this.options.nextLabel,
            firstSlideMessage: this.options.previousLabel,
            lastSlideMessage: this.options.nextLabel,
            slideRole: 'listitem',
            slideLabelMessage: '{{index}} / {{slidesLength}}',
            scrollOnFocus: true,
          },
          on: {
            beforeResize: (swiper) => {
              const nextLayout = this.readLayout();
              Object.assign(swiper.params, nextLayout);
              Object.assign(swiper.originalParams, nextLayout);
            },
            autoplayStart: () => this.updatePlayButton(true),
            autoplayStop: () => this.updatePlayButton(false),
            lock: (swiper) => {
              swiper.autoplay?.stop();
              this.updatePlayButton(false);
            },
            unlock: (swiper) => this.updatePlayButton(Boolean(swiper.autoplay?.running)),
          },
        };
        if (this.motion.matches || window.Shopify?.designMode || this.swiperInstance.isLocked) this.stopAutoplay();
        this.setAttribute('data-ready', '');
        this.updatePlayButton(Boolean(this.swiperInstance.autoplay?.running));
      }

      updatePlayButton(running) {
        if (!this.playButton) return;
        this.playButton.textContent = running ? this.options.pauseLabel : this.options.playLabel;
        this.playButton.disabled = this.motion.matches || Boolean(this.swiperInstance?.isLocked);
        this.viewport?.querySelector('.swiper-wrapper')?.setAttribute('aria-live', running ? 'off' : 'polite');
      }

      stopAutoplay() {
        this.swiperInstance?.autoplay?.stop();
        this.updatePlayButton(false);
      }

      toggleAutoplay() {
        const swiper = this.swiperInstance;
        if (!swiper || this.motion.matches || swiper.isLocked) return;
        if (swiper.autoplay.running) {
          this.stopAutoplay();
        } else {
          swiper.params.autoplay = {
            ...swiper.params.autoplay,
            delay: this.options.delay,
            disableOnInteraction: true,
            pauseOnMouseEnter: true,
          };
          swiper.autoplay.start();
        }
      }

      disconnectedCallback() {
        cancelAnimationFrame(this.frame);
        this.visibilityObserver?.disconnect();
        this.abortController?.abort();
        this.destroySwiper();
        this.originalSlides?.forEach((slide) => this.querySelector('.swiper-wrapper')?.append(slide));
        this.removeAttribute('data-ready');
      }
    }

    customElements.define('collection-list-slider', CollectionListSlider);
  });
})();
