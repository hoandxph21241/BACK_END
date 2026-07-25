const Model = require("../../model/db_song");

class UserService {
  async findByAccount(nameAccount) {
    return await Model.UserModel.findOne({
      nameAccount,
    });
  }
  async findByGmail(gmail) {
    return await Model.UserModel.findOne({
      gmail,
    });
  }
  async findById(id, select = "") {
    let query = Model.UserModel.findById(id);
    if (select) {
      query = query.select(select);
    }
    return await query;
  }
  async create(data) {
    return await Model.UserModel.create(data);
  }
  async save(user) {
    return await user.save();
  }
  async update(id, data) {
    return await Model.UserModel.findByIdAndUpdate(id, data, {
      new: true,
    });
  }
  async delete(id) {
    return await Model.UserModel.findByIdAndDelete(id);
  }
}

module.exports = new UserService();
