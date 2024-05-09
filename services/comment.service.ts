import { Response } from 'express';
// import userModel from "../models/user.model";
import { redis } from '../utils/redis';
import commemntModel from '../models/comment.model';

//get user by id
export const getCommentById = async (id: string, res: Response) => {
	//using redis
	const commentJson = await redis.get(id);

	if (commentJson) {
		const user = JSON.parse(commentJson);
		res.status(201).json({
			success: true,
			user,
		});
	}
	//   //   using mongobd
	//   const user = await userModel.findById(id);
	//   res.status(201).json({
	//     success: true,
	//     user,
	//   });
};

//Get all Users
export const getAllCommentService = async (res: Response) => {
	const comments = await commemntModel.find().sort({ createdAt: -1 });

	res.status(200).json({
		success: true,
		comments,
	});
};

//update user role
// export const updateUserRoleService = async (
//   res: Response,
//   id: string,
//   role: string
// ) => {
//   const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });

//   res.status(201).json({
//     success: true,
//     user,
//   });
// };
