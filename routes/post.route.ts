import express from 'express';
import {
  createPost,
  getAllPosts,
  getNestedPostForPost,
  getPostById,
  getUserPost,
  getUserPosts,
  myFeed,
  nestedPost,
  testPost,
} from '../controllers/post.controller';
import { updateAccessToken } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth';

const postRouter = express.Router();

postRouter.post('/create-post', updateAccessToken, isAuthenticated, createPost);

postRouter.get('/test', testPost);

postRouter.get(
  '/post/:postId',
  updateAccessToken,
  isAuthenticated,
  getPostById
);
postRouter.get('/post', updateAccessToken, isAuthenticated, getAllPosts);

postRouter.get(
  '/posts/:username',
  updateAccessToken,
  isAuthenticated,
  getUserPost
);
postRouter.get('/feed', updateAccessToken, isAuthenticated, myFeed);

// Routes in testing
// Create a nested post  
postRouter.post(
  '/nested/:postId',
  updateAccessToken,
  isAuthenticated,
  nestedPost
);

// Get nested post for post
postRouter.get(
  '/nested/:postId',
  updateAccessToken,
  isAuthenticated,
  getNestedPostForPost
);

export default postRouter;
