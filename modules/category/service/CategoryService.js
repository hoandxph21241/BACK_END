const BaseService = require("../../../common/service/BaseService");

const CategoryRepository = require("../repository/CategoryRepository");
const CategoryValidator = require("../validator/CategoryValidator");

const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");

class CategoryService extends BaseService {
  constructor() {
    super(
      CategoryRepository,
      ErrorCode.CATEGORY.NOT_FOUND
    );
  }

  //------------------------------------
  // Create Category
  //------------------------------------

  async create(data) {
    const { error, value } =
      CategoryValidator.create.validate(data, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (error) {
      throw new ApiError({
        ...ErrorCode.VALIDATION.FAILED,
        message: error.details
          .map((item) => item.message)
          .join(", "),
      });
    }

    //--------------------------------
    // Check duplicate
    //--------------------------------

    const existing =
      await CategoryRepository.model.findOne({
        nameCategory: value.nameCategory,
      });

    if (existing) {
      throw new ApiError(
        ErrorCode.CATEGORY.EXISTS
      );
    }

    //--------------------------------
    // Create
    //--------------------------------

    return super.create(value);
  }

  //------------------------------------
  // Search
  //------------------------------------

  async search(keyword) {
    if (!keyword?.trim()) {
      return [];
    }

    return this.repository.search(
      keyword.trim()
    );
  }

  //------------------------------------
  // Newest
  //------------------------------------

  async newest(limit = 10) {
    return this.repository.newest(limit);
  }

  //------------------------------------
  // Update Category
  //------------------------------------

  async update(id, data) {
    const { error, value } =
      CategoryValidator.update.validate(data, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (error) {
      throw new ApiError({
        ...ErrorCode.VALIDATION.FAILED,
        message: error.details
          .map((item) => item.message)
          .join(", "),
      });
    }

    //--------------------------------
    // Check duplicate name
    //--------------------------------

    if (value.nameCategory) {
      const existing =
        await CategoryRepository.model.findOne({
          nameCategory: value.nameCategory,
          _id: { $ne: id },
        });

      if (existing) {
        throw new ApiError(
          ErrorCode.CATEGORY.EXISTS
        );
      }
    }

    return super.update(id, value);
  }
}

module.exports = new CategoryService();