// import Swiper bundle with all modules installed
import Swiper from 'swiper/bundle';

// import styles bundle
import 'swiper/css/bundle';

class SwiperSlider extends HTMLElement {
  constructor() {
    super();
    this._config = null;
    this.swiperInstance = null;
    this.isWaitingForConfig = true; // Wait for the config to be set
  }

  connectedCallback() {
    if (this._config) {
      this.handleResponsiveSwiper();
    }
    window.addEventListener('resize', this.handleResponsiveSwiper.bind(this));
  }

  set config(newConfig) {
    this._config = newConfig;
    this.isWaitingForConfig = false; // Config is now set
    this.handleResponsiveSwiper(true); // Force recheck and initialize Swiper
  }

  get config() {
    return this._config;
  }

  initializeSwiper(config) {
    if (this.swiperInstance) return;

    const defaultConfig = {
      slidesPerView: 1.5,
      spaceBetween: 10,
      loop: false,
      freeMode: true,
      grabCursor: true,
      breakpoints: {
        576: { slidesPerView: 2, spaceBetween: 15 },
        768: { slidesPerView: 2.5, spaceBetween: 20 },
        992: { slidesPerView: 3, spaceBetween: 25 },
        1200: { slidesPerView: 5, spaceBetween: 35 },
      },
    };

    const finalConfig = { ...defaultConfig, ...(config || {}) };
    this.swiperInstance = new Swiper(this.querySelector('.swiper'), finalConfig);
  }

  destroySwiper() {
    if (this.swiperInstance) {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
  }

  handleResponsiveSwiper(forceRecheck = false) {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    if (this.isWaitingForConfig) return; // Wait until config is set

    if (isMobile && this.hasAttribute('destroy-on-mobile')) {
      if (this.swiperInstance) {
        this.destroySwiper();
      }
      this.classList.add('grid-view');
    } else {
      if (!this.swiperInstance || forceRecheck) {
        this.classList.remove('grid-view');
        this.initializeSwiper(this._config);
      }
    }
  }
}

customElements.define('swiper-slider', SwiperSlider);