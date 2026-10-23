import { Router } from 'express';
import { listSectors, createSector, updateSector } from './sectors.controller.js';
import { authMiddleware, requireRole } from '../../middlewares/auth.js';

const router = Router();

router.get('/', listSectors);
router.post('/', authMiddleware, requireRole(['master']), createSector);
router.put('/:id', authMiddleware, requireRole(['master']), updateSector);

export default router;
