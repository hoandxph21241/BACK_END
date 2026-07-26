const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

class CreateSongValidator {

    static validate(data) {

        if (!data.name) {

            throw new ApiError(

                ErrorCode.SONG.NAME_REQUIRED

            );

        }

        if (!data.data) {

            throw new ApiError(

                ErrorCode.SONG.FILE_REQUIRED

            );

        }

    }

}

module.exports = CreateSongValidator;