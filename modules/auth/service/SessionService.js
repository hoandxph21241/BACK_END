const JwtService = require("./JwtService");

class SessionService {
    async createSession(user, device = "Unknown Device") {
        if (!user || typeof user.save !== "function") {
            throw new Error(
                "SessionService.createSession: user must be a Mongoose document",
            );
        }

        const accessToken = JwtService.generateAccessToken(user);
        const refreshToken = JwtService.generateRefreshToken(user);

        // Loại bỏ refresh token đã hết hạn.
        user.refreshTokens = (user.refreshTokens || []).filter(
            (item) => new Date(item.expiresAt) > new Date(),
        );

        // Thêm refresh token mới.
        user.refreshTokens.push({
            token: refreshToken,
            device,
            createdAt: new Date(),
            expiresAt: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
        });

        // Lưu trực tiếp Mongoose document.
        await user.save();

        return {
            accessToken,
            refreshToken,
        };
    }
}

module.exports = new SessionService();

