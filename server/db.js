const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const { Pool } = require("pg");

const DBURI = process.env.DB_URI;

if (!DBURI) {
  throw new Error("DB_URI is not defined in server/.env");
}

const pool = new Pool({ connectionString: DBURI });

module.exports = pool;
