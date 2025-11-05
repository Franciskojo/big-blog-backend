import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const postsController = {
  async createPost(req, res) {
    try {
      const { title, content, excerpt, tags, categoryId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      const imageUrl = req.file?.path || null;

      // 🧠 Normalize tags to always be an array
      let parsedTags = [];
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags;
        } else if (typeof tags === "string") {
          try {
            // If tags was sent as JSON string (e.g. '["tech","video"]')
            parsedTags = JSON.parse(tags);
          } catch {
            // If tags was sent as comma-separated string (e.g. "tech, video")
            parsedTags = tags.split(",").map(tag => tag.trim());
          }
        }
      }

      const post = await prisma.post.create({
        data: {
          title,
          content,
          excerpt,
          tags: parsedTags,
          authorId: req.user.id,
          published: req.user.role === "ADMIN",
          image: imageUrl,
           categoryId: categoryId || null,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          category: true,
        },
      });

      res.status(201).json({ post });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getAllPosts(req, res) {
    try {
      const { page = 1, limit = 10, search = "", tag } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Base filter
      let where = search
        ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        }
        : {};

      // Optional tag filter
      if (tag) {
        where.AND = [{ tags: { has: tag } }];
      }

      // Role-based filtering
      if (!req.user) {
        where.published = true;
      } else {
        switch (req.user.role) {
          case "AUTHOR":
            where.OR = where.OR || [];
            where.OR.push({ authorId: req.user.id });
            break;
          case "ADMIN":
            break; // see everything
          default:
            where.published = true;
        }
      }

      // Fetch posts + total count in parallel
      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
            comments: {
              where: { approved: true },
              select: { id: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.post.count({ where }),
      ]);

      // Add comment count
      const postsWithCommentCount = posts.map(post => ({
        ...post,
        commentCount: post.comments.length,
      }));

      // Return with pagination
      res.json({
        posts: postsWithCommentCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalPosts: total,
          hasNext: skip + posts.length < total,
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },


  async getPost(req, res) {
    try {
      const { id } = req.params;

      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          comments: {
            where: { approved: true },
            include: {
              author: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Only return published posts to non-authors/admins
      if (!post.published && req.user?.role === 'READER') {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json({ post });
    } catch (error) {
      console.error('Get post error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async updatePost(req, res) {
  try {
    const { id } = req.params;
    let { title, content, excerpt, tags, published } = req.body;

    // 🔍 Find existing post
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    // 🔒 Authorization check
    if (existingPost.authorId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to update this post" });
    }

    // 🧠 Normalize published — ensure Boolean
    if (typeof published === "string") {
      published = published === "true";
    }

    // 🏷️ Normalize tags — accept array, JSON string, or comma-separated
    let parsedTags = existingPost.tags || [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags;
      } else if (typeof tags === "string") {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          parsedTags = tags.split(",").map((t) => t.trim());
        }
      }
    }

    // 🖼️ Handle image update
    let newImageUrl = existingPost.image;
    if (req.file) {
      newImageUrl = req.file.path;

      // 🗑️ Delete old Cloudinary image if it exists
      if (existingPost.image) {
        try {
          const parts = existingPost.image.split("/");
          const filename = parts.pop().split(".")[0]; // remove extension
          const folder = parts.slice(-1)[0]; // e.g., "postsImage"
          const publicId = `${folder}/${filename}`;

          await cloudinary.uploader.destroy(publicId);
          console.log("🗑️ Deleted old Cloudinary image:", publicId);
        } catch (err) {
          console.warn("⚠️ Failed to delete old image:", err.message);
        }
      }
    }

    // 📝 Update post in Prisma
    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(excerpt && { excerpt }),
        ...(parsedTags && { tags: parsedTags }),
        ...(typeof published === "boolean" && { published }),
        ...(req.file && { image: newImageUrl }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(200).json({ message: "Post updated successfully", post });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
},

  async deletePost(req, res) {
    try {
      const { id } = req.params;

      const existingPost = await prisma.post.findUnique({ where: { id } });
      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (existingPost.authorId !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this post' });
      }

      await prisma.post.delete({ where: { id } });

      res.json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Delete post error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getMyPosts(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = { authorId: req.user.id };

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.post.count({ where }),
      ]);

      res.json({
        posts,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: skip + posts.length < total,
          hasPrev: parseInt(page) > 1,
        },
      });
    } catch (error) {
      console.error('Get my posts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getFeaturedPosts(req, res) {
    try {
      const featuredPosts = await prisma.post.findMany({
        where: {
          published: true
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 3 // Get 3 most recent posts as featured
      });

      res.json({ posts: featuredPosts });
    } catch (error) {
      console.error('Get featured posts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

};

export default postsController;
