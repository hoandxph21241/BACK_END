var express = require("express");
var router = express.Router();
var Controllers = require("../controllers/CTL_media");

router.get("/songs", Controllers.GetSongs);
router.get("/songs/:id", Controllers.GetSongById);

router.get("/notifications", Controllers.GetNotifications);
router.post("/notifications", Controllers.PushNotification);
router.post("/notifications/read", Controllers.MarkNotificationRead);

module.exports = router;
