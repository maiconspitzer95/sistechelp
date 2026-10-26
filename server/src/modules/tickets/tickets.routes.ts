import { Router } from 'express';
import {
  listTickets,
  getTicket,
  createTicket,
  assignTicket,
  updateStatus,
  resolveTicket,
  completeTicket,
  getQueueStats,
  getMyAssignedStats,
  getMyAssignedTickets,
} from './tickets.controller.js';
import { listCategories, getCategoryBySlug } from './categories.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';

const router = Router();

// Categorias públicas / autenticadas
router.get('/categories', listCategories);
router.get('/categories/:slug', getCategoryBySlug);

// Chamados autenticados
router.get('/', authMiddleware, listTickets);
router.get('/queue-stats', authMiddleware, getQueueStats);
router.get('/my-stats', authMiddleware, getMyAssignedStats);
router.get('/my-assigned', authMiddleware, getMyAssignedTickets);
router.get('/:id', authMiddleware, getTicket);
router.post('/', authMiddleware, createTicket);
router.post('/:id/assign', authMiddleware, assignTicket);
router.post('/:id/status', authMiddleware, updateStatus);
router.post('/:id/resolve', authMiddleware, resolveTicket);
router.post('/:id/complete', authMiddleware, completeTicket);

export default router;
