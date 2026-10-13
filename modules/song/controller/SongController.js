const BaseController = require("../../../common/controller/BaseController");
const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");
const SongService = require("../service/SongService");
const GridFS = require("../../../utils/GridFS");

const SongMapper = require("../mapper/SongMapper");
const fs = require("fs/promises");

class SongController extends BaseController {
  constructor() {
    super(SongService, SongMapper);
  }

  upload = async (req, res) => {
    try {
      if (!req.file) {
        throw new ApiError(ErrorCode.SONG.FILE_REQUIRED);
      }

      const data = await this.service.upload({
        ...req.body,
        file: req.file,
        originalName: req.file.originalname,
        fileSize: req.file.size,
      });

      return this.success(res, this.mapper.detail(data));
    } finally {
      // Xóa file tạm sau khi upload thành công hoặc thất bại.
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch((error) => {
          if (error.code !== "ENOENT") {
            console.error("Cannot remove temporary song file:", error.message);
          }
        });
      }
    }
  };

  //------------------------------------
  // Upload Song
  //------------------------------------

  // upload = async (req, res) => {
  //   const data = await this.service.upload({
  //     ...req.body,
  //     data: req.file.buffer,
  //     originalName: req.file.originalname,
  //     fileSize: req.file.size,
  //     duration: req.body.duration,
  //     image: req.body.image,
  //   });

  //   return this.success(res, this.mapper.detail(data));
  // };

  //------------------------------------
  // Search
  //------------------------------------

  search = async (req, res) => {
    const data = await this.service.search(req.query.keyword);

    return this.success(res, this.mapper.list(data));
  };

  //------------------------------------
  // Category
  //------------------------------------

  getByCategory = async (req, res) => {
    const data = await this.service.getByCategory(req.params.categoryId);

    return this.success(res, this.mapper.list(data));
  };

  //------------------------------------
  // Newest
  //------------------------------------

  newest = async (req, res) => {
    const data = await this.service.newest();

    return this.success(res, this.mapper.list(data));
  };

  //------------------------------------
  // Trending
  //------------------------------------

  trending = async (req, res) => {
    const data = await this.service.trending();

    return this.success(res, this.mapper.list(data));
  };

  //------------------------------------
  // Random
  //------------------------------------

  random = async (req, res) => {
    const data = await this.service.random();

    return this.success(res, this.mapper.list(data));
  };

  //------------------------------------
  // Stream
  //------------------------------------

  stream = async (req, res, next) => {
    try {
      const song = await this.service.getById(req.params.id);

      if (!song.fileId) {
        return res.status(404).json({
          success: false,
          message: "Audio file not found for this song.",
        });
      }

      const file = await GridFS.findFile(song.fileId);

      if (!file) {
        return res.status(404).json({
          success: false,
          message: "Audio file not found in GridFS.",
        });
      }

      res.setHeader("Content-Type", file.contentType || "audio/mpeg");
      res.setHeader("Content-Length", file.length);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.filename)}"`,
      );

      const downloadStream = GridFS.openDownloadStream(file._id);

      downloadStream.on("error", next);
      downloadStream.pipe(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new SongController();
