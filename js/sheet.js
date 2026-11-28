// Load a stylesheet only when something needs it, so no page pays for it up front. Resolves once it
// is in (or has failed), so what needs it never shows bare.

/** @param {string} href an absolute URL, e.g. new URL('x.css', import.meta.url).href */
export function loadSheet(href) {
  return new Promise((done) => {
    const sheet = document.createElement('link');
    sheet.rel = 'stylesheet';
    sheet.href = href;
    sheet.addEventListener('load', done);
    sheet.addEventListener('error', done);
    document.head.append(sheet);
  });
}
