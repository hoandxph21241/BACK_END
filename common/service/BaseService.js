const ApiError = require("../../utils/ApiError");

class BaseService {
  constructor(repository, errorCode = null) {
    this.repository = repository;

    this.errorCode = errorCode;
  }

  async getAll(filter = {}) {
    return this.repository.find(filter);
  }

  async getById(id) {
    const entity = await this.repository.findById(id);

    if (!entity && this.errorCode) {
      throw new ApiError(this.errorCode);
    }

    return entity;
  }

  async create(data) {
    return this.repository.create(data);
  }

  async update(id, data) {
    await this.getById(id);

    return this.repository.update(id, data);
  }

  async delete(id) {
    await this.getById(id);

    return this.repository.delete(id);
  }

  async paginate(page = 1, limit = 10, filter = {}) {
    return this.repository.paginate(
      filter,

      page,

      limit,
    );
  }

  async exists(filter) {
    return this.repository.exists(filter);
  }
  async findOne(filter) {
    return this.repository.findOne(filter);
  }
  async transaction(callback) {
    return callback();
  }
}

module.exports = BaseService;
