const HttpStatus = require("./HttpStatus");

const ErrorCode = Object.freeze({
  // AUTH
  AUTH_ACCOUNT_EXISTS: {
    code: "AUTH_001",
    status: HttpStatus.CONFLICT,
    message: "Account already exists.",
  },
  AUTH_ACCOUNT_NOT_FOUND: {
    code: "AUTH_002",
    status: HttpStatus.NOT_FOUND,
    message: "Account does not exist.",
  },
  AUTH_INVALID_PASSWORD: {
    code: "AUTH_003",
    status: HttpStatus.BAD_REQUEST,
    message: "Incorrect password.",
  },
  AUTH_INVALID_TOKEN: {
    code: "AUTH_004",
    status: HttpStatus.UNAUTHORIZED,
    message: "Invalid access token.",
  },
  AUTH_REFRESH_TOKEN_INVALID: {
    code: "AUTH_005",
    status: HttpStatus.UNAUTHORIZED,
    message: "Invalid refresh token.",
  },
  AUTH_REFRESH_TOKEN_EXPIRED: {
    code: "AUTH_006",
    status: HttpStatus.UNAUTHORIZED,
    message: "Refresh token expired.",
  },
  AUTH_UNAUTHORIZED: {
    code: "AUTH_007",
    status: HttpStatus.UNAUTHORIZED,
    message: "Unauthorized.",
  },
  AUTH_FORBIDDEN: {
    code: "AUTH_008",
    status: HttpStatus.FORBIDDEN,
    message: "Permission denied.",
  },
  // USER
  USER_NOT_FOUND: {
    code: "USER_001",
    status: HttpStatus.NOT_FOUND,
    message: "User not found.",
  },
  USER_UPDATE_FAILED: {
    code: "USER_002",
    status: HttpStatus.BAD_REQUEST,
    message: "User update failed.",
  },
  // SONG
  SONG_NOT_FOUND: {
    code: "SONG_001",
    status: HttpStatus.NOT_FOUND,
    message: "Song not found.",
  },
  SONG_UPLOAD_FAILED: {
    code: "SONG_002",
    status: HttpStatus.BAD_REQUEST,
    message: "Song upload failed.",
  },
  // CATEGORY
  CATEGORY_NOT_FOUND: {
    code: "CATEGORY_001",
    status: HttpStatus.NOT_FOUND,
    message: "Category not found.",
  },
  // PLAYLIST
  PLAYLIST_NOT_FOUND: {
    code: "PLAYLIST_001",
    status: HttpStatus.NOT_FOUND,
    message: "Playlist not found.",
  },
  // SYSTEM
  SYSTEM_ERROR: {
    code: "SYSTEM_001",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: "Internal server error.",
  },
  DATABASE_ERROR: {
    code: "SYSTEM_002",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: "Database error.",
  },
  VALIDATION_ERROR: {
    code: "SYSTEM_003",
    status: HttpStatus.BAD_REQUEST,
    message: "Validation failed.",
  },
});

module.exports = ErrorCode;
