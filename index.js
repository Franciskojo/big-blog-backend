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

// Trust proxy (important for Render/Heroku HTTPS + rate limiting)
app.set('trust proxy', 1);

// ========================
// 🔒 Security Middleware
// ========================

// 1️⃣ Helmet — adds secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images, etc.
  })
);

// 2️⃣ CORS — allow only your frontend domain
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// 3️⃣ Rate Limiting — protect against brute-force or DoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { error: 'Too many requests, please try again later.' },
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
// 🩺 Health Check Route
// ========================
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ status: 'OK', dbTime: result.rows[0].now });
  } catch (err) {
    console.error('Health check failed:', err.message);
    res.status(500).json({ error: 'Database not reachable' });
  }
});

// ========================
// ❌ 404 Handler
// ========================
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ========================
// 🚨 Global Error Handler
// ========================
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ========================
// 🚀 Start Server
// ========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app;
