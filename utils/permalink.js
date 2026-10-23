const normalizeFilename = require('./uploadFilename');

const PROFILE_SLUG_MAX = 80;
const SONG_SLUG_MAX = 140;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_PROFILES = new Set([
  'api', 'home', 'auth', 'users', 'user', 'media', 'product', 'dashboard',
  'profile', 'admin', 'login', 'logout', 'signin', 'signup', 'register',
  'settings', 'feed', 'library', 'song', 'track', 'search', 'upload',
  'images', 'stylesheets', 'javascripts', 'assets', 'mediabar',
  'mediabar-v2', 'mediabar-v3', 'network-popup', 'mediahz',
]);

function slugify(value, fallback = 'track', maxLength = SONG_SLUG_MAX) {
  const slug = String(normalizeFilename(String(value || '')))
    .normalize('NFKD').replace(/\p{M}/gu, '').replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (slug || fallback).slice(0, maxLength).replace(/-+$/g, '');
}

function validSlug(value, maxLength = SONG_SLUG_MAX) {
  return typeof value === 'string' && value.length <= maxLength && SLUG_PATTERN.test(value);
}

function validProfileSlug(value) {
  return validSlug(value, PROFILE_SLUG_MAX) && !RESERVED_PROFILES.has(value);
}

function songPath(song) {
  return song && (validProfileSlug(song.profileSlug) || song.profileSlug === 'mediahz') && validSlug(song.slug)
    ? `/${song.profileSlug}/${song.slug}` : null;
}

module.exports = { PROFILE_SLUG_MAX, SONG_SLUG_MAX, SLUG_PATTERN, RESERVED_PROFILES,
  slugify, validSlug, validProfileSlug, songPath };
