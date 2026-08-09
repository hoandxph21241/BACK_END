const ApiResponse = require("../../utils/ApiResponse");

class BaseController {
  constructor(service, mapper) {
    this.service = service;
    this.mapper = mapper;
  }

  //------------------------------------
  // Success
  //------------------------------------

  success(res, data) {
    return ApiResponse.success(res, data);
  }

  //------------------------------------
  // Get All
  //------------------------------------

  getAll = async (req, res) => {
    const data = await this.service.getAll();

    return this.success(res, this.mapper.list(data));
  };

  //------------------------------------
  // Get By ID
  //------------------------------------

  getById = async (req, res) => {
    const data = await this.service.getById(req.params.id);

    return this.success(res, this.mapper.detail(data));
  };

  //------------------------------------
  // Create
  //------------------------------------

  create = async (req, res) => {
    const data = await this.service.create(req.body);

    return this.success(res, this.mapper.detail(data));
  };

  //------------------------------------
  // Update
  //------------------------------------

  update = async (req, res) => {
    const data = await this.service.update(req.params.id, req.body);

    return this.success(res, this.mapper.detail(data));
  };

  //------------------------------------
  // Delete
  //------------------------------------

  delete = async (req, res) => {
    await this.service.delete(req.params.id);

    return this.success(res, null);
  };
}

module.exports = BaseController;
