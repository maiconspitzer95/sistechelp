"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateProtocol = generateProtocol;
const database_js_1 = require("../config/database.js");
async function generateProtocol() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const seqRes = await (0, database_js_1.query)("SELECT nextval('seq_chamados_protocolo') as num");
    const num = seqRes.rows[0].num;
    return `SC-${year}${month}-${num}`;
}
