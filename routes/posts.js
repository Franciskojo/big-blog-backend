import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import postsController from "../controllers/postsController.js";
import { postsImageUpload } from "../middleware/cloudinary.js";
import { validatePost } from "../middleware/validation.js";

const postsRouter = Router();

// Public routes
postsRouter.get('/', postsController.getAllPosts);

// ✅ Specific route must come before /:id
postsRouter.get('/user/my-posts', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), postsController.getMyPosts);

postsRouter.get('/:id', postsController.getPost);

postsRouter.get('/featured/posts', postsController.getFeaturedPosts);

// Protected routes
postsRouter.post('/', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), postsImageUpload.single("postsImage"), validatePost, postsController.createPost
);


postsRouter.put('/:id', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), postsImageUpload.single("postsImage"), validatePost, postsController.updatePost);

postsRouter.delete('/:id', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), postsController.deletePost);

export default postsRouter;
