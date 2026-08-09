const Joi = require("joi");

const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class ResetPasswordValidator extends BaseValidator {

    rules() {

        return {

            gmail: Joi.string()
                .email()
                .required(),

            otp: Joi.string()
                .length(6)
                .required(),

            newPassword: Joi.string()
                .min(6)
                .max(32)
                .required(),

        };

    }

}

module.exports = new ResetPasswordValidator();