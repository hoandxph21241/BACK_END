const Joi = require("joi");
const { extraProfileFields } = require('../../../utils/profileFields');

class ProfileValidator {
  static update = Joi.object({
    userName: Joi.string().trim().min(2).max(50),
    fullName: Joi.string().trim().max(100).allow(""),
    gmail: Joi.string().trim().email().lowercase(),
    oldPassword: Joi.string().max(1024),
    imageAccount: Joi.string().trim().max(2048).allow(""),
    grender: Joi.string().trim().max(30).allow(""),
    bio: Joi.string().trim().max(500).allow(""),
    ...extraProfileFields,
  }).min(1);
}

module.exports = ProfileValidator;
