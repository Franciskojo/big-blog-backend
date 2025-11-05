import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const usersController = {
  /**
   * Get all users with pagination (Admin only)
   */
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = '', role = '' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role && ['READER', 'AUTHOR', 'ADMIN'].includes(role)) {
        where.role = role;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { posts: true, comments: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  /**
   * Update user role (Admin only)
   */
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['READER', 'AUTHOR', 'ADMIN'].includes(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          validRoles: ['READER', 'AUTHOR', 'ADMIN'],
        });
      }

      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (existingUser.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot modify your own role' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({
        message: `User role updated successfully to ${role}`,
        user,
      });
    } catch (error) {
      console.error('Update user role error:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(500).json({
        error: 'Failed to update user role',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  /**
   * Get user statistics (Admin only)
   */
  async getUserStats(req, res) {
    try {
      const [
        totalUsers,
        totalPosts,
        totalComments,
        usersByRole,
        recentUsers,
        recentRegistrations,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.post.count(),
        prisma.comment.count(),
        prisma.user.groupBy({
          by: ['role'],
          _count: { _all: true },
        }),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      const roleDistribution = usersByRole.reduce((acc, item) => {
        acc[item.role] = item._count._all;
        return acc;
      }, {});

      res.json({
        stats: {
          totalUsers,
          totalPosts,
          totalComments,
          roleDistribution,
          recentRegistrations,
          recentUsers,
        },
        analytics: {
          postsPerUser:
            totalUsers > 0 ? (totalPosts / totalUsers).toFixed(2) : 0,
          commentsPerUser:
            totalUsers > 0 ? (totalComments / totalUsers).toFixed(2) : 0,
          commentsPerPost:
            totalPosts > 0 ? (totalComments / totalPosts).toFixed(2) : 0,
        },
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch user statistics',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          posts: {
            select: {
              id: true,
              title: true,
              published: true,
              createdAt: true,
              _count: { select: { comments: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          comments: {
            select: {
              id: true,
              content: true,
              approved: true,
              createdAt: true,
              post: { select: { id: true, title: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: { select: { posts: true, comments: true } },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },

  /**
   * Delete user (Admin only)
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (existingUser.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      console.log(
        `Admin ${req.user.email} is deleting user ${existingUser.email} (${existingUser.name})`
      );

      const result = await prisma.$transaction(async (tx) => {
        const deletedComments = await tx.comment.deleteMany({
          where: { authorId: id },
        });

        const userPosts = await tx.post.findMany({
          where: { authorId: id },
          select: { id: true },
        });

        const postIds = userPosts.map((p) => p.id);

        if (postIds.length > 0) {
          await tx.comment.deleteMany({
            where: { postId: { in: postIds } },
          });

          await tx.post.deleteMany({
            where: { authorId: id },
          });
        }

        const deletedUser = await tx.user.delete({
          where: { id },
        });

        return {
          deletedUser,
          deletedComments: deletedComments.count,
          deletedPosts: postIds.length,
        };
      });

      res.json({
        message: `User "${existingUser.name}" (${existingUser.email}) deleted successfully`,
        details: {
          user: existingUser.email,
          postsDeleted: result.deletedPosts,
          commentsDeleted: result.deletedComments,
        },
      });
    } catch (error) {
      console.error('Delete user error:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
      }

      if (error.code === 'P2003') {
        return res.status(400).json({
          error: 'Cannot delete user due to existing references',
          details:
            'There might be related data that cannot be deleted automatically',
        });
      }

      res.status(500).json({
        error: 'Failed to delete user',
        details:
          process.env.NODE_ENV === 'development'
            ? error.message
            : 'Please try again later',
      });
    }
  },

  /**
   * Search users (Admin only)
   */
  async searchUsers(req, res) {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || query.length < 2) {
        return res
          .status(400)
          .json({ error: 'Search query must be at least 2 characters long' });
      }

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
        take: parseInt(limit),
      });

      res.json({ users });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        error: 'Failed to search users',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  },
};

export default usersController;
