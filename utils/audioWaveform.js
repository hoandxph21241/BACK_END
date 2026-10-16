const { spawn } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const SAMPLE_RATE = 2000;
const POINTS = 480;
let running = 0;
function failure(status, message) { return Object.assign(new Error(message), { status }); }
module.exports = async function audioWaveform(filePath) {
  if (running >= 2) throw failure(503, "Máy chủ đang xử lý audio. Vui lòng thử lại sau.");
  running++;
  try {
    const pcm = await new Promise((resolve, reject) => {
      const child = spawn(process.env.FFMPEG_PATH || ffmpeg, [
        "-nostdin", "-v", "error", "-protocol_whitelist", "file,pipe",
        "-i", filePath, "-map", "0:a:0",
        "-vn", "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "pipe:1",
      ], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
      let size = 0, settled = false;
      const chunks = [];
      const finish = (error, value) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        error ? reject(error) : resolve(value);
      };
      const timer = setTimeout(() => {
        child.kill(); finish(failure(503, "Xử lý waveform quá thời gian. Vui lòng thử lại."));
      }, 45000);
      child.on("error", () => finish(failure(503, "Không thể khởi chạy công cụ xử lý audio.")));
      child.stdout.on("error", () => { child.kill(); finish(failure(503, "Không thể đọc dữ liệu audio đã giải mã.")); });
      child.stdout.on("data", chunk => {
        size += chunk.length;
        if (size > 32 * 1024 * 1024) {
          child.kill(); finish(failure(413, "Audio quá dài để tạo waveform."));
        } else chunks.push(chunk);
      });
      child.on("close", code => {
        if (code !== 0 || size < 2) return finish(failure(400, "Không thể giải mã audio. Vui lòng kiểm tra file nhạc gốc."));
        finish(null, Buffer.concat(chunks));
      });
    });
    const samples = Math.floor(pcm.length / 2);
    const peaks = Array.from({ length: POINTS }, (_, index) => {
      const start = Math.floor(index * samples / POINTS);
      const end = Math.min(samples, Math.max(start + 1, Math.floor((index + 1) * samples / POINTS)));
      let peak = 0;
      for (let sample = start; sample < end; sample++) peak = Math.max(peak, Math.abs(pcm.readInt16LE(sample * 2)));
      return peak;
    });
    const maximum = Math.max(...peaks, 1);
    return { version: 1, duration: Math.round(samples / SAMPLE_RATE * 1000) / 1000,
      peaks: peaks.map(peak => Math.round(peak / maximum * 255)) };
  } finally { running--; }
};
