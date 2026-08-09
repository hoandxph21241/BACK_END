const JwtService = require("./JwtService");
const UserRepository = require("../../repository/UserRepository");

class SessionService {

    async createSession(user, device = "Unknown Device") {

        const accessToken = JwtService.generateAccessToken(user);

        const refreshToken = JwtService.generateRefreshToken(user);

        user.refreshTokens = user.refreshTokens.filter(
            (item) => item.expiresAt > new Date(),
        );

        user.refreshTokens.push({
            token: refreshToken,
            device,
            createdAt: new Date(),
            expiresAt: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
            ),
        });

        await UserRepository.save(user);

        return {
            accessToken,
            refreshToken,
        };

    }

}

module.exports = new SessionService();