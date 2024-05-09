import { NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import followModel from '../models/follow.model';
import postModel from '../models/post.model';
import ErrorHandler from '../utils/ErrorHandler';

export const myFeed = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the logged-in user ID
    const userId = req.user?._id;
    const { offset = 0, limit = 50 } = req.query; // Set default values for offset and limit

    // Find following user IDs (excluding the current user)
    const following = await followModel
      .find({ follower: userId })
      .select('following');
    const followingUserIds = following.map((follow) => follow.following);

    // Combine current user ID with following user IDs for the query
    const userIds = [...followingUserIds, userId];

    // Aggregate to calculate counts of likes and comments for each post
    const posts = await postModel.aggregate([
      {
        $match: {
          user: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        },
      },

      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'targetId',
          as: 'likes',
        },
      },
      // {
      //   $lookup: {
      //     from: 'comments',
      //     localField: '_id',
      //     foreignField: 'post',
      //     as: 'comments',
      //   },
      // },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'post',
          as: 'nested',
        },
      },
      {
        $addFields: {
          likeCount: { $size: '$likes' },
          // commentCount: { $size: '$comments' },
          nestedCount: { $size: '$nested' },

          isLiked: {
            $in: [new mongoose.Types.ObjectId(userId), '$likes.user'], // Compare user Id with likes.user
          },
        },
      },
      {
        $project: {
          likes: 0, // Exclude the likes array from the final output
          comments: 0, // Exclude the comments array from the final output
        },
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'nestedPosts',
        },
      },
      {
        $unwind: {
          path: '$nestedPosts',
          preserveNullAndEmptyArrays: true, // Preserve documents without nested posts
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'nestedPosts.user',
          foreignField: '_id',
          as: 'nestedPosts.userDetails',
        },
      },
      {
        $group: {
          _id: '$_id', // Group by post ID to reconstruct the original document
          root: { $mergeObjects: '$$ROOT' }, // Merge original document fields
          nestedPosts: { $push: '$nestedPosts' }, // Push populated nested posts
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ['$root', { nestedPosts: '$nestedPosts' }],
          },
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by creation date descending (latest first)
      },
      {
        $skip: Number(offset), // Apply offset for pagination
      },
      {
        $limit: Number(limit), // Apply limit for pagination
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user', // Flatten the user array
      },
      {
        $project: {
          'user.name': 1,
          'user.username': 1,
          'user.email': 1,
          text: 1,
          image: 1,
          video: 1,
          post: 1,
          nestedPosts: {
            $map: {
              input: '$nestedPosts',
              as: 'nestedPost',
              in: {
                $mergeObjects: '$$nestedPost',
              },
            },
          },
          likeCount: 1,
          commentCount: 1,
          nestedCount: 1,
          isLiked: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Posts from yourself and your following users',
      posts,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
  }
};
