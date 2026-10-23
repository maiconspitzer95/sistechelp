import { Router } from 'express';
import { askAssistant } from './assistant.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';

const router = Router();

router.post('/ask', authMiddleware, askAssistant);

export default router;
