/* Fills the Privacy and Terms pages from js/config.js, so the contact address,
   price and governing law are set in one place. Missing settings show in red. */
(function () {
  const C = window.QUILT_CONFIG || {};
  const fill = (cls, value, missing, link) => {
    for (const el of document.querySelectorAll('.' + cls)) {
      if (!value) {
        el.textContent = missing;
        el.className += ' missing';
      } else if (link) {
        const a = document.createElement('a');
        a.href = 'mailto:' + value;
        a.textContent = value;
        el.replaceChildren(a);
      } else {
        el.textContent = value;
      }
    }
  };
  fill('contact', C.contactEmail, '[contact email not set: add contactEmail in js/config.js]', true);
  fill('law', C.governingLaw, '[not set: add governingLaw in js/config.js]');
  fill('price', C.clubPrice, '$2.99 a month');
})();
