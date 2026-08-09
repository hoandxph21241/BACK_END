const ApiError = require("../../utils/ApiError");

const { ErrorCode } = require("../../constants");

module.exports = (validator) => {
  return (req, res, next) => {
    const {
      error,

      value,
    } = validator.validate(req.body);

    if (error) {
      return next(
        new ApiError({
          ...ErrorCode.VALIDATION_ERROR,

          message: error.details.map((x) => x.message).join(", "),
        }),
      );
    }

    req.body = value;

    next();
  };
};
