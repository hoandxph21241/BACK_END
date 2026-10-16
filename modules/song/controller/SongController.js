const BaseController = require("../../../common/controller/BaseController");
const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");
const SongService = require("../service/SongService");
const GridFS = require("../../../utils/GridFS");

const SongMapper = require("../mapper/SongMapper");
const fs = require("fs/promises");
const uploadImageToImgBB = require("../../../utils/songCover");

class SongController extends BaseController {
  constructor() {
    super(SongService, SongMapper);
  }

  upload = async (req, res) => {
    try {
      if (!req.file) {
        throw new ApiError(ErrorCode.SONG.FILE_REQUIRED);
      }

      let image = req.body.image;
      if (req.songImage) {
        const result = await uploadImageToImgBB(req.songImage.path);
        // if (!result.success) throw new ApiError(ErrorCode.SONG.UPLOAD_FAILED);
        if (!result.success) throw new ApiError({
          ...ErrorCode.SONG.UPLOAD_FAILED,
          status: result.status || 502,
          message: result.error || ErrorCode.SONG.UPLOAD_FAILED.message,
        });
        image = { ...result.data, originalName: req.songImage.originalname };
      }
      const data = await this.service.upload({
        ...req.body,
        image,
        userID: req.user?.userID || req.user?.id,
        file: req.file,
        originalName: req.file.originalname,
        fileSize: req.file.size,
      });

      return this.success(res, this.mapper.detail(data));
    } finally {
      // Xóa file tạm sau khi upload thành công hoặc thất bại.
//       if (req.file?.path) {
//         await fs.unlink(req.file.path).catch((error) => {
//           if (error.code !== "ENOENT") {
//             console.error("Cannot remove temporary song file:", error.message);
//           }
//         });
//       }
      for (const file of [req.file, req.songImage]) {
        if (file?.path) await fs.unlink(file.path).catch(error => {
          if (error.code !== "ENOENT") console.error("Cannot remove temporary song file:", error.message);
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

      // Previous full-file response (kept for reference):
      // res.setHeader("Content-Type", file.contentType || "audio/mpeg");
      // res.setHeader("Content-Length", file.length);
      // const downloadStream = GridFS.openDownloadStream(file._id);
      const fileSize = file.length;
      let start = 0;
      let end = fileSize - 1;
      const range = req.headers.range;

      res.setHeader("Accept-Ranges", "bytes");
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        const invalidRange = () => {
          res.setHeader("Content-Range", `bytes */${fileSize}`);
          return res.sendStatus(416);
        };
        if (!match || (!match[1] && !match[2])) return invalidRange();

        if (!match[1]) {
          const suffixLength = Number(match[2]);
          if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            return invalidRange();
          }
          start = Math.max(0, fileSize - suffixLength);
        } else {
          start = Number(match[1]);
          const requestedEnd = match[2] ? Number(match[2]) : end;
          if (!Number.isSafeInteger(requestedEnd)) return invalidRange();
          end = Math.min(requestedEnd, end);
        }
        if (!Number.isSafeInteger(start) || start >= fileSize || end < start) {
          return invalidRange();
        }
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      }

      res.setHeader("Content-Type", file.contentType || "audio/mpeg");
      res.setHeader("Content-Length", range ? end - start + 1 : fileSize);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.filename)}"`,
      );

      // GridFS uses an exclusive end offset.
      const downloadStream = GridFS.openDownloadStream(
        file._id,
        range ? { start, end: end + 1 } : {},
      );

      downloadStream.on("error", next);
      res.once("close", () => downloadStream.destroy());
      downloadStream.pipe(res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new SongController();
