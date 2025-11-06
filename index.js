import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pool from './db.js';

import authRouter from './routes/auth.js';
import postsRouter from './routes/posts.js';
import commentsRouter from './routes/comments.js';
import userRouter from './routes/users.js';
import categoryRouter from './routes/categoryRoutes.js';

const app = express();
app.set('trust proxy', 1);

// ========================
// 🔒 Security Middleware
// ========================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ✅ Handle CORS globally (no need for app.options)
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://big-blog-frontend.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ========================
// 🧱 Rate Limiting
// ========================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// ========================
// 🧩 Body Parsers
// ========================
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// ========================
// 🧭 API Routes
// ========================
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);

// ========================
// 🩺 Health Check
// ========================
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ status: 'OK', dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: 'Database not reachable' });
  }
});

// ========================
// ❌ 404 Handler
// ========================
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ========================
// 🚨 Error Handler
// ========================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ========================
// 🚀 Start Server
// ========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

export default app;
