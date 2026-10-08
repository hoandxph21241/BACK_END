const Joi = require("joi");

class ChangePasswordValidator {
  static change = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
  });
}

module.exports = ChangePasswordValidator;
