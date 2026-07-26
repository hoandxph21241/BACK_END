const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");


router.get("/", SongController.getAll);

router.get("/newest", SongController.newest);

router.get("/trending", SongController.trending);

router.get("/random", SongController.random);

router.get("/search", SongController.search);

router.get("/category/:categoryId", SongController.getByCategory);

router.get("/:id", SongController.getById);

router.post("/", verifyToken, SongController.create);

router.put("/:id", verifyToken, SongController.update);

router.delete("/:id", verifyToken, SongController.delete);

router.get("/:id/stream", SongController.stream);

module.exports = router;