const Logger = require("../../utils/Logger");

module.exports = (req, res, next) => {

    const start = Date.now();

    res.on("finish", () => {

        Logger.info(

            `${req.method} ${req.originalUrl}`,

            {

                status: res.statusCode,

                duration: `${Date.now() - start} ms`,

                ip: req.ip,

            }

        );

    });

    next();

};