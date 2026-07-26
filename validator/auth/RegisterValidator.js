const BaseValidate = require("../../common/validator/BaseValidator");

const { ErrorCode } = require("../../constants");

class RegisterValidator extends BaseValidator {
  static validate(req) {
    const {
      nameAccount,

      namePassword,

      confirmPassword,
    } = req.body;

    this.required(
      nameAccount,

      ErrorCode.AUTH.ACCOUNT_REQUIRED,
    );

    this.required(
      namePassword,

      ErrorCode.AUTH.PASSWORD_REQUIRED,
    );

    this.equals(
      namePassword,

      confirmPassword,

      ErrorCode.AUTH.PASSWORD_NOT_MATCH,
    );

    this.minLength(
      namePassword,

      6,

      ErrorCode.AUTH.PASSWORD_TOO_SHORT,
    );
  }
}

module.exports = RegisterValidator;
