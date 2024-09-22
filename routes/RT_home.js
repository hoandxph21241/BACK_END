var express = require("express");
var router = express.Router();
var Contronlers = require("../contronller/CTL_home");

router.get("", Contronlers.Home);

router.get("/fetch", Contronlers.Fetch);

module.exports = router;
