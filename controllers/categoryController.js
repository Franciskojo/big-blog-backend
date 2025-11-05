import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ Create a new category
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Category name required" });

    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing)
      return res.status(400).json({ error: "Category already exists" });

    const category = await prisma.category.create({
      data: { name, slug },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create category" });
  }
};

// ✅ Get all categories (with post counts)
export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { posts: true } },
      },
      orderBy: { name: "asc" },
    });

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// ✅ Get posts by category slug
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        posts: {
          orderBy: { createdAt: "desc" },
          include: { author: true },
        },
      },
    });

    if (!category)
      return res.status(404).json({ error: "Category not found" });

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch category posts" });
  }
};
