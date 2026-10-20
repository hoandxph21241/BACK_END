const nodemailer = require("nodemailer");
const { google } = require('googleapis');
async function withDeadline(operation) {
    let timer;
    // Previous timeout did not carry an error code: new Error("Mail timeout").
    try { return await Promise.race([operation, new Promise((resolve, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("Mail timeout"), { code: 'ETIMEDOUT' })), 20000); })]); }
    finally { clearTimeout(timer); }
}

class EmailService {
    /* Previous constructor and sendMail retained for reference.
    constructor() {

        this.transporter = nodemailer.createTransport({

            // Previous: service: process.env.MAIL_SERVICE,
            service: process.env.MAIL_SERVICE || "gmail",
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,

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

    */

    constructor() {
        this.oAuth2Client = null;
    }

    assertConfigured() {
        // A refresh token belongs to one client. Never mix fields from two pairs.
        const read = key => typeof process.env[key] === 'string' ? process.env[key].trim() : '';
        const useMailPair = Boolean(read('CLIENT_ID_MAIL') || read('CLIENT_SECRET_MAIL'));
        const config = {
            clientId: read(useMailPair ? 'CLIENT_ID_MAIL' : 'CLIENT_ID'),
            clientSecret: read(useMailPair ? 'CLIENT_SECRET_MAIL' : 'CLIENT_SECRET'),
            refreshToken: read('REFRESH_TOKEN'), sender: read('EMAIL_SENDER'),
            redirectUri: read('REDIRECT_URI_MAIL') || read('REDIRECT_URI'),
            service: read('MAIL_SERVICE') || 'gmail',
        };
        if (!config.clientId || !config.clientSecret || !config.refreshToken || !config.sender) {
            throw Object.assign(new Error('Dịch vụ email chưa được cấu hình đầy đủ. Vui lòng dùng mật khẩu hiện tại hoặc liên hệ quản trị.'),
                { status: 503, code: 'MAIL_CONFIG_INVALID' });
        }
        return config;
    }

    async authenticatedTransport() {
        const config = this.assertConfigured();
        if (!this.oAuth2Client) {
            this.oAuth2Client = new google.auth.OAuth2({
                clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri || undefined,
                transporterOptions: { timeout: 10000, retry: false },
            });
            this.oAuth2Client.setCredentials({ refresh_token: config.refreshToken });
        }
        const result = await this.oAuth2Client.getAccessToken();
        // googleapis returns an object; SMTP expects the token string, not that object.
        const accessToken = typeof result === 'string' ? result : result?.token;
        if (!accessToken || typeof accessToken !== 'string') {
            throw Object.assign(new Error('Google did not return an access token.'), { code: 'EOAUTH2' });
        }
        return nodemailer.createTransport({
            service: config.service, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
            auth: { type: 'OAuth2', user: config.sender, clientId: config.clientId,
                clientSecret: config.clientSecret, refreshToken: config.refreshToken, accessToken },
        });
    }

    async sendMail(options) {
        const config = this.assertConfigured();
        const transporter = await this.authenticatedTransport();
        try { return await transporter.sendMail({ from: `"MediaHz" <${config.sender}>`, ...options }); }
        finally { transporter.close(); }
    }

    async verify() {
        const transporter = await this.authenticatedTransport();
        try { return await withDeadline(transporter.verify()); }
        finally { transporter.close(); }
    }

    /* Previous configuration check:
    assertConfigured() {
        if (["EMAIL_SENDER", "CLIENT_ID_MAIL", "CLIENT_SECRET_MAIL", "REFRESH_TOKEN"].some(key => !process.env[key])) {
            throw Object.assign(new Error("Dịch vụ email chưa được cấu hình. Vui lòng dùng mật khẩu hiện tại hoặc liên hệ quản trị."), { status: 503 });
        }
    }
    */

    async sendPasswordChangeOtp(email, otp) {
        this.assertConfigured();
        const result = await withDeadline(this.sendMail({ to: email, subject: "MediaHz - Mã xác nhận đổi mật khẩu",
            text: `Mã xác nhận đổi mật khẩu MediaHz của bạn: ${otp}\n\nMã có hiệu lực trong 5 phút và chỉ dùng một lần. Không chia sẻ mã này với người khác.\nNếu không yêu cầu đổi mật khẩu, bạn có thể bỏ qua email này.` }));
        if (!result.accepted?.length) throw new Error("OTP mail was not accepted");
    }

    async sendPasswordChangedNotice(email) {
        this.assertConfigured();
        return withDeadline(this.sendMail({ to: email, subject: "MediaHz - Mật khẩu đã được thay đổi",
            text: "Mật khẩu tài khoản MediaHz của bạn vừa được thay đổi. Các phiên đăng nhập cũ đã bị vô hiệu hóa. Nếu không thực hiện thay đổi này, hãy liên hệ quản trị để được hỗ trợ." }));
    }

}

module.exports = new EmailService();
