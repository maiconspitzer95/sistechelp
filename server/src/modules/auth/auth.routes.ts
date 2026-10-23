import { Router } from 'express';
import { login, getMe, changePassword } from './auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/change-password', authMiddleware, changePassword);

export default router;
