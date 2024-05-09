import express from 'express';
import {
	activateUser,
	deleteUser,
	forgetPassword,
	getAllUsers,
	getRandomUsers,
	getUserByUsername,
	getUserInfo,
	loginUser,
	logoutUser,
	registrationUser,
	resetPassword,
	socialAuth,
	updateAccessToken,
	updatePassword,
	updateProfilePicture,
	updateUserInfo,
	updateUserRole,
} from '../controllers/user.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
const userRouter = express.Router();

userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout', updateAccessToken, isAuthenticated, logoutUser);

userRouter.get('/refresh', updateAccessToken);

userRouter.get('/me', updateAccessToken, isAuthenticated, getUserInfo);

userRouter.get(
	'/user/:username',
	updateAccessToken,
	isAuthenticated,
	getUserByUsername
);

userRouter.post('/social-auth', socialAuth);

userRouter.post('/forget-password', forgetPassword);

userRouter.post('/reset-password/:resetToken', resetPassword);

userRouter.put(
	'/update-user-info',
	updateAccessToken,
	isAuthenticated,
	updateUserInfo
);

userRouter.put(
	'/update-user-password',
	updateAccessToken,
	isAuthenticated,
	updatePassword
);

userRouter.put(
	'/update-user-avatar',
	updateAccessToken,
	isAuthenticated,
	updateProfilePicture
);

userRouter.get(
	'/users',
	updateAccessToken,
	isAuthenticated,
	// authorizeRoles('admin'),
	getAllUsers
);
userRouter.get(
	'/suggest',
	updateAccessToken,
	isAuthenticated,
	// authorizeRoles('admin'),
	getRandomUsers
);

userRouter.put(
	'/update-user',
	updateAccessToken,
	isAuthenticated,
	authorizeRoles('admin'),
	updateUserRole
);

userRouter.delete(
	'/delete-user/:id',
	updateAccessToken,
	isAuthenticated,
	authorizeRoles('admin'),
	deleteUser
);
export default userRouter;
