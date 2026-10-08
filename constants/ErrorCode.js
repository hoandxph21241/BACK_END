const HttpStatus = require("./HttpStatus");

const ErrorCode = Object.freeze({

    //------------------------------------
    // AUTH
    //------------------------------------

    AUTH: {

        ACCOUNT_EXISTS: {
            code: "AUTH_001",
            status: HttpStatus.CONFLICT,
            message: "Account already exists.",
        },

        ACCOUNT_NOT_FOUND: {
            code: "AUTH_002",
            status: HttpStatus.NOT_FOUND,
            message: "Account does not exist.",
        },

        INVALID_PASSWORD: {
            code: "AUTH_003",
            status: HttpStatus.BAD_REQUEST,
            message: "Incorrect password.",
        },

        INVALID_TOKEN: {
            code: "AUTH_004",
            status: HttpStatus.UNAUTHORIZED,
            message: "Invalid access token.",
        },

        INVALID_REFRESH_TOKEN: {
            code: "AUTH_005",
            status: HttpStatus.UNAUTHORIZED,
            message: "Invalid refresh token.",
        },

        REFRESH_TOKEN_EXPIRED: {
            code: "AUTH_006",
            status: HttpStatus.UNAUTHORIZED,
            message: "Refresh token expired.",
        },

        UNAUTHORIZED: {
            code: "AUTH_007",
            status: HttpStatus.UNAUTHORIZED,
            message: "Unauthorized.",
        },

        FORBIDDEN: {
            code: "AUTH_008",
            status: HttpStatus.FORBIDDEN,
            message: "Permission denied.",
        },

        GOOGLE_LOGIN_FAILED: {
            code: "AUTH_009",
            status: HttpStatus.UNAUTHORIZED,
            message: "Google authentication failed.",
        },

    },

    //------------------------------------
    // USER
    //------------------------------------

    USER: {

        NOT_FOUND: {
            code: "USER_001",
            status: HttpStatus.NOT_FOUND,
            message: "User not found.",
        },

        UPDATE_FAILED: {
            code: "USER_002",
            status: HttpStatus.BAD_REQUEST,
            message: "User update failed.",
        },

        DELETE_FAILED: {
            code: "USER_003",
            status: HttpStatus.BAD_REQUEST,
            message: "User delete failed.",
        },

    },

    //------------------------------------
    // SONG
    //------------------------------------

    SONG: {

        NOT_FOUND: {
            code: "SONG_001",
            status: HttpStatus.NOT_FOUND,
            message: "Song not found.",
        },

        NAME_REQUIRED: {
            code: "SONG_002",
            status: HttpStatus.BAD_REQUEST,
            message: "Song name is required.",
        },

        FILE_REQUIRED: {
            code: "SONG_003",
            status: HttpStatus.BAD_REQUEST,
            message: "Song file is required.",
        },

        UPLOAD_FAILED: {
            code: "SONG_004",
            status: HttpStatus.BAD_REQUEST,
            message: "Song upload failed.",
        },

        UPDATE_FAILED: {
            code: "SONG_005",
            status: HttpStatus.BAD_REQUEST,
            message: "Song update failed.",
        },

        DELETE_FAILED: {
            code: "SONG_006",
            status: HttpStatus.BAD_REQUEST,
            message: "Song delete failed.",
        },

        // Added for file validation
        INVALID_FILE_TYPE: {
            code: "SONG_007",
            status: HttpStatus.BAD_REQUEST,
            message: "Invalid song file type.",
        },

    },

    //------------------------------------
    // CATEGORY
    //------------------------------------

    CATEGORY: {

        NOT_FOUND: {
            code: "CATEGORY_001",
            status: HttpStatus.NOT_FOUND,
            message: "Category not found.",
        },

        EXISTS: {
            code: "CATEGORY_002",
            status: HttpStatus.CONFLICT,
            message: "Category already exists.",
        },

    },

    //------------------------------------
    // PLAYLIST
    //------------------------------------

    PLAYLIST: {

        NOT_FOUND: {
            code: "PLAYLIST_001",
            status: HttpStatus.NOT_FOUND,
            message: "Playlist not found.",
        },

        EXISTS: {
            code: "PLAYLIST_002",
            status: HttpStatus.CONFLICT,
            message: "Playlist already exists.",
        },

        NAME_REQUIRED: {
            code: "PLAYLIST_003",
            status: HttpStatus.BAD_REQUEST,
            message: "Playlist name is required.",
        },

    },

    //------------------------------------
    // FAVORITE
    //------------------------------------

    FAVORITE: {

        EXISTS: {
            code: "FAVORITE_001",
            status: HttpStatus.CONFLICT,
            message: "Song already exists in favorites.",
        },

        NOT_FOUND: {
            code: "FAVORITE_002",
            status: HttpStatus.NOT_FOUND,
            message: "Favorite not found.",
        },

    },

    //------------------------------------
    // HISTORY
    //------------------------------------

    HISTORY: {

        NOT_FOUND: {
            code: "HISTORY_001",
            status: HttpStatus.NOT_FOUND,
            message: "History not found.",
        },

    },

    //------------------------------------
    // VALIDATION
    //------------------------------------

    VALIDATION: {

        REQUIRED: {
            code: "VALIDATION_001",
            status: HttpStatus.BAD_REQUEST,
            message: "Required field is missing.",
        },

        INVALID: {
            code: "VALIDATION_002",
            status: HttpStatus.BAD_REQUEST,
            message: "Invalid request.",
        },

        // Added for Joi validation
        INVALID_TYPE: {
            code: "VALIDATION_003",
            status: HttpStatus.BAD_REQUEST,
            message: "Invalid data type.",
        },

        // Added for invalid data format
        INVALID_FORMAT: {
            code: "VALIDATION_004",
            status: HttpStatus.BAD_REQUEST,
            message: "Invalid data format.",
        },

        // General validation error
        FAILED: {
            code: "VALIDATION_005",
            status: HttpStatus.BAD_REQUEST,
            message: "Validation failed.",
        },

    },

    //------------------------------------
    // SYSTEM
    //------------------------------------

    SYSTEM: {

        DATABASE: {
            code: "SYSTEM_001",
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "Database error.",
        },

        INTERNAL: {
            code: "SYSTEM_002",
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "Internal server error.",
        },

    },

});

module.exports = ErrorCode;