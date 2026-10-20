const Joi = require('joi');

function isWebLink(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

const optionalText = max => Joi.string().trim().max(max).allow('');
const extraProfileFields = {
  firstName: optionalText(60),
  lastName: optionalText(60),
  city: optionalText(80),
  country: optionalText(80),
  links: Joi.array().max(5).unique('url').items(Joi.object({
    label: optionalText(60).default(''),
    url: Joi.string().trim().max(2048).custom((value, helpers) =>
      isWebLink(value) ? value : helpers.error('any.invalid')).required(),
  }).unknown(false)),
};

const webProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(1).max(80).required(),
  profileTag: Joi.string().trim().lowercase().replace(/^#/, '').pattern(/^hz\d{3,12}$/).required(),
  bio: optionalText(500),
  ...extraProfileFields,
}).unknown(false);

function parseProfileForm(body = {}) {
  // Only profile fields may reach $set; absent optional fields preserve older clients' data.
  const input = Object.fromEntries(Object.keys(webProfileSchema.describe().keys)
    .filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (typeof input.links === 'string') {
    try { input.links = JSON.parse(input.links); }
    // Previous: catch { throw new Error('Danh sách liên kết không hợp lệ.'); }
    catch { throw new Error('Invalid link list.'); }
  }
  const { error, value } = webProfileSchema.validate(input, { abortEarly: false });
  if (error) {
    const field = error.details[0].path[0];
    // Previous validation copy:
    // fullName: 'Tên hiển thị cần từ 1 đến 80 ký tự.'
    // profileTag: 'Biệt danh có dạng #hz231: hz và từ 3 đến 12 chữ số.'
    // bio: 'Giới thiệu tối đa 500 ký tự.'
    // firstName: 'Tên tối đa 60 ký tự.'; lastName: 'Họ tối đa 60 ký tự.'
    // city: 'Thành phố tối đa 80 ký tự.'; country: 'Quốc gia tối đa 80 ký tự.'
    // links: 'Thêm tối đa 5 liên kết khác nhau, dùng URL http:// hoặc https:// và nhãn tối đa 60 ký tự.'
    // Fallback: 'Thông tin hồ sơ không hợp lệ.'
    const messages = {
      fullName: 'Display name must be 1 to 80 characters.',
      profileTag: 'Use hz followed by 3 to 12 digits, e.g. #hz231.',
      bio: 'Bio must be 500 characters or fewer.',
      firstName: 'First name must be 60 characters or fewer.', lastName: 'Last name must be 60 characters or fewer.',
      city: 'City must be 80 characters or fewer.', country: 'Country must be 80 characters or fewer.',
      links: 'Add up to 5 unique http:// or https:// links with titles of 60 characters or fewer.',
    };
    throw new Error(messages[field] || 'Invalid profile information.');
  }
  return value;
}

module.exports = { extraProfileFields, parseProfileForm, isWebLink };
