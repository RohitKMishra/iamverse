import { Request, Response, NextFunction } from 'express';
import LikeModel, { ILike } from '../models/likes.model';
import ErrorHandler from '../utils/ErrorHandler';
import { Types } from 'mongoose';
import userModel, { IUser } from '../models/user.model';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import { getPostById } from './post.controller';
import likeModel from '../models/likes.model';
import postModel from '../models/post.model';
import commentModel, { IComment } from '../models/comment.model';

interface ICreateLike {
  user: Types.ObjectId | IUser;
  targetType: string;
  targetId: Types.ObjectId;
}

// Controller to like or unlike a target entity
export const toggleLike = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { targetType } = req.body;
      const userId = req.user?._id;
      const { targetId } = req.params;

      // console.log('targetId', targetId);

      if (!targetType || !targetId) {
        return next(new ErrorHandler('No targetType and tagertId found.', 400));
      }

      // Check if user has already liked the target entity
      const existingLike = await LikeModel.findOne({
        user: userId,
        targetType,
        targetId,
      });

      if (existingLike) {
        // User has already liked, so unlike (remove like)
        await LikeModel.findOneAndDelete({
          user: userId,
          targetType,
          targetId,
        });

        res.status(200).json({
          success: true,
          message: 'Like removed successfully',
          isLiked: false,
        });
      } else {
        const createNewLike: ICreateLike = {
          targetType,
          targetId: new Types.ObjectId(targetId),
          user: userId,
        };
        // User has not liked, so like (add like)
        const newLike: ILike = await LikeModel.create(createNewLike);

        res.status(200).json({
          success: true,
          message: 'Like added successfully',
          isLiked: true,
          like: newLike,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getUserLikes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the username from params
    const username = req.params.username;

    // Find the user by username
    const user = await userModel.findOne({ username });

    // Check if user exists
    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // Find likes by the user's ID
    const userLikes: ILike[] = await likeModel.find({ user: user._id });

    // Create a map to group likes by targetType and targetId
    const targetIds: { [key: string]: Types.ObjectId[] } = {};
    userLikes.forEach((like) => {
      const key = `${like.targetType}-${like.targetId}`;
      if (!targetIds[key]) {
        targetIds[key] = [];
      }
      targetIds[key].push(like._id);
    });

    // Extract unique target identifiers from the map
    const uniqueTargets = Object.keys(targetIds).map((key) => {
      const [targetType, targetId] = key.split('-');
      return { targetType, targetId: new Types.ObjectId(targetId) };
    });

    // Prepare pipeline stages to fetch target entities and count likes
    const populatedLikes = await Promise.all(
      uniqueTargets.map(async ({ targetType, targetId }) => {
        try {
          const results =
            targetType === 'post'
              ? await postModel.aggregate([
                  { $match: { _id: targetId } },
                  {
                    $addFields: {
                      likeCount: {
                        $size: {
                          $ifNull: [targetIds[`${targetType}-${targetId}`], []],
                        },
                      },
                      isLiked: true,
                    },
                  },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'user',
                      foreignField: '_id',
                      as: 'user',
                    },
                  },
                  { $unwind: '$user' },
                ])
              : await commentModel.aggregate([
                  { $match: { _id: targetId } },
                  {
                    $addFields: {
                      likeCount: {
                        $size: {
                          $ifNull: [targetIds[`${targetType}-${targetId}`], []],
                        },
                      },
                      isLiked: true,
                    },
                  },
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'user',
                      foreignField: '_id',
                      as: 'user',
                    },
                  },
                  { $unwind: '$user' },
                ]);
          return results[0];
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 500));
        }
      })
    );

    // Filter out null/undefined values from the results
    const filteredResults = populatedLikes.filter((result) => !!result);

    // Respond with the list of populated likes including target details and counts
    res.status(200).json({
      success: true,
      message: `List of ${username}'s liked posts and comments`,
      data: filteredResults,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
  }
};

