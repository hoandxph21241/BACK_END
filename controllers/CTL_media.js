var db = require("../model/db_song");
const {
  SONG_SUMMARY_SELECT,
  formatSongSummary,
  formatSongSummaries,
} = require("../utils/songResponse");

const ensureNotifications = (req) => {
  if (!req.session.notifications) {
    req.session.notifications = [];
  }
  return req.session.notifications;
};

exports.GetSongs = async (req, res, next) => {
  try {
    const mp3List = await db.MP3.find()
      .select(SONG_SUMMARY_SELECT)
      .populate({ path: "categoryId", select: "nameCategory" })
      .sort({ uploadDate: -1 })
      .lean();

    res.json({ success: true, data: formatSongSummaries(mp3List) });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi lấy danh sách nhạc" });
  }
};

exports.GetSongById = async (req, res, next) => {
  try {
    const mp3Id = req.params.id;
    const song = await db.MP3.findById(mp3Id)
      .select(SONG_SUMMARY_SELECT)
      .populate({ path: "categoryId", select: "nameCategory" })
      .lean();

    if (!song) {
      return res.status(404).json({ success: false, error: "Không tìm thấy bài hát" });
    }

    res.json({ success: true, data: formatSongSummary(song) });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi lấy thông tin bài hát" });
  }
};

exports.GetNotifications = (req, res, next) => {
  try {
    const notifications = ensureNotifications(req);
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi lấy thông báo" });
  }
};

exports.PushNotification = (req, res, next) => {
  try {
    const notifications = ensureNotifications(req);
    const { title, message, type } = req.body;
    const notification = {
      id: Date.now().toString(),
      title: title || "Thông báo mới",
      message: message || "Có hoạt động mới",
      type: type || "info",
      read: false,
      createdAt: new Date()
    };
    notifications.unshift(notification);
    if (notifications.length > 20) {
      notifications.length = 20;
    }
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi tạo thông báo" });
  }
};

exports.MarkNotificationRead = (req, res, next) => {
  try {
    const notifications = ensureNotifications(req);
    const { id } = req.body;
    const item = notifications.find((item) => item.id === id);
    if (item) {
      item.read = true;
      return res.json({ success: true, data: item });
    }
    res.status(404).json({ success: false, error: "Không tìm thấy thông báo" });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi cập nhật trạng thái thông báo" });
  }
};
