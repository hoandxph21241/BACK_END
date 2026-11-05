const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const VERSION = 1;
const FALLBACK = Object.freeze({ version: VERSION, background: '#303030' });
const IMAGE_LIMIT = 5 * 1024 * 1024;
const SIZE = 64;
let decoding = 0;

function luminance(rgb) {
  const linear = rgb.map(value => {
    const n = value / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function hex(rgb) {
  return '#' + rgb.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
}

function channels(color) {
  return color.slice(1).match(/../g).map(value => parseInt(value, 16));
}

function validTheme(theme) {
  return theme?.version === VERSION && typeof theme.background === 'string' && /^#[0-9a-f]{6}$/i.test(theme.background)
    && luminance(channels(theme.background)) <= 0.145;
}

function presentation(theme) {
  const background = validTheme(theme) ? theme.background.toLowerCase() : FALLBACK.background;
  const base = [255, 85, 0];
  let played = base;
  // Keep the orange progress readable on mid-tone covers as well as dark covers.
  for (let amount = 0; amount <= 1; amount += 0.05) {
    played = base.map(value => Math.round(value + (255 - value) * amount));
    if ((luminance(played) + 0.05) / (luminance(channels(background)) + 0.05) >= 3) break;
  }
  return { background, played: hex(played) };
}

function themeFromPixels(pixels) {
  if (!pixels?.length || pixels.length % 4) return null;
  const groups = Array.from({ length: 13 }, () => ({ weight: 0, rgb: [0, 0, 0] }));
  let total = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const rgb = [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    const alpha = pixels[offset + 3] / 255;
    if (alpha < 0.5) continue;
    const max = Math.max(...rgb) / 255, min = Math.min(...rgb) / 255;
    const delta = max - min, light = (max + min) / 2;
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
    let hue = 0;
    if (delta) {
      const [r, g, b] = rgb.map(value => value / 255);
      hue = max === r ? ((g - b) / delta + 6) % 6
        : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    }
    // Near-white margins and near-black outlines should not overpower the artwork.
    const weight = alpha * (light > 0.94 || light < 0.06 ? 0.12 : 1);
    const index = saturation < 0.15 ? 12 : Math.round(hue * 2) % 12;
    const group = groups[index];
    group.weight += weight;
    rgb.forEach((value, channel) => { group.rgb[channel] += value * weight; });
    total += weight;
  }
  if (!total) return null;
  const dominant = groups.reduce((best, group) => group.weight > best.weight ? group : best);
  const rgb = dominant.rgb.map(value => value / dominant.weight);
  // Blend toward the channel mean to mute the palette without changing its hue.
  const mean = rgb.reduce((sum, value) => sum + value, 0) / 3;
  const muted = rgb.map(value => mean + (value - mean) * 0.42);
  const sourceLight = luminance(muted);
  const target = Math.max(0.025, Math.min(0.14, sourceLight * 0.48));
  const factor = Math.sqrt(target / Math.max(sourceLight, 0.001));
  let background = muted.map(value => Math.max(36, Math.min(150, Math.round(value * factor))));
  while (luminance(background) > 0.14) background = background.map(value => Math.max(0, value - 1));
  return { version: VERSION, background: hex(background) };
}

function supportedImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.length > IMAGE_LIMIT) return false;
  return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    || buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || /^GIF8[79]a$/.test(buffer.toString('ascii', 0, 6))
    || (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP');
}

async function analyzeCover(buffer) {
  if (!supportedImage(buffer) || decoding >= 2) return null;
  decoding++;
  try {
    const pixels = await new Promise(resolve => {
      const child = spawn(process.env.FFMPEG_PATH || ffmpeg, [
        '-nostdin', '-v', 'error', '-max_alloc', '67108864',
        '-protocol_whitelist', 'pipe', '-threads', '1', '-max_pixels', '16000000',
        '-f', 'image2pipe', '-i', 'pipe:0', '-map', '0:v:0', '-frames:v', '1',
        '-filter_threads', '1', '-vf', `scale=${SIZE}:${SIZE}:flags=area,format=rgba`,
        '-threads', '1', '-f', 'rawvideo', 'pipe:1',
      ], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
      const chunks = [];
      let length = 0, settled = false;
      const finish = value => {
        if (settled) return;
        settled = true; clearTimeout(timer); resolve(value);
      };
      const timer = setTimeout(() => { child.kill(); finish(null); }, 4000);
      child.on('error', () => finish(null));
      child.stdin.on('error', () => {});
      child.stdout.on('error', () => { child.kill(); finish(null); });
      child.stdout.on('data', chunk => {
        length += chunk.length;
        if (length > SIZE * SIZE * 4) { child.kill(); finish(null); }
        else chunks.push(chunk);
      });
      child.on('close', code => finish(code === 0 && length === SIZE * SIZE * 4 ? Buffer.concat(chunks) : null));
      child.stdin.end(buffer);
    });
    return themeFromPixels(pixels);
  } catch (error) {
    // A missing decoder or damaged cover must never fail an otherwise valid song upload.
    return null;
  } finally { decoding--; }
}

module.exports = { VERSION, FALLBACK, IMAGE_LIMIT, validTheme, presentation, themeFromPixels, analyzeCover };
