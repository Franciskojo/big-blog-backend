import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@blog.com' },
    update: {},
    create: {
      email: 'admin@blog.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  });

  // Create author user
  const authorPassword = await bcrypt.hash('author123', 12);
  const author = await prisma.user.upsert({
    where: { email: 'author@blog.com' },
    update: {},
    create: {
      email: 'author@blog.com',
      password: authorPassword,
      name: 'John Author',
      role: 'AUTHOR'
    }
  });

  // Create reader user
  const readerPassword = await bcrypt.hash('reader123', 12);
  const reader = await prisma.user.upsert({
    where: { email: 'reader@blog.com' },
    update: {},
    create: {
      email: 'reader@blog.com',
      password: readerPassword,
      name: 'Jane Reader',
      role: 'READER'
    }
  });

  // Create sample posts
  const post1 = await prisma.post.create({
    data: {
      title: 'Welcome to Our Blog',
      content: `This is the first post on our amazing blogging platform. We're excited to share knowledge and insights with our readers.

## Features:
- Role-based access control
- Modern React frontend
- Secure Express.js backend
- PostgreSQL database with Prisma ORM

Stay tuned for more updates!`,
      excerpt: 'Welcome to our new blogging platform built with modern technologies',
      published: true,
      authorId: author.id,
      tags: ['welcome', 'introduction', 'blogging']
    }
  });

  const post2 = await prisma.post.create({
    data: {
      title: 'The Future of Web Development',
      content: `Web development continues to evolve at a rapid pace. In this post, we'll explore the latest trends and technologies shaping the future of web development.

### Key Trends:
1. **Serverless Architecture**
2. **JAMstack**
3. **WebAssembly**
4. **AI Integration**

These technologies are making web applications faster, more secure, and more scalable than ever before.`,
      excerpt: 'Exploring the latest trends and technologies in web development',
      published: true,
      authorId: admin.id,
      tags: ['web-development', 'trends', 'technology']
    }
  });

  // Create sample comments
  await prisma.comment.create({
    data: {
      content: 'Great first post! Looking forward to reading more content.',
      approved: true,
      authorId: reader.id,
      postId: post1.id
    }
  });

  await prisma.comment.create({
    data: {
      content: 'Very insightful article about web development trends.',
      approved: true,
      authorId: author.id,
      postId: post2.id
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log('Admin credentials: admin@blog.com / admin123');
  console.log('Author credentials: author@blog.com / author123');
  console.log('Reader credentials: reader@blog.com / reader123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
