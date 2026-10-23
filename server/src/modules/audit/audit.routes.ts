import { Router } from 'express';
import { listAuditLogs } from './audit.controller.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.js';

const router = Router();

router.get('/', authMiddleware, requireRole(['master']), listAuditLogs);

export default router;
