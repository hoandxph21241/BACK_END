const { slugify } = require('./permalink');
const MAX_QUERY = 100;
const PAGE_SIZE = 24;
const vowels = {
  a: 'a\u00e0\u00e1\u1ea3\u00e3\u1ea1\u0103\u1eb1\u1eaf\u1eb3\u1eb5\u1eb7\u00e2\u1ea7\u1ea5\u1ea9\u1eab\u1ead',
  e: 'e\u00e8\u00e9\u1ebb\u1ebd\u1eb9\u00ea\u1ec1\u1ebf\u1ec3\u1ec5\u1ec7',
  i: 'i\u00ec\u00ed\u1ec9\u0129\u1ecb',
  o: 'o\u00f2\u00f3\u1ecf\u00f5\u1ecd\u00f4\u1ed3\u1ed1\u1ed5\u1ed7\u1ed9\u01a1\u1edd\u1edb\u1edf\u1ee1\u1ee3',
  u: 'u\u00f9\u00fa\u1ee7\u0169\u1ee5\u01b0\u1eeb\u1ee9\u1eed\u1eef\u1ef1',
  y: 'y\u1ef3\u00fd\u1ef7\u1ef9\u1ef5', d: 'd\u0111',
};
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function parseSearch(query = {}) {
  if (query.q !== undefined && typeof query.q !== 'string') throw Object.assign(new Error('Invalid search query.'), { status: 400 });
  const q = (query.q || '').normalize('NFC').replace(/\s+/gu, ' ').trim();
  const page = query.page === undefined ? 1 : Number(query.page);
  if (q.length > MAX_QUERY || /[\u0000-\u001f\u007f]/.test(q) || (query.page !== undefined && typeof query.page !== 'string') ||
      !Number.isInteger(page) || page < 1 || page > 1000) throw Object.assign(new Error('Invalid search query or page.'), { status: 400 });
  return { q, page };
}

function searchFilter(q) {
  // Match both precomposed Vietnamese and combining-mark filenames, treating input as literal text.
  const folded = q.normalize('NFD').replace(/\p{M}/gu, '').replace(/[\u0111\u0110]/g, 'd').toLowerCase();
  const pattern = [...folded].map(char => char === ' ' ? '\\s+' :
    vowels[char] ? `[${vowels[char]}][\u0300-\u036f]*` : escapeRegex(char)).join('');
  const alternatives = ['name', 'artist'].map(field => ({ [field]: { $regex: pattern, $options: 'i' } }));
  const slug = slugify(q, '');
  if (slug) alternatives.push({ slug: { $regex: escapeRegex(slug), $options: 'i' } });
  return { isPublic: { $ne: false }, isDeleted: { $ne: true }, $or: alternatives };
}

function searchUrl(q, page = 1) {
  const params = new URLSearchParams({ q });
  if (page > 1) params.set('page', String(page));
  return `/home/search?${params}`;
}

module.exports = { MAX_QUERY, PAGE_SIZE, parseSearch, searchFilter, searchUrl };
