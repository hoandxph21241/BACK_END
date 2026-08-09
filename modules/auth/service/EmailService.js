const nodemailer = require("nodemailer");

class EmailService {

    constructor() {

        this.transporter = nodemailer.createTransport({

            service: process.env.MAIL_SERVICE,

            auth: {

                type: "OAuth2",

                user: process.env.EMAIL_SENDER,

                clientId: process.env.CLIENT_ID_MAIL,

                clientSecret: process.env.CLIENT_SECRET_MAIL,

                refreshToken: process.env.REFRESH_TOKEN,

            },

        });

    }

    async sendMail(options) {

        return this.transporter.sendMail({

            from: `"MediaHz" <${process.env.EMAIL_SENDER}>`,

            ...options,

        });

    }

}

module.exports = new EmailService();