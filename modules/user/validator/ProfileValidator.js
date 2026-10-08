const Joi = require("joi");

class ProfileValidator {
  static update = Joi.object({
    userName: Joi.string().trim().min(2).max(50),
    fullName: Joi.string().trim().max(100).allow(""),
    gmail: Joi.string().trim().email().lowercase(),
    imageAccount: Joi.string().trim().max(2048).allow(""),
    grender: Joi.string().trim().max(30).allow(""),
  }).min(1);
}

module.exports = ProfileValidator;
