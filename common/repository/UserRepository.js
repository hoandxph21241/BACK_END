const { BaseRepository } = require("../common");
const { UserModel } = require("../model/db_song");

class UserRepository extends BaseRepository {

    constructor() {

        super(UserModel);

    }

    async findByAccount(nameAccount) {

        return this.findOne({
            nameAccount
        });

    }

    async findByUserId(userID) {

        return this.findOne({
            userID
        });

    }

    async findByRefreshToken(token) {

        return this.findOne({
            "refreshTokens.token": token
        });

    }

}

module.exports = new UserRepository();