const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class ProfileValidator extends BaseValidator {

    rules() {

        return {};

    }

}

module.exports = new ProfileValidator();