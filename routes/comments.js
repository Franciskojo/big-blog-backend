import { Router } from 'express';
import commentsController from '../controllers/commentsController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';


const commentsRouter = Router();

// Public routes
commentsRouter.get('/post/:postId', commentsController.getPostComments);

// Protected routes
commentsRouter.post('/', authenticateToken, commentsController.createComment);

commentsRouter.put('/:id', authenticateToken, commentsController.updateComment);

commentsRouter.delete('/:id', authenticateToken, commentsController.deleteComment);

// Admin-only routes
commentsRouter.get('/admin/pending', authenticateToken, requireRole(['ADMIN']), commentsController.getPendingComments);

export default commentsRouter;
