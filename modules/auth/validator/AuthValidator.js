const Joi = require("joi");
const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");

const account = Joi.string().trim().max(254).required();
const loginSchema = Joi.object({
  nameAccount: account,
  namePassword: Joi.string().required(),
  // Previous: Joi.string().max(32) rejected the empty optional native form field.
  twoFactorCode: Joi.string().trim().empty('').max(32),
  // Native form checkboxes submit "true"; these flags still require fresh credentials and 2FA.
  reactivate: Joi.boolean(),
  cancelDeletion: Joi.boolean(),
});
const registerSchema = Joi.object({
  nameAccount: account,
  namePassword: Joi.string().min(8).custom((value, helpers) =>
    Buffer.byteLength(value, "utf8") > 72 ? helpers.error("any.invalid") : value,
  ).required(),
  confirmPassword: Joi.string().valid(Joi.ref("namePassword")),
  gmail: Joi.string().email().allow(""),
  fullName: Joi.string().trim().max(80).allow(""),
});

function validate(schema, data, message) {
  const result = schema.validate(data || {}, { stripUnknown: true });
  if (result.error) {
    throw new ApiError({ ...ErrorCode.VALIDATION.FAILED, message });
  }
  return result.value;
}

module.exports = {
  login: (data) => validate(loginSchema, data, "Vui lòng nhập tài khoản và mật khẩu hợp lệ."),
  register: (data) => validate(registerSchema, data,
    "Thông tin không hợp lệ. Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte và xác nhận phải trùng khớp."),
};
