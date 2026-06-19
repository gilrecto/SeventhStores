class ProductSwatches extends HTMLElement {

  connectedCallback() {

    if (this.dataset.initialized) return;

    this.dataset.initialized = true;

    this.render();
  }

  get groups() {

    if (window.__productGroups) {
      return window.__productGroups;
    }

    const json = document.querySelector('#product-groups-data');

    if (!json) {
      return {};
    }

    window.__productGroups = JSON.parse(json.textContent);

    return window.__productGroups;
  }

  render() {

    const group = this.getAttribute('group');
    const current = this.getAttribute('current');

    const products = this.groups[group];

    if (!products?.length) {
      this.innerHTML = '';
      return;
    }

    this.innerHTML = `
      <div class="ts:my-4! ts:lg:my-6! ts:flex ts:lg:block ts:items-center">
        <ul class="ts:flex ts:w-full ts:*:first:pl-0">

          ${products.map(product => `
            <li class="ts:px-2">

              <a
                class="ts:block"
                href="${product.url}"
                title="${product.title}"
                ${product.handle === current ? 'aria-current="true"' : ''}
              >

                <span
                  class="
                    ts:h-[1.6rem]
                    ts:w-[1.6rem]
                    ts:block
                    ts:box-border!
                    ${product.handle === current
                      ? 'ts:border ts:border-black ts:p-px'
                      : ''
                    }
                    ts:rounded-full
                  "
                >

                  <span
                    class="
                      ${product.handle === current
                        ? 'ts:h-[1.2rem] ts:w-[1.2rem]'
                        : 'ts:h-[1.6rem] ts:w-[1.6rem]'
                      }
                      ts:block
                      ts:rounded-full
                    "
                    style="background-color:${product.swatch}"
                  ></span>

                </span>

              </a>

            </li>
          `).join('')}

        </ul>
      </div>
    `;
  }
}

customElements.define('product-swatches', ProductSwatches);