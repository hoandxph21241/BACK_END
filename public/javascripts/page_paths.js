(function (root, factory) {
  const paths = factory();
  if (typeof module === 'object' && module.exports) module.exports = paths;
  else root.MediaHzPagePaths = paths;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // One map for server redirects, browser navigation and nav selection.
  const aliases = Object.freeze({
    '/': '/discover', '/home': '/discover', '/home/pratical': '/discover',
    '/home/ct_home_v2': '/feed', '/home/ct_home': '/library',
    '/discover': '/discover', '/feed': '/feed', '/library': '/library',
  });
  function canonicalPath(path) {
    if (typeof path !== 'string') return path;
    const key = (path.replace(/\/+$/, '') || '/').toLowerCase();
    return Object.hasOwn(aliases, key) ? aliases[key] : path;
  }
  return Object.freeze({ discover: '/discover', feed: '/feed', library: '/library', canonicalPath });
});
