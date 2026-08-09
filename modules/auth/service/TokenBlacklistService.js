class TokenBlacklistService {

    constructor() {

        this.blacklist = new Map();

    }

    add(token, expiresAt) {

        this.blacklist.set(token, expiresAt);

    }

    exists(token) {

        const expires = this.blacklist.get(token);

        if (!expires) {

            return false;

        }

        if (Date.now() > expires) {

            this.blacklist.delete(token);

            return false;

        }

        return true;

    }

    remove(token) {

        this.blacklist.delete(token);

    }

    clearExpired() {

        const now = Date.now();

        for (const [token, expires] of this.blacklist.entries()) {

            if (expires <= now) {

                this.blacklist.delete(token);

            }

        }

    }

    clearAll() {

        this.blacklist.clear();

    }

}

module.exports = new TokenBlacklistService();