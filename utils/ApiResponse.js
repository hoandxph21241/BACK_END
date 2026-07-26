const { HttpStatus } = require("../constants");

class ApiResponse {
  static success(
    res,
    data = null,
    message = "Success",
    status = HttpStatus.OK,
    meta,
  ) {
    const response = {
      success: true,
      statusCode: status,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    if (meta) {
      response.meta = meta;
    }
    return res.status(status).json(response);
  }
static error(res, error) {
    return res.status(error.status || 500).json({
        success: false,
        statusCode: error.status || 500,
        message: error.message,
        error: {
            code: error.code || "UNKNOWN",
        },
        timestamp: new Date().toISOString(),
    });
}
}
module.exports = ApiResponse;
