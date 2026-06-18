class SearchDrawer extends HTMLElement {
  constructor() {
    super();

    this.drawer = this.querySelector('[data-search-drawer]');
    this.trigger = this.querySelector('[data-search-drawer-trigger]');
    this.overlay = this.querySelector('[data-search-drawer-overlay]');
    this.closeButton = this.querySelector('[data-search-drawer-close]');
    this.input = this.querySelector('input[type="search"]');

    this.addEventListener('keyup', (event) => event.code === 'Escape' && this.close());
    this.trigger?.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(this.trigger);
    });
    this.overlay?.addEventListener('click', this.close.bind(this));
    this.closeButton?.addEventListener('click', this.close.bind(this));
  }

  open(triggeredBy) {
    if (triggeredBy) this.activeElement = triggeredBy;

    document.querySelectorAll('search-drawer').forEach((drawer) => {
      if (drawer !== this) drawer.close(false);
    });

    setTimeout(() => {
      this.drawer.classList.add('animate', 'active');
      this.setAttribute('open', '');
      this.trigger?.setAttribute('aria-expanded', 'true');
    });

    this.drawer.addEventListener(
      'transitionend',
      () => {
        this.trapFocus();
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close(focusToggle = true) {
    if (!this.drawer?.classList.contains('active')) return;

    this.drawer.classList.remove('active');
    this.removeAttribute('open');
    this.trigger?.setAttribute('aria-expanded', 'false');
    removeTrapFocus(focusToggle ? this.activeElement : null);
    document.body.classList.remove('overflow-hidden');
  }

  trapFocus() {
    const containerToTrapFocusOn = this.querySelector('.search-drawer__inner');
    const focusElement = this.input || this.closeButton || containerToTrapFocusOn;

    if (containerToTrapFocusOn) trapFocus(containerToTrapFocusOn, focusElement);
  }
}

customElements.define('search-drawer', SearchDrawer);
