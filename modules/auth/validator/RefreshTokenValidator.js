const Joi = require("joi");

const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class RefreshTokenValidator extends BaseValidator {

    rules() {

        return {

            refreshToken: Joi.string()
                .required(),

        };

    }

}

module.exports = new RefreshTokenValidator();