import express from 'express';
import { updateAccessToken } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth';
import {
  createRepost,
  getAllReposts,
  getRepostByPostId,
  getUserReposts,
} from '../controllers/repost.controller';

const repostRouter = express.Router();

repostRouter.post(
  '/repost/:postId',
  updateAccessToken,
  isAuthenticated,
  createRepost
);
repostRouter.get(
  '/repost/post/:postId',
  updateAccessToken,
  isAuthenticated,
  getRepostByPostId
);

repostRouter.get(
  '/reposts/:username',
  updateAccessToken,
  isAuthenticated,
  getUserReposts
);

repostRouter.get('/reposts', updateAccessToken, isAuthenticated, getAllReposts);

// ... other routes

export default repostRouter;
