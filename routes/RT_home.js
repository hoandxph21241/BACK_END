var express = require("express");
var router = express.Router();
var Controllers = require("../controllers/CTL_home");

router.get("", Controllers.Home);
router.get("/pratical", Controllers.Home_pratical);
//router.get("/ct_home", Controllers.CT_Home);
router.get("/ct_home_v2", Controllers.CT_Home);
router.get("/test", Controllers.Home_NEW);
router.get("/find/:id", Controllers.Find_ID);
router.get("/fetch", Controllers.Fetch);
router.get("/category/:categoryId", Controllers.GetSongsByCategory);


router.post("/play-song", Controllers.PlaySong);
router.get("/play-history", Controllers.GetPlayHistory);
router.delete("/play-history", Controllers.ClearPlayHistory);
router.delete("/play-history/:songId", Controllers.RemoveFromHistory);

module.exports = router;