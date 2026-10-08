const Joi = require("joi");

class CategoryValidator {
  static create = Joi.object({
    nameCategory: Joi.string()
      .trim()
      .required()
      .messages({
        "string.empty": "Category name is required.",
        "any.required": "Category name is required.",
        "string.base": "Category name must be a string.",
      }),

    image: Joi.any()
      .allow("", null)
      .optional(),
  });

  static update = Joi.object({
    nameCategory: Joi.string()
      .trim()
      .optional(),

    image: Joi.any()
      .allow("", null)
      .optional(),
  }).min(1);
}

module.exports = CategoryValidator;