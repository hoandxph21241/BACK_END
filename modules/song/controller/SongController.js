const BaseController = require("../../../common/controller/BaseController");

const SongService = require("../service/SongService");

const SongMapper = require("../mapper/SongMapper");

class SongController extends BaseController {
  constructor() {
    super(SongService, SongMapper);
  }

  //------------------------------------
  // Upload Song
  //------------------------------------

  upload = async (req, res) => {
    const data = await this.service.upload({
      ...req.body,
      data: req.file.buffer,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      duration: req.body.duration,
      image: req.body.image,
    });

    return this.success(res, this.mapper.detail(data));
  };

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

  stream = async (req, res) => {
    const data = await this.service.stream(req.params.id);

    return this.success(res, this.mapper.detail(data));
  };
}

module.exports = new SongController();
