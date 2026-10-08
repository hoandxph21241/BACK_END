const BaseRepository = require("../../../common/repository/BaseRepository");
const { CategoryModel } = require("../../../model/db_song");

class CategoryRepository extends BaseRepository {
  constructor() {
    super(CategoryModel);
  }

  async search(keyword) {
    return this.model.find({
      nameCategory: {
        $regex: keyword,
        $options: "i",
      },
    });
  }

  async findByCategoryID(categoryID) {
    return this.model.findOne({ categoryID });
  }

  async newest(limit = 10) {
    return this.model
      .find()
      .sort({ _id: -1 })
      .limit(limit);
  }
}

module.exports = new CategoryRepository();