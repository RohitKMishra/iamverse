import express from 'express';
import { updateAccessToken } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth';
import {
  getLikesByPostId,
  getUserLikes,
  toggleLike,
} from '../controllers/likes.controller';

const likeRouter = express.Router();

likeRouter.post(
  '/like/:targetId',
  updateAccessToken,
  isAuthenticated,
  toggleLike
);
likeRouter.get(
  '/likes/:username',
  updateAccessToken,
  isAuthenticated,
  getUserLikes
);
likeRouter.get(
  '/liked/:postId',
  updateAccessToken,
  isAuthenticated,
  getLikesByPostId
);

export default likeRouter;
