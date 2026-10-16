const BaseService = require("../../../common/service/BaseService");

const SongRepository = require("../repository/SongRepository");
const CategoryRepository = require("../../category/repository/CategoryRepository");

const SongValidator = require("../validator/SongValidator");

const ApiError = require("../../../utils/ApiError");
const crypto = require("crypto");
const { ErrorCode } = require("../../../constants");

const path = require("path");
const GridFS = require("../../../utils/GridFS");
const generateWaveform = require("../../../utils/audioWaveform");

class SongService extends BaseService {
  constructor() {
    super(SongRepository, ErrorCode.SONG.NOT_FOUND);
  }

  // Thay phương thức upload(data) hiện tại bằng phương thức này.
  async upload(data) {
    const file = data.file;

    if (!file?.path) {
      throw new ApiError(ErrorCode.SONG.FILE_REQUIRED);
    }
    if (data.categoryId) {
      const category = await CategoryRepository.findById(data.categoryId);

      if (!category) {
        throw new ApiError(ErrorCode.CATEGORY.NOT_FOUND);
      }
    }

    const originalName = data.originalName || file.originalname;

    const name =
      (typeof data.name === "string" && data.name.trim()) ||
      path.parse(originalName).name;

    let fileId;

    try {
      const waveform = await generateWaveform(file.path);
      fileId = await GridFS.uploadFilePath(file.path, originalName, {
        contentType: file.mimetype || "audio/mpeg",
        metadata: {
          originalName,
        },
      });

      const song = await this.create({
        name,
        artist: data.artist?.trim() || "Unknown",
        album: data.album || "",
        categoryId: data.categoryId || undefined,
        userID: data.userID || undefined,
        originalName,
        fileSize: file.size,
        // Previous: duration: Number(data.duration) || 0,
        duration: waveform.duration,
        waveform,
        image: data.image || undefined,
        fileId,
        songID: crypto.randomUUID(),
        uploadDate: new Date(),
      });

      return song;
    } catch (error) {
      // Nếu lưu metadata thất bại, dọn file vừa tạo trong GridFS.
      if (fileId) {
        try {
          await GridFS.deleteFile(fileId);
        } catch (cleanupError) {
          // Giữ lỗi gốc để middleware xử lý.
          console.error("GridFS cleanup failed:", cleanupError.message);
        }
      }

      throw error;
    }
  }
  //------------------------------------
  // Upload Song
  //------------------------------------

  // async upload(data) {
  //   if (data.categoryId) {
  //     const category = await CategoryRepository.findById(data.categoryId);

  //     if (!category) {
  //       throw new ApiError(ErrorCode.CATEGORY.NOT_FOUND);
  //     }
  //   }

  //   return this.create({
  //     ...data,

  //     // MP3 model yêu cầu songID
  //     songID: crypto.randomUUID(),

  //     uploadDate: new Date(),
  //   });
  // }

  //------------------------------------
  // Search
  //------------------------------------

  async search(keyword) {
    if (!keyword?.trim()) {
      return [];
    }

    return this.repository.search(keyword.trim());
  }

  //------------------------------------
  // Get By Category
  //------------------------------------

  async getByCategory(categoryId) {
    const category = await CategoryRepository.findById(categoryId);

    if (!category) {
      throw new ApiError(ErrorCode.CATEGORY.NOT_FOUND);
    }

    return this.repository.findByCategory(categoryId);
  }

  //------------------------------------
  // Newest
  //------------------------------------

  async newest(limit = 10) {
    return this.repository.newest({}, limit);
  }

  //------------------------------------
  // Trending
  //------------------------------------

  async trending(limit = 10) {
    return this.repository.trending({}, limit);
  }

  //------------------------------------
  // Random
  //------------------------------------

  async random(limit = 10) {
    return this.repository.random({}, limit);
  }

  //------------------------------------
  // Update Song
  //------------------------------------

  async update(id, data) {
    //--------------------------------
    // Validate
    //--------------------------------

    const { error, value } = SongValidator.update.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      throw new ApiError({
        ...ErrorCode.VALIDATION.FAILED,

        message: error.details.map((item) => item.message).join(", "),
      });
    }

    //--------------------------------
    // Check Category
    //--------------------------------

    if (value.categoryId) {
      const category = await CategoryRepository.findById(value.categoryId);

      if (!category) {
        throw new ApiError(ErrorCode.CATEGORY.NOT_FOUND);
      }
    }

    //--------------------------------
    // Update
    //--------------------------------

    return super.update(id, value);
  }

  //------------------------------------
  // Stream
  //------------------------------------

  async stream(id) {
    return this.getById(id);
  }
}

module.exports = new SongService();
