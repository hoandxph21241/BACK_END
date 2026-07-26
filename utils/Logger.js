class Logger {

    static info(message, data = null) {

        console.log(

            `[INFO] ${new Date().toISOString()}`,

            message,

            data ?? ""

        );

    }

    static warn(message, data = null) {

        console.warn(

            `[WARN] ${new Date().toISOString()}`,

            message,

            data ?? ""

        );

    }

    static error(message, data = null) {

        console.error(

            `[ERROR] ${new Date().toISOString()}`,

            message,

            data ?? ""

        );

    }

    static debug(message, data = null) {

        if (process.env.NODE_ENV !== "production") {

            console.log(

                `[DEBUG] ${new Date().toISOString()}`,

                message,

                data ?? ""

            );

        }

    }

}

module.exports = Logger;