import { Router } from 'express';
import { listUsers, listTechnicians, createUser, updateUser, listProfiles } from './users.controller.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.js';

const router = Router();

router.get('/profiles', authMiddleware, listProfiles);
router.get('/technicians', authMiddleware, listTechnicians);
router.get('/', authMiddleware, listUsers);
router.post('/', authMiddleware, requireRole(['master', 'gestor']), createUser);
router.put('/:id', authMiddleware, requireRole(['master', 'gestor']), updateUser);

export default router;
