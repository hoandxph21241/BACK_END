const Joi = require("joi");

class UserValidator {
  static list = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  });

  static identifier = Joi.string().trim().required();
}

module.exports = UserValidator;
