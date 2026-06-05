class InfiniteScrolling extends HTMLElement {
  constructor() {
    super();

    this.autoload = this.dataset.autoload;
    this.section = this.dataset.section;
    this.itemGrid = this.dataset.itemGrid;
    this.button = this.querySelector('button');

    this.listeners();
    this.autoLoad();
  }

  listeners() {

    this.querySelector('button').addEventListener('click', (e) => {
      this.renderGridFromHtml();
    });
  }

  autoLoad() {

    if (this.autoload == "false") return;

    const observer = new window.IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {

        if (this.button.getAttribute("aria-busy") == "true") return;

        this.renderGridFromHtml();
        return
      }
    }, {
      root: null,
      threshold: 0.1,
    })

    observer.observe(this.button);
  }

  isLoading() {
    this.button.setAttribute('aria-busy', true);
  }

  notLoading() {
    this.button.setAttribute('aria-busy', false);
  }

  updateButton(hidden, url) {

    const newUrl = (url == undefined || url == null ? false : url);

    this.button.setAttribute('aria-hidden', hidden);
    this.button.setAttribute('data-url', newUrl);
  }

  renderGridFromHtml() {

    const _this = this;
    const section = this.section;
    const url = this.querySelector('button').dataset.url;

    if (url == "false") return;

    this.isLoading();

    fetch(`${url}&section_id=${section}`)
      .then(response => response.text())
      .then((responseText) => {

        const html = new DOMParser().parseFromString(responseText, "text/html");
        const itemGrid = html.querySelector(`${_this.itemGrid}`).innerHTML || false;
        const button = html.querySelector(`infinite-scrolling > button`) || false;

        // check to see if itemGrid exist, then append
        if (itemGrid.length > 0) {
          document.querySelector(`${_this.itemGrid}`).innerHTML += itemGrid;
        }

        // Check to see if button exists, then update existing button
        if (button === false) {
          _this.updateButton(true);
          return;
        }

        _this.updateButton(false, button.dataset.url);

      })
      .finally(() => {
        this.notLoading();
      });
  }
}

customElements.define('infinite-scrolling', InfiniteScrolling);