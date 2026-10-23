import { Router } from 'express';
import { listArticles, getArticle, voteArticle } from './knowledge.controller.js';

const router = Router();

router.get('/', listArticles);
router.get('/:id', getArticle);
router.post('/:id/vote', voteArticle);

export default router;
