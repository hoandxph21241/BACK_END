const BaseController = require("../../../common/controller/BaseController");

const CategoryService = require("../service/CategoryService");
const CategoryMapper = require("../mapper/CategoryMapper");

class CategoryController extends BaseController {
  constructor() {
    super(
      CategoryService,
      CategoryMapper
    );
  }

  //------------------------------------
  // Search
  //------------------------------------

  search = async (req, res) => {
    const data =
      await this.service.search(
        req.query.keyword
      );

    return this.success(
      res,
      this.mapper.list(data)
    );
  };

  //------------------------------------
  // Newest
  //------------------------------------

  newest = async (req, res) => {
    const data =
      await this.service.newest(
        Number(req.query.limit) || 10
      );

    return this.success(
      res,
      this.mapper.list(data)
    );
  };
}

module.exports = new CategoryController();