const Joi = require("joi");

const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class ChangePasswordValidator extends BaseValidator {

    rules() {

        return {

            oldPassword: Joi.string()
                .required(),

            newPassword: Joi.string()
                .min(6)
                .max(32)
                .required(),

        };

    }

}

module.exports = new ChangePasswordValidator();