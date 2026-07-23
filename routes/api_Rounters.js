const express = require('express');
const router = express.Router();
const { MP3, CategoryModel, UserModel, PlayHistoryModel } = require('../model/db_song');
const {
  SONG_SUMMARY_SELECT,
  formatSongSummary,
  formatSongSummaries,
} = require('../utils/songResponse');
const AuthController = require('../service/auth/AuthService');

// MP3 endpoints
router.get('/mp3', async (req, res) => {
  try {
    const query = {};
    if (req.query.name) query.name = new RegExp(req.query.name, 'i');
    if (req.query.userID) query.userID = req.query.userID;
    if (req.query.categoryId) query.categoryId = req.query.categoryId;

    const mp3s = await MP3.find(query)
      .select(SONG_SUMMARY_SELECT)
      .populate('categoryId', 'nameCategory')
      .sort({ uploadDate: -1 })
      .lean();
    res.json({ status: 'success', data: formatSongSummaries(mp3s) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/mp3/:id', async (req, res) => {
  try {
    const mp3 = await MP3.findById(req.params.id)
      .select(SONG_SUMMARY_SELECT)
      .populate('categoryId', 'nameCategory')
      .lean();
    if (!mp3) return res.status(404).json({ status: 'error', message: 'MP3 không tìm thấy' });
    res.json({ status: 'success', data: formatSongSummary(mp3) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.post('/mp3', async (req, res) => {
  try {
    const data = {
      name: req.body.name,
      artist: req.body.artist,
      originalName: req.body.originalName,
      fileSize: req.body.fileSize,
      duration: req.body.duration,
      userID: req.body.userID,
      categoryId: req.body.categoryId,
      image: req.body.image || {},
      data: req.body.data || null,
    };

    const mp3 = new MP3(data);
    await mp3.save();
    res.status(201).json({ status: 'success', data: formatSongSummary(mp3.toObject()) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.put('/mp3/:id', async (req, res) => {
  try {
    const mp3 = await MP3.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .select(SONG_SUMMARY_SELECT)
      .populate('categoryId', 'nameCategory')
      .lean();
    if (!mp3) return res.status(404).json({ status: 'error', message: 'MP3 không tìm thấy' });
    res.json({ status: 'success', data: formatSongSummary(mp3) });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// router.get('/mp3/:id/stream', async (req, res) => {
//   try {
//     const song = await MP3.findById(req.params.id);

//     if (!song || !song.data) {
//       return res.status(404).send('Không tìm thấy file');
//     }

//     res.set({
//       'Content-Type': 'audio/mpeg',
//       'Content-Length': song.data.length,
//     });

//     res.send(song.data);

//   } catch (err) {
//     res.status(500).json({
//       status: 'error',
//       message: err.message
//     });
//   }
// });

router.get('/mp3/:id/stream', async (req, res) => {

    const song = await MP3.findById(req.params.id);

    if (!song || !song.data)
        return res.sendStatus(404);

    const range = req.headers.range;

    if (!range) {
        res.writeHead(200, {
            "Content-Type": "audio/mpeg",
            "Content-Length": song.data.length,
        });

        return res.end(song.data);
    }

    const CHUNK_SIZE = 1024 * 1024;

    const start = Number(
        range.replace(/\D/g, "")
    );

    const end = Math.min(
        start + CHUNK_SIZE,
        song.data.length - 1
    );

    res.writeHead(206, {
        "Content-Range":
            `bytes ${start}-${end}/${song.data.length}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": "audio/mpeg",
    });

    res.end(
        song.data.slice(start, end + 1)
    );
});


router.delete('/mp3/:id', async (req, res) => {
  try {
    const mp3 = await MP3.findByIdAndDelete(req.params.id);
    if (!mp3) return res.status(404).json({ status: 'error', message: 'MP3 không tìm thấy' });
    res.json({ status: 'success', message: 'Đã xóa MP3' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Category endpoints
router.get('/categories', async (req, res) => {
  try {
    const categories = await CategoryModel.find({}).lean();
    res.json({ status: 'success', data: categories });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const category = new CategoryModel(req.body);
    await category.save();
    res.status(201).json({ status: 'success', data: category });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/categories/:id', async (req, res) => {
  try {
    const category = await CategoryModel.findById(req.params.id).lean();
    if (!category) return res.status(404).json({ status: 'error', message: 'Category không tìm thấy' });
    res.json({ status: 'success', data: category });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await CategoryModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ status: 'error', message: 'Category không tìm thấy' });
    res.json({ status: 'success', data: category });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await CategoryModel.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ status: 'error', message: 'Category không tìm thấy' });
    res.json({ status: 'success', message: 'Đã xóa Category' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// User endpoints
router.get('/users', async (req, res) => {
  try {
    const users = await UserModel.find({}).lean();
    res.json({ status: 'success', data: users });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ status: 'error', message: 'User không tìm thấy' });
    res.json({ status: 'success', data: user });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Play history endpoints
router.get('/play-history', async (req, res) => {
  try {
    const history = await PlayHistoryModel.find({})
      .populate('songID', SONG_SUMMARY_SELECT)
      .lean();
    res.json({ status: 'success', data: history });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.post('/play-history', async (req, res) => {
  try {
    const history = new PlayHistoryModel(req.body);
    await history.save();
    res.status(201).json({ status: 'success', data: history });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


router.post("/register", AuthController.register);

router.post("/login", AuthController.login);

router.post("/refresh-token", AuthController.refreshToken);

router.post("/logout", AuthController.logout);

router.get("/google", AuthController.googleLogin);

router.get("/google/callback", AuthController.googleCallback);

module.exports = router;
