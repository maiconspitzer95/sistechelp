"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_js_1 = require("./chat.controller.js");
const auth_js_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
router.get('/:chamadoId', auth_js_1.authMiddleware, chat_controller_js_1.listMessages);
router.post('/:chamadoId', auth_js_1.authMiddleware, chat_controller_js_1.sendMessage);
exports.default = router;
