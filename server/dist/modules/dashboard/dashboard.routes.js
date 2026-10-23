"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_js_1 = require("./dashboard.controller.js");
const auth_js_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
router.get('/overview', auth_js_1.authMiddleware, (0, auth_js_1.requireRole)(['master', 'gestor', 'tecnico']), dashboard_controller_js_1.getDashboardOverview);
exports.default = router;
