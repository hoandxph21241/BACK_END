const crypto = require("crypto");

const UserService = require("./UserService");
const UserRepository = require("../repository/UserRepository");

const ApiError = require("../../../utils/ApiError");

const {
    ErrorCode,
    UserRole,
} = require("../../../constants");

class GoogleAuthService {

    /**
     * Xử lý đăng nhập Google
     * Nếu User chưa tồn tại sẽ tự động tạo tài khoản
     */
    async authenticate(profile) {

        const googleProfile = this.extractProfile(profile);

        let user = await this.findGoogleUser(
            googleProfile.gmail
        );

        if (!user) {

            user = await this.createGoogleUser(
                googleProfile
            );

        } else {

            user = await this.updateGoogleProfile(
                user,
                googleProfile
            );

        }

        return user;

    }

    /**
     * Lấy User theo Gmail
     */
    async findGoogleUser(gmail) {

        return await UserRepository.findByGmail(gmail);

    }

    /**
     * Tạo User mới từ Google
     */
    async createGoogleUser(profile) {

        return await UserService.create({

            userID: crypto.randomUUID(),

            gmail: profile.gmail,

            fullName: profile.fullName,

            imageAccount: profile.avatar,

            Authorization: "GOOGLE",

            role: UserRole.USER,

        });

    }

    /**
     * Đồng bộ Avatar / FullName
     */
    async updateGoogleProfile(user, profile) {

        let changed = false;

        if (
            profile.avatar &&
            profile.avatar !== user.imageAccount
        ) {

            user.imageAccount = profile.avatar;

            changed = true;

        }

        if (
            profile.fullName &&
            profile.fullName !== user.fullName
        ) {

            user.fullName = profile.fullName;

            changed = true;

        }

        if (changed) {

            await UserService.save(user);

        }

        return user;

    }

    /**
     * Liên kết Google Account
     */
    async linkGoogleAccount(userId, profile) {

        const user = await UserService.getById(userId);

        if (!user) {

            throw new ApiError(
                ErrorCode.USER_NOT_FOUND
            );

        }

        const google = this.extractProfile(profile);

        user.gmail = google.gmail;

        user.Authorization = "GOOGLE";

        user.imageAccount = google.avatar;

        user.fullName = google.fullName;

        await UserService.save(user);

        return user;

    }

    /**
     * Tách dữ liệu Google Profile
     */
    extractProfile(profile) {

        if (!profile) {

            throw new ApiError(
                ErrorCode.AUTH_UNAUTHORIZED
            );

        }

        return {

            googleId: profile.id,

            gmail: profile.emails?.[0]?.value,

            fullName: profile.displayName,

            avatar: profile.photos?.[0]?.value,

        };

    }

}

module.exports = new GoogleAuthService();