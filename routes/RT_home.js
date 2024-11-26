var express = require("express");
var router = express.Router();
var Contronlers = require("../contronller/CTL_home");

router.get("", Contronlers.Home);
router.get("/test", Contronlers.Home_NEW);
router.get("/find/:id", Contronlers.Find_ID);

router.get("/fetch", Contronlers.Fetch);
router.get("/category/:categoryId", Contronlers.GetSongsByCategory);

module.exports = router;
