const ApiError = require("../../utils/ApiError");
const { ErrorCode } = require("../../constants");

module.exports = (req, res, next) => {

    next(

        new ApiError({

            code: "ROUTE_001",

            status: 404,

            message: `Route ${req.originalUrl} not found.`

        })

    );

};