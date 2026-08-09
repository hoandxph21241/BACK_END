const crypto = require("crypto");

const UserService = require("./UserService");

const ApiError = require("../../../utils/ApiError");
const { ErrorCode } = require("../../../constants");

class OtpService {

    /**
     * Sinh OTP ngẫu nhiên
     */
    generate(length = 6) {

        return this.generateCode(length);

    }

    /**
     * Sinh chuỗi số
     */
    generateCode(length = 6) {

        const digits = "0123456789";

        let otp = "";

        for (let i = 0; i < length; i++) {

            otp += digits[
                crypto.randomInt(0, digits.length)
            ];

        }

        return otp;

    }

    /**
     * Lưu OTP vào User
     */
    async saveOtp(user, otp) {

        user.otp = {
            code: otp,
            expiredAt: new Date(
                Date.now() + 5 * 60 * 1000
            ),
        };

        await UserService.save(user);

        return otp;

    }

    /**
     * Xóa OTP
     */
    async clearOtp(user) {

        user.otp = null;

        await UserService.save(user);

    }

    /**
     * Kiểm tra OTP hết hạn
     */
    isExpired(user) {

        if (!user.otp) {

            return true;

        }

        return new Date() > user.otp.expiredAt;

    }

    /**
     * Kiểm tra OTP
     */
    async verifyOtp(user, otp) {

        if (!user.otp) {

            throw new ApiError(
                ErrorCode.AUTH_INVALID_OTP
            );

        }

        if (this.isExpired(user)) {

            throw new ApiError(
                ErrorCode.AUTH_OTP_EXPIRED
            );

        }

        if (user.otp.code !== otp) {

            throw new ApiError(
                ErrorCode.AUTH_INVALID_OTP
            );

        }

        return true;

    }

    /**
     * Tạo OTP quên mật khẩu
     */
    async sendForgotPasswordOtp(gmail) {

        const user = await UserService.getByGmail(gmail);

        if (!user) {

            throw new ApiError(
                ErrorCode.USER_NOT_FOUND
            );

        }

        const otp = this.generate();

        await this.saveOtp(user, otp);

        /**
         * TODO
         * EmailService.sendForgotPasswordOtp(...)
         */

        return otp;

    }

    /**
     * OTP xác thực Email
     */
    async sendVerifyEmailOtp(userId) {

        const user = await UserService.getById(userId);

        const otp = this.generate();

        await this.saveOtp(user, otp);

        /**
         * TODO
         * EmailService.sendVerifyEmailOtp(...)
         */

        return otp;

    }

    /**
     * OTP đăng nhập
     */
    async sendLoginOtp(userId) {

        const user = await UserService.getById(userId);

        const otp = this.generate();

        await this.saveOtp(user, otp);

        /**
         * TODO
         * EmailService.sendLoginOtp(...)
         */

        return otp;

    }

    /**
     * Xác thực OTP và xóa sau khi dùng
     */
    async consumeOtp(user, otp) {

        await this.verifyOtp(user, otp);

        await this.clearOtp(user);

        return true;

    }

}

module.exports = new OtpService();