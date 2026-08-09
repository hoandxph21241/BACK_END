const BaseService = require("../../../common/service/BaseService");

const SongRepository = require("../repository/SongRepository");

const CategoryRepository = require("../../category/repository/CategoryRepository");

const SongValidator = require("../validator/SongValidator");

const ApiError = require("../../../utils/ApiError");

const { ErrorCode } = require("../../../constants");

class SongService extends BaseService {
  constructor() {
    super(
      SongRepository,

      ErrorCode.SONG.NOT_FOUND,
    );
  }

  //------------------------------------
  // Upload Song
  //------------------------------------

  async Upload(id, data) {
    if (data.categoryId) {
      const category = await CategoryRepository.findById(data.categoryId);

      if (!category) {
        throw new ApiError(ErrorCode.CATEGORY.NOT_FOUND);
      }
    }

    return super.Upload(id, data);
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
    SongValidator.update(data);
    //--------------------------------
    // Check Category
    //--------------------------------
    if (data.categoryId) {
      const category = await CategoryRepository.findById(data.categoryId);
      if (!category) {
        throw new ApiError(ErrorCode.CATEGORY.NOT_FOUND);
      }
    }
    return super.update(id, data);
  }

  //------------------------------------
  // Stream
  //------------------------------------

  async stream(id) {
    return this.getById(id);
  }
}

module.exports = new SongService();
