import { Request, Response, NextFunction } from 'express';
import userModel, { IUser } from '../models/user.model';
import FollowModel from '../models/follow.model';
import mongoose, { Types } from 'mongoose';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import ErrorHandler from '../utils/ErrorHandler';

interface IFollow {
	follower: Types.ObjectId | IUser;
	following: Types.ObjectId | IUser;
}

// Follow a user
export const followUnfollowUser = CatchAsyncError(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { followingId } = req.params;
			const userId = req.user?._id;

			// Validate followingId format
			if (!mongoose.isValidObjectId(followingId)) {
				return next(new ErrorHandler('Invalid user ID', 400));
			}

			const followingUser = await userModel.findById(followingId); // Replace UserModel with your actual user model import

			// Check if user exists
			if (!followingUser) {
				return next(new ErrorHandler('User not found', 404));
			}

			// Check if user is trying to follow themselves
			if (userId.toString() === followingId) {
				return next(new ErrorHandler('You cannot follow yourself', 400));
			}

			// Check if user already follows this user
			const alreadyFollowing = await FollowModel.findOne({
				follower: userId,
				following: followingId,
			});

			// Action based on follow status
			let message;
			let newFollow;
			let action;

			if (alreadyFollowing) {
				// Unfollow user
				await FollowModel.findOneAndDelete({
					follower: userId,
					following: followingId,
				});
				action = 'unfollow';
				message = 'Unfollowed successfully';

				// Update following user's follower count (decrement by 1)
				await userModel.findByIdAndUpdate(followingId, {
					$inc: { followersCount: -1 },
				});

				// Update current user's following count (decrement by 1)
				await userModel.findByIdAndUpdate(userId, {
					$inc: { followingCount: -1 },
				});
			} else {
				// Follow user
				newFollow = await FollowModel.create({
					follower: userId,
					following: followingId,
				});
				action = 'follow';
				message = 'Following successful';

				// Populate user data in the newly created follow object
				newFollow = await newFollow.populate(
					'following',
					'name username email'
				);

				// Update following user's follower count (increment by 1)
				await userModel.findByIdAndUpdate(followingId, {
					$inc: { followersCount: 1 },
				});

				// Update current user's following count (increment by 1)
				await userModel.findByIdAndUpdate(userId, {
					$inc: { followingCount: 1 },
				});
			}

			res.status(200).json({
				success: true,
				message,
				data: newFollow ? newFollow : {}, // Only return data if user followed a new user
			});
		} catch (error: any) {
			return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
		}
	}
);

export const getFollowing = CatchAsyncError(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Get the logged-in user ID
			// const userId = req.user?._id;
			// Get username from request params
			const username = req.params.username; // Assuming 'username' is the param name

			// Find the user by username
			const user = await userModel.findOne({ username });
			const userId = await user?._id;
			// Find all follows where the follower is the logged-in user
			const follows = await FollowModel.find({ follower: userId })
				// Populate the following user data (replace with desired fields)
				.populate('following', 'name username');

			const followingUsers = follows.map((follow) => follow.following); // Extract following users
			// Get the total count of followers
			const followingCount = await FollowModel.countDocuments({
				follower: userId,
			});

			res.status(200).json({
				success: true,
				message: `Following list of ${username} retrieved successfully`,
				count: followingCount,
				data: followingUsers,
			});
		} catch (error: any) {
			return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
		}
	}
);

export const getFollowers = CatchAsyncError(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Get the logged-in user ID
			// const userId = req.user?._id;

			// Get username from request params
			const username = req.params.username; // Assuming 'username' is the param name

			// Find the user by username
			const user = await userModel.findOne({ username });
			const userId = await user?._id;

			// Find all follows where the following user is the logged-in user
			const follows = await FollowModel.find({ following: userId })
				// Populate the follower user data (replace with desired fields)
				.populate('follower', 'name username');

			const followerUsers = follows.map((follow) => follow.follower); // Extract follower users

			// Get the total count of followers
			const followerCount = await FollowModel.countDocuments({
				following: userId,
			});

			res.status(200).json({
				success: true,
				message: `Follower list of ${username} retrieved successfully`,
				count: followerCount,
				data: followerUsers,
			});
		} catch (error: any) {
			return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
		}
	}
);
