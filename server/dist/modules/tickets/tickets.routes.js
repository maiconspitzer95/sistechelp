"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tickets_controller_js_1 = require("./tickets.controller.js");
const categories_controller_js_1 = require("./categories.controller.js");
const auth_js_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Categorias públicas / autenticadas
router.get('/categories', categories_controller_js_1.listCategories);
router.get('/categories/:slug', categories_controller_js_1.getCategoryBySlug);
// Chamados autenticados
router.get('/', auth_js_1.authMiddleware, tickets_controller_js_1.listTickets);
router.get('/queue-stats', auth_js_1.authMiddleware, tickets_controller_js_1.getQueueStats);
router.get('/my-stats', auth_js_1.authMiddleware, tickets_controller_js_1.getMyAssignedStats);
router.get('/my-assigned', auth_js_1.authMiddleware, tickets_controller_js_1.getMyAssignedTickets);
router.get('/:id', auth_js_1.authMiddleware, tickets_controller_js_1.getTicket);
router.post('/', auth_js_1.authMiddleware, tickets_controller_js_1.createTicket);
router.post('/:id/assign', auth_js_1.authMiddleware, tickets_controller_js_1.assignTicket);
router.post('/:id/status', auth_js_1.authMiddleware, tickets_controller_js_1.updateStatus);
router.post('/:id/resolve', auth_js_1.authMiddleware, tickets_controller_js_1.resolveTicket);
router.post('/:id/complete', auth_js_1.authMiddleware, tickets_controller_js_1.completeTicket);
exports.default = router;
