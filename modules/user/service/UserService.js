const UserRepository = require("../repository/UserRepository");
const ProfileValidator = require("../validator/ProfileValidator");
const ChangePasswordValidator = require("../validator/ChangePasswordValidator");
const UserValidator = require("../validator/UserValidator");

const PasswordService = require("../../auth/service/PasswordService");

const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");

class UserService {
  validationError(error) {
    throw new ApiError({
      ...ErrorCode.VALIDATION.FAILED,
      message: error.details.map((item) => item.message).join(", "),
    });
  }

  async getByIdentifier(identifier) {
    const { error } = UserValidator.identifier.validate(identifier);

    if (error) this.validationError(error);

    const user = await UserRepository.findByIdentifier(identifier);

    if (!user) {
      throw new ApiError(ErrorCode.USER.NOT_FOUND);
    }

    return user;
  }

  async getProfile(identifier) {
    return this.getByIdentifier(identifier);
  }

  async updateProfile(identifier, data) {
    const { error, value } = ProfileValidator.update.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) this.validationError(error);

    const user = await this.getByIdentifier(identifier);

    if (value.gmail && value.gmail !== user.gmail) {
      const existing = await UserRepository.findByGmail(value.gmail);

      if (existing && String(existing._id) !== String(user._id)) {
        throw new ApiError(ErrorCode.USER.EXISTS);
      }
    }

    const updated = await UserRepository.update(user._id, value);

    if (!updated) {
      throw new ApiError(ErrorCode.USER.NOT_FOUND);
    }

    return updated;
  }

  async changePassword(identifier, data) {
    const { error, value } = ChangePasswordValidator.change.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) this.validationError(error);

    const user = await this.getByIdentifier(identifier);

    const matched = await PasswordService.compare(
      value.oldPassword,
      user.namePassword,
    );

    if (!matched) {
      throw new ApiError(ErrorCode.AUTH.INVALID_PASSWORD);
    }

    const hashedPassword = await PasswordService.hash(value.newPassword);

    const updated = await UserRepository.update(user._id, {
      namePassword: hashedPassword,
    });

    if (!updated) {
      throw new ApiError(ErrorCode.USER.NOT_FOUND);
    }

    return { success: true };
  }

  async list(query = {}) {
    const { error, value } = UserValidator.list.validate(query, {
      abortEarly: false,
      convert: true,
    });

    if (error) this.validationError(error);

    return UserRepository.findAllUsers(value);
  }

  async checkAccountExists(nameAccount) {
    const account = nameAccount?.trim();

    if (!account) {
      throw new ApiError(ErrorCode.VALIDATION.REQUIRED);
    }

    const existing = await UserRepository.findByAccount(account);

    if (existing) {
      throw new ApiError(ErrorCode.AUTH.ACCOUNT_EXISTS);
    }

    return false;
  }
  async create(data) {
    if (!data?.nameAccount || !data?.namePassword) {
      throw new ApiError(ErrorCode.VALIDATION.REQUIRED);
    }

    // Kiểm tra tài khoản đã tồn tại chưa
    await this.checkAccountExists(data.nameAccount);

    // Tạo user và lưu vào MongoDB
    return await UserRepository.create({
      ...data,
      nameAccount: data.nameAccount.trim(),
    });
  }
}

module.exports = new UserService();
