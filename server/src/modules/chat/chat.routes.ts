import { Router } from 'express';
import { listMessages, sendMessage } from './chat.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';

const router = Router();

router.get('/:chamadoId', authMiddleware, listMessages);
router.post('/:chamadoId', authMiddleware, sendMessage);

export default router;
