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

// Tell Express to trust proxy headers (for rate limiting, HTTPS redirects, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ status: 'OK', dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: 'Database not reachable' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'production' && { stack: err.stack }),
  });
});

// Start server (pool auto-connects)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

export default app;
