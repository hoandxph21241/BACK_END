const BaseValidator = require("../../../middlewares/validate/BaseValidator");

class GoogleValidator extends BaseValidator {

    rules() {

        return {};

    }

}

module.exports = new GoogleValidator();