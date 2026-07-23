const authService = require('../../service/auth/AuthService');

 
exports.register =   async (req, res) => {
        try {

            const result = await AuthService.register(req);

            if (result.success) {
                return res.status(201).json(result);
            }

            return res.status(400).json(result);

        } catch (err) {

            console.error("Register Controller Error:", err);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error"
            });

        }
    }


exports.login = async (req, res) => {

    const result = await authService.login(req);

    if(!result.success){
        return res.status(400).json(result);
    }

    return res.json(result);

};
exports.googleLogin = passport.authenticate(
    "google",
    {
        scope: ["profile", "email"],
        session: false,
    }
);
exports.googleCallback = (req, res, next) => {

    passport.authenticate(
        "google",
        {
            session: false,
        },
        async (err, user) => {

            if (err) {
                return res.status(500).json({
                    message: err.message,
                });
            }

            if (!user) {
                return res.status(401).json({
                    message: "Login failed",
                });
            }

            // Gọi AuthService
            return authService.googleCallback(req, res, user);

        }
    )(req, res, next);

};