class SessionService {

    /**
     * Lưu Refresh Token
     */
    async create(user, refreshToken, req) {

        // Xóa token hết hạn
        user.refreshTokens = user.refreshTokens.filter(

            session => session.expiresAt > new Date()

        );

        user.refreshTokens.push({

            token: refreshToken,

            device:
                req.headers["x-device-name"] ||
                req.headers["user-agent"] ||
                "Unknown Device",

            createdAt: new Date(),

            expiresAt: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
            )

        });

        await user.save();

    }

    /**
     * Kiểm tra Refresh Token có tồn tại không
     */
    verify(user, refreshToken) {

        return user.refreshTokens.find(

            session => session.token === refreshToken

        );

    }

    /**
     * Xóa 1 thiết bị
     */
    async remove(user, refreshToken) {

        user.refreshTokens = user.refreshTokens.filter(

            session => session.token !== refreshToken

        );

        await user.save();

    }

    /**
     * Đăng xuất toàn bộ thiết bị
     */
    async removeAll(user) {

        user.refreshTokens = [];

        await user.save();

    }

    /**
     * Danh sách thiết bị
     */
    getSessions(user) {

        return user.refreshTokens.map(session => ({

            device: session.device,

            createdAt: session.createdAt,

            expiresAt: session.expiresAt

        }));

    }

}

module.exports = new SessionService();