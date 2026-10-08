
const UserService = require("../service/UserService");
const UserMapper = require("../mapper/UserMapper");
const ApiResponse = require("../../../utils/ApiResponse");
const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");

class UserController {
  success(res, data) {
    return ApiResponse.success(res, data);
  }

  getAuthenticatedIdentifier(req) {
    const authUser = req.user;

    const identifier =
      authUser?.userID ??
      authUser?.userId ??
      authUser?.id ??
      authUser?._id ??
      authUser?.sub;

    if (!identifier) {
      throw new ApiError(ErrorCode.AUTH.INVALID_TOKEN);
    }

    return String(identifier);
  }

  getMe = async (req, res) => {
    const identifier = this.getAuthenticatedIdentifier(req);
    const user = await UserService.getProfile(identifier);

    return this.success(res, UserMapper.profile(user));
  };

  updateMyProfile = async (req, res) => {
    const identifier = this.getAuthenticatedIdentifier(req);
    const user = await UserService.updateProfile(identifier, req.body);

    return this.success(res, UserMapper.profile(user));
  };

  changeMyPassword = async (req, res) => {
    const identifier = this.getAuthenticatedIdentifier(req);

    const result = await UserService.changePassword(
      identifier,
      req.body,
    );

    return this.success(res, result);
  };

  getById = async (req, res) => {
    const user = await UserService.getByIdentifier(req.params.id);

    return this.success(res, UserMapper.profile(user));
  };

  list = async (req, res) => {
    const result = await UserService.list(req.query);

    return this.success(res, {
      ...result,
      users: UserMapper.list(result.users),
    });
  };
}

module.exports = new UserController();