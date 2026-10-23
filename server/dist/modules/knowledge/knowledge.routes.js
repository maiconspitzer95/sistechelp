"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const knowledge_controller_js_1 = require("./knowledge.controller.js");
const router = (0, express_1.Router)();
router.get('/', knowledge_controller_js_1.listArticles);
router.get('/:id', knowledge_controller_js_1.getArticle);
router.post('/:id/vote', knowledge_controller_js_1.voteArticle);
exports.default = router;
