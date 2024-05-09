import { Response } from 'express';
// import userModel from "../models/user.model";
import { redis } from '../utils/redis';
import userModel from '../models/user.model';
import followModel, { IFollow } from '../models/follow.model';

export const getUserById = async (id: string, res: Response) => {
	// Using Redis (optional cache check)
	const userJson = await redis.get(id);
	if (userJson) {
		const user = JSON.parse(userJson);
		res.status(200).json({
			success: true,
			user,
		});
		return; // Early return if user found in cache
	}

	// Using MongoDB (fallback or primary source)
	try {
		const user = await userModel.findById(id);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: 'User not found' });
		}
		res.status(200).json({
			success: true,
			user,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
};

// //get user by id
// export const getUserById = async (id: string, res: Response) => {
//   //using redis
//   const userJson = await redis.get(id);

//   if (userJson) {
//     const user = JSON.parse(userJson);
//     res.status(201).json({
//       success: true,
//       user,
//     });
//   }
//   //   //   using mongobd
//   //   const user = await userModel.findById(id);
//   //   res.status(201).json({
//   //     success: true,
//   //     user,
//   //   });
// };

//Get all Users
export const getAllUsersService = async (
	res: Response,
	currentUserId: string
) => {
	const users = await userModel.find().sort({ createdAt: -1 });

	const followStatuses: { [key: string]: boolean } = {};
	if (currentUserId) {
		const followings: IFollow[] = await followModel.find({
			follower: currentUserId,
			following: { $in: users },
		});

		// Map followings to a dictionary for quick lookup
		followings.forEach((follow) => {
			followStatuses[follow.following.toString()] = true;
		});
	}

	// Prepare response with random users and follow statuses
	const responseUsers = users.map((user) => ({
		_id: user._id,
		name: user.name,
		email: user.email,
		username: user.username,
		// Check if the current user is following this random user
		isFollowing: followStatuses[user._id.toString()] || false,
	}));

	res.status(201).json({
		success: true,
		users: responseUsers,
	});
};

//update user role
export const updateUserRoleService = async (
	res: Response,
	id: string,
	role: string
) => {
	const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });

	res.status(201).json({
		success: true,
		user,
	});
};
