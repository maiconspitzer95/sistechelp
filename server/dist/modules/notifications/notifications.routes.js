"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_js_1 = require("./notifications.controller.js");
const auth_js_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
router.get('/', auth_js_1.authMiddleware, notifications_controller_js_1.listNotifications);
router.post('/:id/read', auth_js_1.authMiddleware, notifications_controller_js_1.markAsRead);
exports.default = router;
