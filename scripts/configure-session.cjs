const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const dotenv = require("dotenv");

const file = path.resolve(__dirname, "../../env/B_E_S.env");
const source = fs.readFileSync(file, "utf8");
const values = dotenv.parse(source);
const lines = [];
if (!values.SESSION_SECRET) lines.push("SESSION_SECRET=" + randomBytes(32).toString("hex"));
else if (Buffer.byteLength(values.SESSION_SECRET.trim()) < 32) throw new Error("Existing SESSION_SECRET is too short; it was not changed.");
if (!Object.hasOwn(values, "SESSION_TTL_HOURS")) lines.push("SESSION_TTL_HOURS=168");
if (lines.length) fs.appendFileSync(file, (source.endsWith("\n") ? "" : "\r\n") + lines.join("\r\n") + "\r\n");
console.log(lines.length ? "Session settings added to ../env/B_E_S.env. No existing keys were replaced." : "Session settings already exist. No changes made.");
