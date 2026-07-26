const ApiError = require("../../utils/ApiError");

class BaseValidate {

    static required(value, error) {

        if (

            value === undefined ||

            value === null ||

            value === ""

        ) {

            throw new ApiError(error);

        }

    }

    static minLength(value, min, error) {

        if (!value || value.length < min) {

            throw new ApiError(error);

        }

    }

    static maxLength(value, max, error) {

        if (!value || value.length > max) {

            throw new ApiError(error);

        }

    }

    static email(value, error) {

        const regex =

            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (

            value &&

            !regex.test(value)

        ) {

            throw new ApiError(error);

        }

    }

    static equals(a, b, error) {

        if (a !== b) {

            throw new ApiError(error);

        }

    }

}

module.exports = BaseValidate;