import express from 'express';
import { updateAccessToken } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth';
import {
	followUnfollowUser,
	getFollowers,
	getFollowing,
} from '../controllers/follow.controller';

const followRouter = express.Router();

followRouter.post(
	'/follow/:followingId',
	updateAccessToken,
	isAuthenticated,
	followUnfollowUser
);
followRouter.get(
	'/getFollowing/:username',
	updateAccessToken,
	isAuthenticated,
	getFollowing
);
followRouter.get(
	'/getFollowers/:username',
	updateAccessToken,
	isAuthenticated,
	getFollowers
);

export default followRouter;
