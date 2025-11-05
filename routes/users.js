import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { usersController } from '../controllers/usersController.js';


const userRouter = Router();

// Admin-only routes
userRouter.get('/', authenticateToken, requireRole(['ADMIN']), usersController.getAllUsers);

userRouter.get('/stats', authenticateToken, requireRole(['ADMIN']), usersController.getUserStats);

userRouter.patch('/:id/role', authenticateToken, requireRole(['ADMIN']), usersController.updateUserRole);

userRouter.get('/search', authenticateToken, requireRole(['ADMIN']), usersController.searchUsers);

userRouter.get('/:id', authenticateToken, requireRole(['ADMIN']), usersController.getUserById);

userRouter.delete('/:id', authenticateToken, requireRole(['ADMIN']), usersController.deleteUser);

export default userRouter;
