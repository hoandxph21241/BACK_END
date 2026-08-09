const UserRepository = require("../repository/UserRepository");
const ApiError = require("../../../utils/ApiError");
const ErrorCode = require("../../../constants/ErrorCode");

class UserService {

    /**
     * Lấy User theo Mongo ObjectId
     */
    async getById(id) {

        const user = await UserRepository.findById(id);

        if (!user) {
            throw new ApiError(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

    /**
     * Lấy User theo UserID
     */
    async getByUserId(userID) {

        const user = await UserRepository.findByUserId(userID);

        if (!user) {
            throw new ApiError(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

    /**
     * Lấy User theo tài khoản đăng nhập
     */
    async getByAccount(nameAccount) {

        const user = await UserRepository.findByAccount(nameAccount);

        if (!user) {
            throw new ApiError(ErrorCode.AUTH_ACCOUNT_NOT_FOUND);
        }

        return user;
    }

    /**
     * Kiểm tra tài khoản đã tồn tại hay chưa
     */
    async checkAccountExists(nameAccount) {

        const user = await UserRepository.findByAccount(nameAccount);

        if (user) {
            throw new ApiError(ErrorCode.AUTH_ACCOUNT_EXISTS);
        }

        return false;
    }

    /**
     * Lấy User theo Gmail
     */
    async getByGmail(gmail) {

        return await UserRepository.findByGmail(gmail);
    }

    /**
     * Tìm User theo Refresh Token
     */
    async getByRefreshToken(token) {

        const user = await UserRepository.findByRefreshToken(token);

        if (!user) {
            throw new ApiError(ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
        }

        return user;
    }

    /**
     * Tạo User mới
     */
    async create(data) {

        return await UserRepository.create(data);
    }

    /**
     * Lưu User
     */
    async save(user) {

        return await UserRepository.save(user);
    }

    /**
     * Cập nhật User
     */
    async update(id, data) {

        const user = await UserRepository.update(id, data);

        if (!user) {
            throw new ApiError(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

    /**
     * Xóa User
     */
    async delete(id) {

        const user = await UserRepository.delete(id);

        if (!user) {
            throw new ApiError(ErrorCode.USER_NOT_FOUND);
        }

        return user;
    }

}

module.exports = new UserService();