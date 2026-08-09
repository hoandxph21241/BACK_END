const Joi = require("joi");

const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class ForgotPasswordValidator extends BaseValidator {

    rules() {

        return {

            gmail: Joi.string()
                .email()
                .required(),

        };

    }

}

module.exports = new ForgotPasswordValidator();