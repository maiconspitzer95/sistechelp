"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.getClient = getClient;
const pg_1 = require("pg");
const env_js_1 = require("./env.js");
exports.pool = new pg_1.Pool({
    host: env_js_1.env.DB.host,
    port: env_js_1.env.DB.port,
    database: env_js_1.env.DB.database,
    user: env_js_1.env.DB.user,
    password: env_js_1.env.DB.password,
    ssl: env_js_1.env.DB.ssl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (err) => {
    console.error('Erro inesperado no cliente PostgreSQL:', err);
});
async function query(text, params) {
    const start = Date.now();
    const res = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
        console.log('SQL executado:', { text, duration, rows: res.rowCount });
    }
    return res;
}
async function getClient() {
    return await exports.pool.connect();
}
