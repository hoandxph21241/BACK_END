const express = require("express");
const router = express.Router();

const SongController = require("../controller/SongController");
const SongValidator = require("../validator/SongValidator");
const validate = require("../../../middlewares/validate/validate");
const { verifyAccessToken, uploadSong } = require("../../../middlewares");

//------------------------------------
// Public
//------------------------------------
router.get("/", SongController.getAll);
router.get("/newest", SongController.newest);
router.get("/trending", SongController.trending);
router.get("/random", SongController.random);
router.get("/search", SongController.search);
router.get("/category/:categoryId", SongController.getByCategory);
router.get("/:id/stream", SongController.stream);
router.get("/:id", SongController.getById);

//------------------------------------
// Upload
//------------------------------------
router.post(
  "/",
  verifyAccessToken,
  uploadSong,
  validate(SongValidator.upload),
  SongController.upload
);

//------------------------------------
// Update
//------------------------------------
router.put(
  "/:id",
  verifyAccessToken,
  validate(SongValidator.update),
  SongController.update
);

//------------------------------------
// Delete
//------------------------------------
router.delete("/:id", verifyAccessToken, SongController.delete);

module.exports = router;
