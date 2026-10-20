const { MongoStore, createWebCryptoAdapter } = require("connect-mongo");

module.exports = function createSessionConfig({ clientPromise, env = process.env, collectionName = "webSessions" }) {
  const secret = typeof env.SESSION_SECRET === "string" ? env.SESSION_SECRET.trim() : "";
  if (Buffer.byteLength(secret) < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 bytes. Run: node scripts/configure-session.cjs");
  }
  const hours = Number(env.SESSION_TTL_HOURS ?? 168);
  if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
    throw new Error("SESSION_TTL_HOURS must be an integer from 1 to 720.");
  }
  const proxy = (env.TRUST_PROXY || "").trim();
  if (proxy === "true") throw new Error("TRUST_PROXY must specify trusted IPs/subnets or a known proxy hop count, not true.");
  const trustProxy = !proxy || proxy === "false" || proxy === "0" ? false : /^\d+$/.test(proxy) ? Number(proxy) : proxy;
  const maxAge = hours * 60 * 60 * 1000;
  const store = MongoStore.create({
    clientPromise,
    collectionName,
    ttl: maxAge / 1000,
    autoRemove: "native",
    touchAfter: 60,
    cryptoAdapter: createWebCryptoAdapter({ secret, salt: "MediaHz:web-session:v1" }),
  });
  store.on("error", () => console.error("Web session storage is unavailable."));
  return {
    trustProxy,
    options: {
      // Keep the existing cookie name so WebAuthController.logout can clear it.
      name: "connect.sid",
      secret,
      store,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        maxAge,
        path: "/",
      },
    },
  };
};
