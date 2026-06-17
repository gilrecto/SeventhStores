(function () {
  const CARD_SELECTOR = '[data-cart-upsell-card]';
  const FALLBACK_CARD_SELECTOR = '.cart-drawer-upsell li';
  const SELECT_SELECTOR = 'variant-selects select';
  const VARIANTS_SELECTOR = '[data-product-variants]';
  const PRICES_SELECTOR = '[data-product-variant-prices]';

  const parseJson = (element, fallback) => {
    if (!element) return fallback;

    try {
      return JSON.parse(element.textContent);
    } catch (error) {
      console.error('Unable to parse cart upsell JSON.', error);
      return fallback;
    }
  };

  const getCard = (target) => target.closest?.(CARD_SELECTOR) || target.closest?.(FALLBACK_CARD_SELECTOR);

  const getVariants = (card) => {
    if (!card) return [];
    if (!card.cartUpsellVariants) {
      card.cartUpsellVariants = parseJson(card.querySelector(VARIANTS_SELECTOR), []);
    }

    return card.cartUpsellVariants;
  };

  const getVariantPrices = (card) => {
    if (!card) return {};
    if (!card.cartUpsellVariantPrices) {
      card.cartUpsellVariantPrices = parseJson(card.querySelector(PRICES_SELECTOR), {});
    }

    return card.cartUpsellVariantPrices;
  };

  const getSelectedOptions = (card) =>
    Array.from(card.querySelectorAll(SELECT_SELECTOR)).map((select) => select.value);

  const getCurrentVariant = (card) => {
    const variants = getVariants(card);
    const selectedOptions = getSelectedOptions(card);

    if (!variants.length) return null;
    if (!selectedOptions.length) return variants[0];

    return variants.find((variant) =>
      variant.options.every((option, index) => option === selectedOptions[index])
    );
  };

  const formatMoney = (cents) => {
    const currency = window.Shopify?.currency?.active || 'USD';

    return (cents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency,
    });
  };

  const setButtonState = (card, variant) => {
    const button = card.querySelector('.product-form__submit');
    const buttonText = card.querySelector('[data-add-to-cart-text]');
    const spinner = button?.querySelector('.loading__spinner');
    const disabled = !variant || !variant.available;

    if (button) {
      button.disabled = disabled;
      button.toggleAttribute('disabled', disabled);
      button.dataset.cartUpsellState = variant ? (disabled ? 'sold-out' : 'available') : 'unavailable';

      if (disabled) {
        button.removeAttribute('aria-disabled');
        button.classList.remove('loading');
        spinner?.classList.add('hidden');
      } else {
        button.removeAttribute('aria-disabled');
      }
    }

    if (buttonText) {
      buttonText.classList.remove('hidden');
      buttonText.textContent = variant
        ? disabled
          ? window.variantStrings?.soldOut || 'Sold out'
          : window.variantStrings?.addToCart || 'Add to cart'
        : window.variantStrings?.unavailable || 'Unavailable';
    }
  };

  const setVariantInput = (card, variant) => {
    const variantInput = card.querySelector('form [name="id"].product-variant-id, form [name="id"]');
    const disabled = !variant || !variant.available;

    if (!variantInput) return;

    variantInput.value = variant ? variant.id : '';
    variantInput.disabled = disabled;
    variantInput.toggleAttribute('disabled', disabled);
  };

  const setPrice = (card, variant) => {
    if (!variant) return;

    const price = card.querySelector('[data-product-price]');
    const comparePrice = card.querySelector('[data-product-compare-price]');
    const compareWrapper = card.querySelector('[data-product-compare-price-wrapper]');
    const variantPrices = getVariantPrices(card)[variant.id] || {};
    const hasComparePrice = variant.compare_at_price && variant.compare_at_price > variant.price;

    if (price) {
      price.textContent = variantPrices.price || formatMoney(variant.price);
      price.classList.toggle('ts:text-red-700', Boolean(hasComparePrice));
    }

    if (compareWrapper) {
      compareWrapper.classList.toggle('ts:hidden', !hasComparePrice);
    }

    if (comparePrice) {
      comparePrice.textContent = hasComparePrice
        ? variantPrices.compareAtPrice || formatMoney(variant.compare_at_price)
        : '';
    }
  };

  const updateCard = (card) => {
    if (!card) return null;

    const variant = getCurrentVariant(card);

    setVariantInput(card, variant);
    setPrice(card, variant);
    setButtonState(card, variant);

    card.dataset.upsellInit = 'true';
    return variant;
  };

  const getCards = (root = document) => {
    const cards = new Set();

    if (root.matches?.(CARD_SELECTOR) || root.matches?.(FALLBACK_CARD_SELECTOR)) {
      cards.add(root);
    }

    root.querySelectorAll?.(CARD_SELECTOR).forEach((card) => cards.add(card));
    root.querySelectorAll?.(FALLBACK_CARD_SELECTOR).forEach((card) => cards.add(card));

    return cards;
  };

  const initCartUpsells = (root = document) => {
    getCards(root).forEach(updateCard);
  };

  const scheduleInit = (() => {
    let frame;

    return () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => initCartUpsells());
    };
  })();

  document.addEventListener('change', (event) => {
    if (!event.target.matches(SELECT_SELECTOR)) return;

    const card = getCard(event.target);
    if (card) updateCard(card);
  });

  document.addEventListener(
    'submit',
    (event) => {
      const card = getCard(event.target);
      if (!card) return;

      const variant = updateCard(card);

      if (!variant || !variant.available) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  document.addEventListener('DOMContentLoaded', scheduleInit);
  document.addEventListener('cart:refresh', scheduleInit);
  document.addEventListener('shopify:section:load', scheduleInit);

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, () => {
      scheduleInit();
    });
  }

  if (document.body) {
    new MutationObserver((mutations) => {
      const hasCartUpsellChange = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE &&
            (node.matches?.('.cart-drawer-upsell, .cart-drawer-upsell *') ||
              node.querySelector?.('.cart-drawer-upsell'))
        )
      );

      if (hasCartUpsellChange) scheduleInit();
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.initCartUpsells = initCartUpsells;
})();
