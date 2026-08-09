const Joi = require("joi");

const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class LoginValidator extends BaseValidator {

    rules() {

        return {

            nameAccount: Joi.string()
                .trim()
                .required(),

            namePassword: Joi.string()
                .min(6)
                .max(32)
                .required(),

        };

    }

}

module.exports = new LoginValidator();