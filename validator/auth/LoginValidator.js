const BaseValidator =
require("../../common/validator/BaseValidate");

const {

    ErrorCode,

} = require("../../constants");

class LoginValidator extends BaseValidator {

    static validate(req) {

        const {

            nameAccount,

            namePassword,

        } = req.body;

        this.required(

            nameAccount,

            ErrorCode.AUTH.ACCOUNT_REQUIRED

        );

        this.required(

            namePassword,

            ErrorCode.AUTH.PASSWORD_REQUIRED

        );

    }

}

module.exports = LoginValidator;