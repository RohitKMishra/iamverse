require('dotenv').config();
import express, { NextFunction, Request, Response } from 'express';
export const app = express();
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ErrorMiddleware } from './middleware/error';
import { rateLimit } from 'express-rate-limit';

// Route
import userRouter from './routes/user.route';
import courseRouter from './routes/course.route';
import orderRouter from './routes/order.route';
import notificationRouter from './routes/notification.route';
import analyticsRouter from './routes/analytics.route';
import layoutRouter from './routes/layout.route';
import postRouter from './routes/post.route';
import commentRouter from './routes/comment.route';
import likeRouter from './routes/likes.route';
import followRouter from './routes/follow.route';
import shareRouter from './routes/share.route';
import repostRouter from './routes/repost.route';

//body parser
app.use(express.json({ limit: '50mb' }));

//cookie parser
app.use(cookieParser());

//cors=> Cross Origin Resource Sharing
app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));

// api request limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  // store: ... , // Redis, Memcached, etc. See below.
});

//routes
app.use(
  '/api/v1',
  userRouter,
  courseRouter,
  orderRouter,
  notificationRouter,
  analyticsRouter,
  layoutRouter
);
app.use(
  '/api/v1/social',
  postRouter,
  commentRouter,
  likeRouter,
  followRouter,
  shareRouter,
  repostRouter
);

//testing api
app.get('/test', (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: 'API is working',
  });
});

//unknown route
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});

// middleware calls
// app.use(limiter);

app.use(ErrorMiddleware);
