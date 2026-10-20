const Joi = require("joi");
const failure = message => Object.assign(new Error(message), { status: 400 });
const password = Joi.string().min(8).custom((value, helpers) => Buffer.byteLength(value, "utf8") > 72 ? helpers.error("any.invalid") : value);
const schema = Joi.object({
  method: Joi.string().valid("password", "otp").default("password"),
  oldPassword: Joi.when("method", { is: "password", then: Joi.string().max(1024).required(), otherwise: Joi.forbidden() }),
  otp: Joi.when("method", { is: "otp", then: Joi.string().pattern(/^\d{6}$/).required(), otherwise: Joi.forbidden() }),
  challengeId: Joi.when("method", { is: "otp", then: Joi.string().guid({ version: ["uuidv4"] }).required(), otherwise: Joi.forbidden() }),
  newPassword: password.required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")),
}).unknown(false);
exports.change = input => {
  const result = schema.validate(input || {});
  if (result.error) throw failure("Thông tin không hợp lệ. Mật khẩu mới cần ít nhất 8 ký tự, tối đa 72 byte; xác nhận mật khẩu phải trùng khớp.");
  return result.value;
};
