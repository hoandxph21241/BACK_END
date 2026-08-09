class UserMapper {

    toLoginResponse(user, tokens) {

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,

            user: {
                id: user._id,
                userID: user.userID,
                account: user.nameAccount,
                fullName: user.fullName,
                avatar: user.imageAccount,
                gmail: user.gmail,
                role: user.role,
            },
        };

    }

}

module.exports = new UserMapper();