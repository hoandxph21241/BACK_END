var express = require("express");
var router = express.Router();
var Controllers = require("../controllers/CTL_home");

// Previous routes returned fragments even for a full-page browser navigation:
// router.get("", Controllers.Home);
// router.get("/pratical", Controllers.Home_pratical);
// router.get("/ct_home", Controllers.CT_Home);
// router.get("/ct_home_v2", Controllers.CT_Home);
function pageRoute(viewPath, fragmentController) {
  return (req, res, next) => {
    res.vary("X-Requested-With");
    if (req.xhr) return fragmentController(req, res, next);
    res.locals.initialView = viewPath;
    return Controllers.Home(req, res, next);
  };
}
// Previous flat Home: Controllers.Home_pratical and home/Home_patical.ejs remain unloaded.
// router.get("", pageRoute("/home/pratical", Controllers.Home_pratical));
// router.get("/pratical", pageRoute("/home/pratical", Controllers.Home_pratical));
// Previous active Home routes; PageRouter now redirects them to /discover.
// router.get("", pageRoute("/home/pratical", require('../modules/home/controller/HomeController').page));
// router.get("/pratical", pageRoute("/home/pratical", require('../modules/home/controller/HomeController').page));
// Legacy Feed remains in CT_Home and home/CT_Home.ejs for reference.
// router.get("/ct_home_v2", pageRoute("/home/ct_home_v2", Controllers.CT_Home));
// router.get("/ct_home_v2", pageRoute("/home/ct_home_v2", require('../modules/feed/controller/FeedController').page));
// Previous catalogue Library remains in CT_Home_v2 and CT_Home_V2.ejs, unloaded.
// router.get("/ct_home", pageRoute("/home/ct_home", Controllers.CT_Home_v2));
// router.get("/ct_home", pageRoute("/home/ct_home", require('../modules/library/controller/LibraryController').page));
router.get("/test", Controllers.Home_NEW);
router.get('/search/suggestions', require('../controllers/CTL_search').suggest);
router.get('/search', require('../controllers/CTL_search').show);
router.get("/song/:id", require("../controllers/CTL_track").show);
router.get("/find/:id", Controllers.Find_ID);
router.get("/fetch", Controllers.Fetch);
router.get("/category/:categoryId", Controllers.GetSongsByCategory);


router.post("/play-song", Controllers.PlaySong);
router.get("/play-history", Controllers.GetPlayHistory);
router.delete("/play-history", Controllers.ClearPlayHistory);
router.delete("/play-history/:songId", Controllers.RemoveFromHistory);

module.exports = router;
