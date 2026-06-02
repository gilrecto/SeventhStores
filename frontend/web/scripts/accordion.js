// Accordion Element
class AccordionElement extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'presentation');
    this.addEventListener('keydown', this.handleKeydown);
    this.addEventListener('accordion-toggle', (event) => this.handleToggle(event));

    if (this.hasAttribute('data-toggle-first')) {
      const firstItem = this.querySelector('accordion-item');
      if (firstItem) {
        firstItem.setAttribute('open', '');
      }
    }

    this.handleResize();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  handleKeydown(event) {
    const headers = this.querySelectorAll('[slot="header"]');
    const currentIndex = Array.from(headers).indexOf(event.target);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        headers[(currentIndex + 1) % headers.length].focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        headers[(currentIndex - 1 + headers.length) % headers.length].focus();
        break;
    }
  }

  handleToggle(event) {
    const allowMultiple = this.hasAttribute('data-allow-multiple');
    const activeItem = event.target;

    if (!allowMultiple) {
      // Close other items
      this.querySelectorAll('accordion-item').forEach((item) => {
        if (item !== activeItem) {
          item.removeAttribute('open');
        }
      });
    }
  }

  handleResize() {
    const firstItem = this.querySelector('accordion-item');
    if (!firstItem) return;

    if (this.hasAttribute('data-toggle-first')) {
      if (this.isDesktop()) {
        firstItem.setAttribute('open', '');
      } else {
        firstItem.removeAttribute('open');
      }
    }
  }

  isDesktop() {
    return window.innerWidth >= 1200;
  }
}

// Accordion Item
class AccordionItem extends HTMLElement {
  static get observedAttributes() {
    return ['open'];
  }

  connectedCallback() {
    this.header = this.querySelector('[slot="header"]');
    this.content = this.querySelector('.accordion-content');

    // Initialize
    this.setupStyles();
    this.header.setAttribute('tabindex', '0');
    this.header.setAttribute('role', 'button');
    this.header.setAttribute('aria-expanded', this.hasAttribute('open'));
    this.content.style.maxHeight = this.hasAttribute('open') ? `${this.content.scrollHeight}px` : '0px';

    // Event Listeners
    this.header.addEventListener('click', () => this.toggle());
    this.header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  attributeChangedCallback(name) {
    if (name === 'open') {
      this.updateState();
    }
  }

  toggle() {
    const isOpen = this.hasAttribute('open');
    if (isOpen) {
      this.removeAttribute('open');
    } else {
      this.setAttribute('open', '');
      this.dispatchEvent(new CustomEvent('accordion-toggle', { bubbles: true }));
    }
  }

  updateState() {
    const isOpen = this.hasAttribute('open');

    if (!this.header || !this.content) {
      this.header = this.querySelector('[slot="header"]');
      this.content = this.querySelector('.accordion-content');
      if (!this.header || !this.content) return;
    }

    this.header.setAttribute('aria-expanded', isOpen);

    if (isOpen) {
      this.content.style.maxHeight = `${this.content.scrollHeight}px`;
    } else {
      this.content.style.maxHeight = '0px';
    }
  }

  setupStyles() {
    // Inline styles for simplicity
    this.content.style.overflow = 'hidden';
    this.content.style.transition = 'max-height 0.3s ease';
    this.content.style.maxHeight = '0px';
  }
}

customElements.define('accordion-element', AccordionElement);
customElements.define('accordion-item', AccordionItem);