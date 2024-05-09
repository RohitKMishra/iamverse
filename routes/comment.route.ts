import express from 'express';
import { updateAccessToken } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth';
import {
  createComment,
  getAllComments,
  getCommentById,
  getCommentsForPost,
  getUserComment,
  testComment,
} from '../controllers/comment.controller';

const commentRouter = express.Router();

commentRouter.post(
  '/comment/:postId',
  updateAccessToken,
  isAuthenticated,
  createComment
);
commentRouter.get(
  '/comment/post/:postId',
  updateAccessToken,
  isAuthenticated,
  getCommentsForPost
);

commentRouter.get('/comment/test', testComment);

commentRouter.get(
  '/comment/:commentId',
  updateAccessToken,
  isAuthenticated,
  getCommentById
);

commentRouter.get(
  '/comments',
  updateAccessToken,
  isAuthenticated,
  getAllComments
);

commentRouter.get(
  '/comment/user/:username',
  updateAccessToken,
  isAuthenticated,
  getUserComment
);

export default commentRouter;
