"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assistant_controller_js_1 = require("./assistant.controller.js");
const auth_js_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
router.post('/ask', auth_js_1.authMiddleware, assistant_controller_js_1.askAssistant);
exports.default = router;
