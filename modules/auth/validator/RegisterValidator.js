const Joi = require("joi");

const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class RegisterValidator extends BaseValidator {

    rules() {

        return {

            nameAccount: Joi.string()
                .trim()
                .min(4)
                .max(30)
                .required(),

            namePassword: Joi.string()
                .min(6)
                .max(32)
                .required(),

            gmail: Joi.string()
                .email()
                .required(),

            fullName: Joi.string()
                .max(100)
                .allow("")
                .optional(),

        };

    }

}

module.exports = new RegisterValidator();