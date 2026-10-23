"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_js_1 = require("./audit.controller.js");
const auth_js_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.authMiddleware, (0, auth_js_1.requireRole)(['master']), audit_controller_js_1.listAuditLogs);
exports.default = router;
