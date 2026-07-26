class CreateSongValidator
extends BaseValidator {

    static validate(req) {

        const {

            name,

            data,

        } = req.body;

        this.required(

            name,

            ErrorCode.SONG.NAME_REQUIRED

        );

        this.required(

            data,

            ErrorCode.SONG.FILE_REQUIRED

        );

    }

}