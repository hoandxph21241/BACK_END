module.exports = (Validator) => {

    return (req, res, next) => {

        try {

            Validator.validate(req);

            next();

        } catch (err) {

            next(err);

        }

    };

};