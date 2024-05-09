import express from 'express';
import { updateAccessToken } from '../controllers/user.controller';
import { isAuthenticated } from '../middleware/auth';
import { sharePost } from '../controllers/share.controller';

const shareRouter = express.Router();

shareRouter.post(
	'/share/:targetId',
	updateAccessToken,
	isAuthenticated,
	sharePost
);

export default shareRouter;
