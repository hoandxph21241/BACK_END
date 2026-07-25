class ApiError extends Error {
    constructor(error) {
        super(error.message);
        this.name = "ApiError";
        this.code = error.code;
        this.status = error.status;
        Error.captureStackTrace(this, this.constructor);
    }
}
module.exports = ApiError;