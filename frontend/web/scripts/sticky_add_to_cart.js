class StickyAddToCart extends HTMLElement {
  connectedCallback() {
    if (this.connection) return;
    const connection = (this.connection = {});

    customElements.whenDefined('product-form').then(() => {
      if (!this.isConnected || this.connection !== connection) return;
      this.initialize();
    });
  }

  initialize() {
    this.productInfo = this.closest('product-info');
    this.primary = this.productInfo?.querySelector(`#${CSS.escape(this.dataset.buttonId)}`);
    this.button = this.querySelector('[data-sticky-submit]');
    if (!this.primary?.form || !this.button || !('IntersectionObserver' in window)) return;

    this.label = this.querySelector('[data-sticky-label]');
    this.spinner = this.querySelector('.loading__spinner');
    this.price = this.querySelector('[data-sticky-price]');
    this.options = this.querySelector('[data-sticky-options]');
    this.wishlistSlot = this.querySelector('[data-sticky-wishlist]');
    this.wishlist = this.productInfo.querySelector('#smartwishlist');
    if (this.wishlist && this.wishlistSlot) {
      this.wishlistOrigin = document.createTextNode('');
      this.wishlist.before(this.wishlistOrigin);
      this.wishlistSlot.hidden = false;
    }
    this.onOptionChange = this.changeOption.bind(this);
    this.options?.addEventListener('change', this.onOptionChange);
    this.mobile = window.matchMedia('(width < 750px)');
    this.onClick = this.submit.bind(this);
    this.onResize = this.updateVisibility.bind(this);
    this.button.addEventListener('click', this.onClick);
    this.mobile.addEventListener('change', this.onResize);

    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.primaryVisible = entry.isIntersecting;
      this.updateVisibility();
    });
    this.intersectionObserver.observe(this.primary);

    this.stateObserver = new MutationObserver(() => this.syncState());
    this.stateObserver.observe(this.primary, {
      attributes: true,
      attributeFilter: [
        'disabled', 'class', 'aria-disabled', 'aria-busy', 'aria-label',
        'aria-labelledby', 'aria-describedby', 'aria-haspopup', 'aria-controls', 'aria-expanded',
      ],
      childList: true,
      characterData: true,
      subtree: true,
    });

    this.unsubscribers = [
      subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
        if (data.sectionId !== this.productInfo.dataset.section) return;
        this.syncPrice(data.html.querySelector('ts-sticky-add-to-cart [data-sticky-price]'));
        this.syncState();
      }),
      subscribe(PUB_SUB_EVENTS.cartError, ({ productVariantId }) => {
        if (!this.submitting || String(productVariantId) !== this.primary.form.elements.id?.value) return;
        queueMicrotask(() => this.revealError());
      }),
    ];

    this.syncState();
    this.hidden = false;
  }

  syncState() {
    const loading = this.primary.classList.contains('loading');
    this.button.disabled = this.primary.disabled || this.primary.getAttribute('aria-disabled') === 'true' || loading;
    this.button.classList.toggle('loading', loading);
    this.button.classList.toggle('button--secondary', this.primary.classList.contains('button--secondary'));
    this.button.classList.toggle('button--primary', !this.primary.classList.contains('button--secondary'));
    this.spinner.classList.toggle('hidden', !loading);

    const soldOut = this.primary.querySelector('.sold-out-message:not(.hidden)');
    const label = (soldOut || this.primary.querySelector('span') || this.primary).textContent.trim();
    if (this.label.textContent !== label) this.label.textContent = label;

    for (const name of ['aria-disabled', 'aria-busy', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-haspopup', 'aria-controls', 'aria-expanded']) {
      const value = this.primary.getAttribute(name);
      if (value === null) this.button.removeAttribute(name);
      else this.button.setAttribute(name, value);
    }
    if (loading) this.button.setAttribute('aria-busy', 'true');
    if (!loading) this.submitting = false;
    this.syncOptions(loading);
    this.syncPrice();
  }

  syncPrice(fallback) {
    if (!this.price) return;
    const source = this.productInfo.querySelector(`#price-${CSS.escape(this.productInfo.dataset.section)} .price`)
      || fallback?.querySelector('.price');
    this.price.hidden = !this.primary.form.elements.id?.value;
    if (!source || this.price.hidden || this.price.innerHTML === source.outerHTML) return;
    const price = source.cloneNode(true);
    price.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    this.price.replaceChildren(price);
  }

  syncOptions(loading) {
    if (!this.options) return;
    const picker = this.productInfo.variantSelectors;
    this.options.hidden = !picker;
    if (!picker) return;
    const groups = picker.querySelectorAll('.product-form__input');
    this.options.querySelectorAll('[data-sticky-option]').forEach((select) => {
      const group = groups[Number(select.dataset.stickyOption) - 1];
      select.disabled = loading || !group;
      if (!group) return;
      const values = Array.from(group.querySelectorAll('option, input[type="radio"]')).map((input) => {
        let label = input.textContent.trim() || input.value;
        if (input.tagName === 'INPUT' && (input.classList.contains('disabled') || input.classList.contains('visually-disabled'))) {
          const unavailable = group.querySelector('.label-unavailable')?.textContent.trim();
          if (unavailable) label += ` ? ${unavailable}`;
        }
        return {
          id: input.dataset.optionValueId,
          label,
          selected: input.tagName === 'OPTION' ? input.selected : input.checked,
          disabled: input.disabled,
        };
      });
      const signature = JSON.stringify(values);
      if (select.dataset.signature === signature) return;
      select.replaceChildren(...values.map((value) => {
        const option = document.createElement('option');
        option.value = value.id;
        option.textContent = value.label;
        option.selected = value.selected;
        option.disabled = value.disabled;
        return option;
      }));
      select.dataset.signature = signature;
    });
  }

  changeOption(event) {
    const select = event.target.closest('[data-sticky-option]');
    const picker = this.productInfo.variantSelectors;
    if (!select || !picker) return;
    const source = Array.from(picker.querySelectorAll('[data-option-value-id]'))
      .find((input) => input.dataset.optionValueId === select.value);
    if (!source) return;
    const control = source.tagName === 'OPTION' ? source.closest('select') : source;
    if (source.tagName === 'OPTION') control.value = source.value;
    else source.checked = true;
    picker.updateSelectionMetadata({ target: control });
    publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
      data: {
        event,
        target: { id: select.id, dataset: source.dataset },
        selectedOptionValues: picker.selectedOptionValues,
      },
    });
  }

  placeWishlist(visible) {
    if (!this.wishlistOrigin?.parentNode || !this.wishlistSlot) return;
    if (visible) {
      if (this.wishlist.parentNode !== this.wishlistSlot) this.wishlistSlot.append(this.wishlist);
    } else if (this.wishlist.parentNode === this.wishlistSlot) {
      this.wishlistOrigin.after(this.wishlist);
    }
  }

  updateVisibility() {
    const visible = this.mobile.matches && this.primaryVisible === false;
    if (!visible && this.contains(document.activeElement)) {
      const target = this.primary.disabled ? this.productInfo : this.primary;
      if (target === this.productInfo) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    this.placeWishlist(visible);
    this.inert = !visible;
    this.toggleAttribute('data-visible', visible);
  }

  submit() {
    this.syncState();
    if (this.button.disabled || !this.primary.isConnected) return;
    this.submitting = true;
    this.button.focus({ preventScroll: true });
    this.primary.click();
    this.syncState();
  }

  revealError() {
    if (!this.isConnected) return;
    const error = this.primary.closest('product-form').querySelector('.product-form__error-message-wrapper');
    if (!error || error.hidden) return;
    error.setAttribute('tabindex', '-1');
    error.scrollIntoView({ block: 'center', behavior: 'instant' });
    error.focus({ preventScroll: true });
  }

  disconnectedCallback() {
    this.connection = null;
    this.options?.removeEventListener('change', this.onOptionChange);
    this.placeWishlist(false);
    this.wishlistOrigin?.remove();
    this.wishlistOrigin = null;
    this.intersectionObserver?.disconnect();
    this.stateObserver?.disconnect();
    this.unsubscribers?.forEach((unsubscribe) => unsubscribe());
    this.button?.removeEventListener('click', this.onClick);
    this.mobile?.removeEventListener('change', this.onResize);
    this.hidden = true;
    this.inert = true;
    this.removeAttribute('data-visible');
    this.primaryVisible = undefined;
    this.submitting = false;
  }
}

if (!customElements.get('ts-sticky-add-to-cart')) {
  customElements.define('ts-sticky-add-to-cart', StickyAddToCart);
}