export const getLikesByPostId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the current PostID
    const targetId = req.params.postId;
    const targetType = 'post';

    const post = await LikeModel.findOne({
      targetType,
      targetId,
    }).populate('user', 'name username');

    res.status(200).json({
      success: true,
      message: 'Likes of this post',
      post,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

// export const getUserLikes = async (
// 	req: Request,
// 	res: Response,
// 	next: NextFunction
// ) => {
// 	try {
// 		// Get the username from params
// 		const username = req.params.username;

// 		// Find the user by username
// 		const user = await userModel.findOne({ username });

// 		// Check if user exists
// 		if (!user) {
// 			return next(new ErrorHandler('User not found', 404));
// 		}

// 		// Find likes by the user's ID
// 		const userLikes: ILike[] = await likeModel.find({ user: user._id });

// 		// Create a map to group likes by targetType and targetId
// 		const targetIds: { [key: string]: Types.ObjectId[] } = {};
// 		userLikes.forEach((like) => {
// 			const key = `${like.targetType}-${like.targetId}`;
// 			if (!targetIds[key]) {
// 				targetIds[key] = [];
// 			}
// 			targetIds[key].push(like._id);
// 		});

// 		// Extract unique target identifiers from the map
// 		const uniqueTargets = Object.keys(targetIds).map((key) => {
// 			const [targetType, targetId] = key.split('-');
// 			return { targetType, targetId: new Types.ObjectId(targetId) };
// 		});

// 		// Prepare pipeline stages to fetch target entities and count likes
// 		const populatedLikes = await Promise.all(
// 			uniqueTargets.map(async ({ targetType, targetId }) => {
// 				try {
// 					const results =
// 						targetType === 'post'
// 							? await postModel.aggregate([
// 									{ $match: { _id: targetId } },
// 									{
// 										$lookup: {
// 											from: 'comments',
// 											localField: '_id',
// 											foreignField: 'post',
// 											as: 'comments',
// 										},
// 									},
// 									{
// 										$addFields: {
// 											likeCount: {
// 												$size: {
// 													$ifNull: [targetIds[`${targetType}-${targetId}`], []],
// 												},
// 											},
// 											commentCount: { $size: '$comments' },
// 											// replyCount: { $size: '$reply' },
// 											// replyCount: {
// 											// 	$sum: {
// 											// 		$map: {
// 											// 			input: '$comments',
// 											// 			as: 'comment',
// 											// 			in: {
// 											// 				$size: { $ifNull: ['$$comment.replies', []] },
// 											// 			},
// 											// 		},
// 											// 	},
// 											// },
// 										},
// 									},
// 							  ])
// 							: await commentModel.aggregate([
// 									{ $match: { _id: targetId } },
// 									{
// 										$lookup: {
// 											from: 'replies',
// 											localField: '_id',
// 											foreignField: 'comment',
// 											as: 'replies',
// 										},
// 									},
// 									{
// 										$addFields: {
// 											likeCount: {
// 												$size: {
// 													$ifNull: [targetIds[`${targetType}-${targetId}`], []],
// 												},
// 											},
// 											commentCount: 1, // Since this is a comment, count it as 1 comment
// 											replyCount: { $size: '$reply' },
// 										},
// 									},
// 							  ]);
// 					return results[0];
// 				} catch (error: any) {
// 					console.error(`Error fetching target entity: ${error.message}`);
// 					return null;
// 				}
// 			})
// 		);

// 		// Filter out null/undefined values from the results
// 		const filteredResults = populatedLikes.filter((result) => !!result);

// 		// Respond with the list of populated likes including target details and counts
// 		res.status(200).json({
// 			success: true,
// 			message: `List of ${username}'s liked posts and comments`,
// 			data: filteredResults,
// 		});
// 	} catch (error: any) {
// 		return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
// 	}
// };
// export const getUserLikes = async (
// 	req: Request,
// 	res: Response,
// 	next: NextFunction
// ) => {
// 	try {
// 		// Get the username from params
// 		const username = req.params.username;

// 		// Find the user by username
// 		const user = await userModel.findOne({ username });

// 		// Check if user exists
// 		if (!user) {
// 			return next(new ErrorHandler('User not found', 404));
// 		}

// 		// Find likes by the user's ID
// 		const userLikes: ILike[] = await likeModel.find({ user: user._id });

// 		// Array to store detailed liked posts
// 		const likedPosts = [];

// 		// Fetch detailed information for each liked post
// 		for (const like of userLikes) {
// 			if (like.targetType === 'post') {
// 				// Call getPostById function to fetch post details
// 				const postId = like.targetId.toString(); // Convert ObjectId to string
// 				const { post } = await getPostById({ params: { postId } }, res, next);
// 				likedPosts.push(post);
// 			}
// 		}

// 		// Respond with the list of detailed liked posts
// 		res.status(200).json({
// 			success: true,
// 			message: `List of ${username}'s liked posts`,
// 			data: likedPosts,
// 		});
// 	} catch (error: any) {
// 		return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
// 	}
// };
