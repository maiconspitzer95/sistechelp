import { Router } from 'express';
import { listNotifications, markAsRead } from './notifications.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';

const router = Router();

router.get('/', authMiddleware, listNotifications);
router.post('/:id/read', authMiddleware, markAsRead);

export default router;
