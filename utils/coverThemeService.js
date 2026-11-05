const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { getImageUrl } = require('./songResponse');
const { VERSION, IMAGE_LIMIT, validTheme, presentation, analyzeCover } = require('./coverTheme');

const publicRoot = path.resolve(__dirname, '../public');
const pending = new Map();
const failures = new Map();

async function readCover(source) {
  if (typeof source !== 'string') return null;
  if (source.startsWith('/images/') || source.startsWith('/uploads/')) {
    const allowedRoot = path.join(publicRoot, source.startsWith('/images/') ? 'images' : 'uploads');
    const candidate = path.resolve(publicRoot, '.' + decodeURIComponent(source));
    const candidateRelative = path.relative(allowedRoot, candidate);
    if (candidateRelative.startsWith('..') || path.isAbsolute(candidateRelative)) return null;
    const file = await fs.realpath(candidate);
    const relative = path.relative(allowedRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    if (!/\.(?:png|jpe?g|webp|gif)$/i.test(file)) return null;
    const stat = await fs.stat(file);
    return stat.isFile() && stat.size <= IMAGE_LIMIT ? fs.readFile(file) : null;
  }
  const url = new URL(source);
  // Legacy covers come from ImgBB. Never follow redirects or fetch arbitrary user URLs.
  if (url.protocol !== 'https:' || url.hostname !== 'i.ibb.co'
      || url.username || url.password || (url.port && url.port !== '443')) return null;
  const response = await axios.get(url.href, {
    responseType: 'arraybuffer', timeout: 4000, maxRedirects: 0,
    maxContentLength: IMAGE_LIMIT, maxBodyLength: IMAGE_LIMIT, proxy: false,
    headers: { Accept: 'image/jpeg,image/png,image/webp,image/gif' },
  });
  return /^image\/(?:jpeg|png|webp|gif)(?:;|$)/i.test(response.headers['content-type'] || '')
    ? Buffer.from(response.data) : null;
}

function keepExistingTheme(image, previous) {
  if (getImageUrl(image) === getImageUrl(previous) && validTheme(previous?.theme)) {
    image.theme = { version: VERSION, background: previous.theme.background };
  }
  return image;
}

async function ensureCoverTheme(song, model) {
  if (validTheme(song.image?.theme)) return presentation(song.image.theme);
  const source = getImageUrl(song.image);
  if (!source || typeof song.image !== 'object') return presentation(null);
  const key = String(song._id) + ':' + source;
  if ((failures.get(key) || 0) > Date.now()) return presentation(null);
  if (pending.has(key)) return pending.get(key);
  if (pending.size >= 2) return presentation(null);
  const task = (async () => {
    try {
      const buffer = await readCover(source);
      const theme = buffer && await analyzeCover(buffer);
      if (!theme) throw new Error('Cover unavailable');
      // A cover replacement in another request must not receive this older theme.
      const result = await model.updateOne({
        _id: song._id,
        'image.url': song.image.url ?? null,
        'image.display_url': song.image.display_url ?? null,
        'image.thumb.url': song.image.thumb?.url ?? null,
        'image.theme.version': song.image.theme?.version ?? null,
        'image.theme.background': song.image.theme?.background ?? null,
      }, { $set: { 'image.theme': theme } }, { timestamps: false });
      return presentation(result.matchedCount ? theme : null);
    } catch (error) {
      if (failures.size >= 128) failures.delete(failures.keys().next().value);
      failures.set(key, Date.now() + 5 * 60 * 1000);
      return presentation(null);
    } finally { pending.delete(key); }
  })();
  pending.set(key, task);
  return task;
}

module.exports = { readCover, keepExistingTheme, ensureCoverTheme };
