class CartUpsell {
  constructor(container) {
    this.container = container;

    this.variantData = JSON.parse(
      container.querySelector(
        '.cart-upsell-variants script[type="application/json"]'
      ).textContent
    );

    this.currentVariant = this.variantData[0];

    this.optionSelectors =
      container.querySelectorAll('[data-option-selector]');

    this.variantSelect =
      container.querySelector('[data-product-select]');

    this.price =
      container.querySelector('[data-product-price]');

    this.comparePrice =
      container.querySelector('[data-product-compare-price]');

    this.compareWrapper =
      container.querySelector('[data-product-compare-price-wrapper]');

    this.button =
      container.querySelector('[data-add-to-cart]');

    this.buttonText =
      container.querySelector('[data-add-to-cart-text]');

    this.optionSelectors.forEach(el => {
      el.addEventListener('change', (event) => {
        event.stopImmediatePropagation();
        this.updateVariant();
      });
    });

    // initialize state from current selections
    this.updateVariant();
  }

  getSelectedOptions() {
    const groups = [
      ...new Set(
        [...this.optionSelectors].map(el => el.name)
      )
    ];

    return groups.map(name => {
      const checked =
        this.container.querySelector(
          `[name="${CSS.escape(name)}"]:checked`
        );

      if (checked) return checked.value;

      const select =
        this.container.querySelector(
          `[name="${CSS.escape(name)}"]`
        );

      return select?.value;
    });
  }

  updateVariant() {
    const selectedOptions = this.getSelectedOptions();

    const variant = this.variantData.find(v => {
      return v.options.every((option, index) => {
        return option === selectedOptions[index];
      });
    });

    if (!variant) {
      this.button.disabled = true;
      return;
    }

    this.currentVariant = variant;

    // Sync hidden select
    this.variantSelect.value = String(variant.id);

    // Force matching option selected
    [...this.variantSelect.options].forEach(option => {
      option.selected =
        String(option.value) === String(variant.id);
    });

    // Verify sync
    console.log(
      'Current variant:',
      variant.id,
      variant.title
    );

    if (this.price) {
      this.price.innerHTML =
        Shopify.formatMoney(variant.price);
    }

    if (
      variant.compare_at_price &&
      variant.compare_at_price > variant.price
    ) {
      this.compareWrapper?.classList.remove('ts:hidden');

      if (this.comparePrice) {
        this.comparePrice.innerHTML =
          Shopify.formatMoney(variant.compare_at_price);
      }
    } else {
      this.compareWrapper?.classList.add('ts:hidden');
    }

    if (variant.available) {
      this.button.disabled = false;
      this.buttonText.textContent =
        this.button.dataset.textAvailable;
    } else {
      this.button.disabled = true;
      this.buttonText.textContent =
        this.button.dataset.textSoldOut;
    }
  }
}

function initCartUpsells() {
  document
    .querySelectorAll('.cart-drawer-upsell product-form')
    .forEach(el => {
      if (!el.dataset.upsellInitialized) {
        el.dataset.upsellInitialized = 'true';
        new CartUpsell(el);
      }
    });
}

document.addEventListener('DOMContentLoaded', initCartUpsells);

// cart drawer gets rerendered after AJAX add
document.addEventListener('cart:refresh', initCartUpsells);