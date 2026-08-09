const BaseValidator =
    require("../../../common/validator/BaseValidator");

const Joi = require("joi");


class SongValidator extends BaseValidator {

    //------------------------------------
    // Upload
    //------------------------------------

    static upload = Joi.object({

        name: Joi.string()
            .trim()
            .required()
            .messages({

                "string.empty":
                    "Song name is required.",

                "any.required":
                    "Song name is required.",

                "string.base":
                    "Song name must be a string.",

            }),

        artist: Joi.string()
            .trim()
            .allow("", null)
            .optional()
            .messages({

                "string.base":
                    "Artist must be a string.",

            }),

        categoryId: Joi.string()
            .trim()
            .allow("", null)
            .optional()
            .messages({

                "string.base":
                    "Category ID must be a string.",

            }),

        userID: Joi.string()
            .trim()
            .allow("", null)
            .optional(),

        originalName: Joi.string()
            .trim()
            .allow("", null)
            .optional(),

        fileSize: Joi.number()
            .positive()
            .allow(null)
            .optional()
            .messages({

                "number.base":
                    "File size must be a number.",

                "number.positive":
                    "File size must be greater than 0.",

            }),

        duration: Joi.number()
            .min(0)
            .allow(null)
            .optional()
            .messages({

                "number.base":
                    "Duration must be a number.",

                "number.min":
                    "Duration cannot be negative.",

            }),

        image: Joi.string()
            .trim()
            .allow("", null)
            .optional(),
    });

    //------------------------------------
    // Update
    //------------------------------------

    static update = Joi.object({

        name: Joi.string()
            .trim()
            .optional()
            .messages({

                "string.empty":
                    "Song name cannot be empty.",

                "string.base":
                    "Song name must be a string.",

            }),

        artist: Joi.string()
            .trim()
            .allow("", null)
            .optional()
            .messages({

                "string.base":
                    "Artist must be a string.",

            }),

        categoryId: Joi.string()
            .trim()
            .allow("", null)
            .optional()
            .messages({

                "string.base":
                    "Category ID must be a string.",

            }),

        originalName: Joi.string()
            .trim()
            .allow("", null)
            .optional(),

        fileSize: Joi.number()
            .positive()
            .allow(null)
            .optional()
            .messages({

                "number.base":
                    "File size must be a number.",

                "number.positive":
                    "File size must be greater than 0.",

            }),

        duration: Joi.number()
            .min(0)
            .allow(null)
            .optional()
            .messages({

                "number.base":
                    "Duration must be a number.",

                "number.min":
                    "Duration cannot be negative.",

            }),

        image: Joi.string()
            .trim()
            .allow("", null)
            .optional(),

    }).min(1);

}

module.exports = SongValidator;