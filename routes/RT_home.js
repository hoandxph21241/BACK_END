var express = require("express");
var router = express.Router();
var Contronlers = require("../controllers/CTL_home");

router.get("", Contronlers.Home);
router.get("/pratical", Contronlers.Home_pratical);
router.get("/ct_home", Contronlers.CT_Home);
router.get("/test", Contronlers.Home_NEW);
router.get("/find/:id", Contronlers.Find_ID);

router.get("/fetch", Contronlers.Fetch);
router.get("/category/:categoryId", Contronlers.GetSongsByCategory);

module.exports = router;
 