const bcrypt = require("bcrypt");

class PasswordService {

    //-----------------------------------------
    // Hash Password
    //-----------------------------------------

    async hash(password) {

        return await bcrypt.hash(password, 10);

    }

    //-----------------------------------------
    // Compare Password
    //-----------------------------------------

    async compare(password, hashPassword) {

        return await bcrypt.compare(

            password,

            hashPassword

        );

    }

}

module.exports = new PasswordService();