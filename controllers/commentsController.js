import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

class CommentsController {
  // Create a new comment
  async createComment(req, res) {
    try {
      const { content, postId } = req.body;

      if (!content || !postId) {
        return res.status(400).json({ error: 'Content and postId are required' });
      }

      // Check if post exists
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          postId,
          authorId: req.user.id,
          approved: req.user.role === 'ADMIN'
        },
        include: {
          author: { select: { id: true, name: true } },
          post: { select: { id: true, title: true } }
        }
      });

      res.status(201).json({ comment });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get approved comments for a post
  async getPostComments(req, res) {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { postId, approved: true };

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.comment.count({ where })
      ]);

      res.json({
        comments,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: skip + comments.length < total,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update a comment
  async updateComment(req, res) {
    try {
      const { id } = req.params;
      const { content, approved } = req.body;

      const existingComment = await prisma.comment.findUnique({
        where: { id },
        include: { post: true }
      });

      if (!existingComment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Only author or admin can update
      if (existingComment.authorId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to update this comment' });
      }

      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (approved !== undefined && req.user.role === 'ADMIN') {
        updateData.approved = approved;
      }

      const comment = await prisma.comment.update({
        where: { id },
        data: updateData,
        include: {
          author: { select: { id: true, name: true } },
          post: { select: { id: true, title: true } }
        }
      });

      res.json({ comment });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete a comment
  async deleteComment(req, res) {
    try {
      const { id } = req.params;

      const existingComment = await prisma.comment.findUnique({ where: { id } });
      if (!existingComment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      if (existingComment.authorId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }

      await prisma.comment.delete({ where: { id } });

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get all pending (unapproved) comments
  async getPendingComments(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where: { approved: false },
          include: {
            author: { select: { id: true, name: true, email: true } },
            post: { select: { id: true, title: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.comment.count({ where: { approved: false } })
      ]);

      res.json({
        comments,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: skip + comments.length < total,
          hasPrev: parseInt(page) > 1
        }
      });
    } catch (error) {
      console.error('Get pending comments error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Add to backend/controllers/commentsController.js
async getMyComments(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { authorId: req.user.id };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          post: {
            select: { id: true, title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.comment.count({ where })
    ]);

    res.json({
      comments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: (skip + comments.length) < total,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Get my comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
}

export default new CommentsController();
