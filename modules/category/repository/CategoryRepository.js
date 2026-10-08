const BaseRepository = require("../../../common/repository/BaseRepository");

const { CategoryModel } = require("../../../model/db");

class CategoryRepository extends BaseRepository {
  constructor() {
    super(CategoryModel);
  }

  //------------------------------------
  // Search
  //------------------------------------

  async search(keyword) {
    return this.model.find({
      nameCategory: {
        $regex: keyword,
        $options: "i",
      },
    });
  }

  //------------------------------------
  // Find By Category ID
  //------------------------------------

  async findByCategoryID(categoryID) {
    return this.model.findOne({
      categoryID,
    });
  }

  //------------------------------------
  // Newest
  //------------------------------------

  async newest(limit = 10) {
    return this.model
      .find()
      .sort({ _id: -1 })
      .limit(limit);
  }
}

module.exports = new CategoryRepository();