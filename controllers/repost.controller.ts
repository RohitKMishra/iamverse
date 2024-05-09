import { Request, Response, NextFunction } from 'express';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import ErrorHandler from '../utils/ErrorHandler';

import repostModel, { IRepost } from '../models/repost.model';
import postModel, { IPost } from '../models/post.model';
import { getUserById } from '../services/user.service';
import mongoose, { Types, isValidObjectId } from 'mongoose';
import userModel from '../models/user.model';
import RepostModel from '../models/repost.model';
// import { getPostById } from './post.controller';

// Helper function
export const createRepost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment } = req.body;
      const { postId } = req.params;
      const userId = req.user?._id;

      // Validate request body (optional)

      if (!postId) {
        return next(new ErrorHandler('Post ID not found', 404));
      }
      if (!userId) {
        return next(new ErrorHandler('User ID not found', 404));
      }

      const user = await userModel.findOne({
        _id: userId,
      });
      const post = await postModel.findOne({
        _id: postId,
      });

      // console.log('post', post);
      if (!user || !post) {
        return next(new ErrorHandler('User or post not found', 404));
      }

      const newRepost = new repostModel({
        user,
        originalPost: post,
        comment,
      });

      await newRepost.save();

      res.status(201).json({
        success: true,
        message: 'Post reposted successfully',
        data: newRepost,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get all reposts for a specific user (optional)

export const getUserReposts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get username from request params
    const username = req.params.username; // Assuming 'username' is the param name

    // Find the user by username
    const user = await userModel.findOne({ username });

    // Check if user exists
    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // Validate user ID (optional)

    // Aggregate to get reposts and populate details
    const reposts = await RepostModel.aggregate([
      {
        $match: {
          user: user._id, // Filter reposts by the user's ID
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
      {
        $lookup: {
          from: 'posts', // Lookup the original post collection
          localField: 'originalPost',
          foreignField: '_id',
          as: 'originalPost',
        },
      },
      { $unwind: '$originalPost' }, // Unwind the originalPost array (might be empty)
      {
        $lookup: {
          from: 'users', // Lookup the author of the original post
          localField: 'originalPost.user',
          foreignField: '_id',
          as: 'originalPost.user',
        },
      },
      { $unwind: '$originalPost.user' }, // Unwind the user array of the original post
      {
        $lookup: {
          from: 'likes', // Lookup likes for the original post
          localField: 'originalPost._id',
          foreignField: 'targetId',
          as: 'originalPost.likes',
        },
      },
      {
        $lookup: {
          from: 'comments', // Lookup comments for the original post
          localField: 'originalPost._id',
          foreignField: 'post',
          as: 'originalPost.comments',
        },
      },
      {
        $addFields: {
          // Calculate like and comment counts for the original post
          'originalPost.likeCount': { $size: '$originalPost.likes' },
          'originalPost.commentCount': { $size: '$originalPost.comments' },
        },
      },
      {
        $project: {
          user: 1,
          comment: 1, // Repost comment (optional)
          createdAt: 1,
          updatedAt: 1,
          originalPost: {
            _id: 1, // Include original post ID (optional)
            text: 1,
            image: 1,
            video: 1,
            'user.name': 1,
            'user.username': 1,
            'user.email': 1, // Adjust according to privacy settings
            likeCount: 1,
            commentCount: 1,
            createdAt: 1,
            updatedAt: 1,
            // likes: 0, // Exclude the likes array from the final output (optional)
            // comments: 0, // Exclude the comments array from the final output (optional)
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      reposts,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

export const getAllReposts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;

      // Fetch all posts (consider pagination for large datasets)
      const posts = await RepostModel.find()
        .populate('user', 'name')
        .populate('originalPost', '_id text');

      res.status(200).json({
        success: true,
        posts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

export const getRepostByPostId = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;

      const reposts: IRepost[] = await repostModel
        .find({ originalPost: postId })
        .populate('user', 'name username')
        .populate('originalPost', 'text user');

      // Return the response
      res.status(200).json({
        success: true,
        data: reposts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ... other repost controller functions (optional)
