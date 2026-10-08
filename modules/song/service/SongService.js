const BaseService = require("../../../common/service/BaseService");

const SongRepository = require("../repository/SongRepository");
const CategoryRepository = require("../../category/repository/CategoryRepository");

const SongValidator = require("../validator/SongValidator");

const ApiError = require("../../../utils/ApiError");
const crypto = require("crypto");
const { ErrorCode } = require("../../../constants");

class SongService extends BaseService {
  constructor() {
    super(SongRepository, ErrorCode.SONG.NOT_FOUND);
  }

  //------------------------------------
  // Upload Song
  //------------------------------------

  async upload(data) {
    if (data.categoryId) {
      const category = await CategoryRepository.findById(data.categoryId);

      if (!category) {
        throw new ApiError(ErrorCode.CATEGORY.NOT_FOUND);
      }
    }

    return this.create({
      ...data,

      // MP3 model yêu cầu songID
      songID: crypto.randomUUID(),

      uploadDate: new Date(),
    });
  }

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
