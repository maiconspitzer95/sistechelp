import { Router } from 'express';
import { getDashboardOverview } from './dashboard.controller.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.js';

const router = Router();

router.get('/overview', authMiddleware, requireRole(['master', 'gestor', 'tecnico']), getDashboardOverview);

export default router;
