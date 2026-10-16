const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const service = require("../service/SongWaveformService");
router.get("/:id/waveform", rateLimit({ windowMs: 60000, max: 30,
  message: { success: false, message: "Vui lòng chờ trước khi tải lại waveform." } }), async (req, res) => {
  try {
    const data = await service.get(req.params.id);
    res.set("Cache-Control", "private, no-cache");
    res.json({ success: true, data });
  } catch (error) {
    if (!error.status) console.error("Waveform failed:", error.message);
    res.status(error.status || 500).json({ success: false,
      message: error.status ? error.message : "Không thể tạo waveform. Vui lòng thử lại." });
  }
});
module.exports = router;
