require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import mongoose, { Types, isValidObjectId } from 'mongoose'; // For validating post ID
// import { uploadImage } from '../utils/imageUpload';

import postModel, { IPost } from '../models/post.model';
import userModel, { IUser } from '../models/user.model';
import commentModel, { IComment } from '../models/comment.model';
import ErrorHandler from '../utils/ErrorHandler';

// Assuming you have middleware for authentication and authorization
import { isAuthenticated, authorizeRoles } from '../middleware/auth';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import { getAllCommentService } from '../services/comment.service';
import likeModel from '../models/likes.model';
import replyModel from '../models/reply.model';

// Create comment
interface ICreateComment {
  type: string;
  text?: string;
  image?: string;
  video?: string;
  user: Types.ObjectId | IUser; // Reference to User document
  post?: Types.ObjectId | IPost; // Reference to User document
  comment?: Types.ObjectId | IComment; // Reference to User document
}

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get user ID from the request (assuming middleware populates req.user)
    const userId = req.user?._id;
    const postId = req.params.postId;
    const commentId = req.body.parentId; // Optional: parent comment ID if replying to a comment

    // Check if user exists
    const existingUser = await userModel.findById(userId);
    if (!existingUser) {
      return next(new ErrorHandler('User not found', 400));
    }

    // Validate postId to ensure it's a valid ObjectId (optional)
    // if (!Types.ObjectId.isValid(postId)) {
    //   return next(new ErrorHandler('Invalid post ID', 400));
    // }

    // Get comment data from request body
    const { type, text, image, video } = req.body;

    // Validate required fields
    if (!type) {
      return next(new ErrorHandler('Comment type is required', 400));
    }

    // Prepare comment data
    const newCommentData: ICreateComment = {
      type,
      user: userId as Types.ObjectId,
      post: new Types.ObjectId(postId),
      comment: commentId ? new Types.ObjectId(commentId) : undefined, // Set parent comment ID if provided
    };

    // Add optional content to the comment data if provided
    if (text) {
      newCommentData.text = text;
    }
    if (image) {
      newCommentData.image = image;
    }
    if (video) {
      newCommentData.video = video;
    }

    // Create new comment document
    const newComment: IComment = new commentModel(newCommentData);

    // Save the comment
    const savedComment = await newComment.save();

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      comment: savedComment,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
  }
};

// export const createComment = CatchAsyncError(
// 	async (req: Request, res: Response, next: NextFunction) => {
// 		try {
// 			// Get user from the request (assuming middleware populates req.user)
// 			const userId = req.user?._id;
// 			const postId = req.params.postId;
// 			// console.log('postId', postId);

// 			// Check if user exists
// 			const existingUser = await userModel.findById(userId);
// 			if (!existingUser) {
// 				return next(new ErrorHandler('User not found', 400));
// 			}

// 			// Validate postId to ensure it's a valid ObjectId (optional)
// 			// if (!Types.ObjectId.isValid(postId)) {
// 			// 	return next(new ErrorHandler('Invalid post ID', 400));
// 			// }

// 			// Get post data from request body
// 			const { type, text, image, video } = req.body;
// 			// console.log('text', text);

// 			// Validate required fields
// 			if (!type) {
// 				return next(new ErrorHandler('Comment type is required', 400));
// 			}

// 			// Create new post document
// 			const newCommentData: ICreateComment = {
// 				type,
// 				user: userId as Types.ObjectId,
// 				// post: postId as Types.ObjectId,
// 				post: new Types.ObjectId(postId),
// 			};
// 			// Add optional content to the post data if provided
// 			if (text) {
// 				newCommentData.text = text;
// 			}
// 			if (image) {
// 				newCommentData.image = image;
// 			}
// 			if (video) {
// 				newCommentData.video = video;
// 			}
// 			// Upload image using your uploadImage utility (replace with actual logic)
// 			// let uploadedImage;
// 			// if (image) {
// 			// 	uploadedImage = await uploadImage(req.file); // Replace with actual image upload logic
// 			// }

// 			// Create new post document
// 			const newComment: IComment = new commentModel(newCommentData);

// 			// Save the post
// 			const savedComment = await newComment.save();

// 			res.status(201).json({
// 				success: true,
// 				message: 'Post created successfully',
// 				post: savedComment,
// 			});
// 		} catch (error: any) {
// 			return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
// 		}
// 	}
// );

export const getCommentById = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId } = req.params;

      // Validate post ID
      if (!isValidObjectId(commentId)) {
        return next(new ErrorHandler('Invalid post ID', 400));
      }

      // Find post by ID
      const comment = await commentModel.findById(commentId);
      // .populate('user', 'name username email')
      // .populate('post', 'text createdAt'); // Populate user details

      // Check if post exists
      if (!comment) {
        return next(new ErrorHandler('Comment not found', 404));
      }

      res.status(200).json({
        success: true,
        comment,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

export const getAllComments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch all comments (consider pagination for large datasets)
      getAllCommentService(res);
      // res.status(200).json({
      // 	success: true,
      // 	message: 'test',
      // });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);
export const testComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This is test response to verify the comment route is working
      res.status(200).json({
        success: true,
        message: 'Comment route is working!',
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

export const updatePost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;
      const updates = req.body; // Update data
      const userId = req.user?._id;

      // Validate post ID
      if (!isValidObjectId(postId)) {
        return next(new ErrorHandler('Invalid comment ID', 400));
      }

      // Find post by ID
      let post = await postModel.findById(postId);

      // Check if post exists
      if (!post) {
        return next(new ErrorHandler('Post not found', 404));
      }

      // Authorization: Check if user is authorized to update this post
      if (userId.toString() !== post.user.toString()) {
        return next(new ErrorHandler('Unauthorized to update this post', 403));
      }

      // Update image if provided (replace with your actual logic)
      // let uploadedImage;
      // if (req.file) {
      // 	uploadedImage = await uploadImage(req.file);
      // 	// Handle potential errors during image upload

      // 	// If image update is successful, update the post's image URL
      // 	updates.image = uploadedImage?.url;

      // 	// Optionally, delete the old image using your image storage provider's API
      // }

      // Update the post document with the provided updates
      post = await postModel.findByIdAndUpdate(postId, updates, { new: true }); // Return updated document

      res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        post,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

export const getUserComment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get username from request params
      const username = req.params.username; // Assuming 'username' is the param name

      // Find the user by username
      const user = await userModel.findOne({ username });

      // Get the Current user
      const userId = req.user?._id;

      // Check if user exists
      if (!user) {
        return next(new ErrorHandler('User not found', 404));
      }

      // Aggregate to retrieve posts by the user with counts of likes and comments
      const myPost = await commentModel.aggregate([
        {
          $match: {
            user: user._id, // Filter posts by the user's ID
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
        {
          $lookup: {
            from: 'reply',
            localField: '_id',
            foreignField: 'comment',
            as: 'reply',
          },
        },
        {
          $addFields: {
            likeCount: { $size: '$likes' },
            replyCount: { $size: '$reply' },
            isLiked: {
              $in: [new mongoose.Types.ObjectId(userId), '$likes.user'], // Compare user ID with likes.user._id
            },
          },
        },
        {
          $project: {
            likes: 0, // Exclude the likes array from the final output
            reples: 0, // Exclude the comments array from the final output
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
            likeCount: 1,
            commentCount: 1,
            isLiked: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      // // Find posts where the user is the author (user field)
      // const myPost = await postModel
      // 	.find({ user: user._id })
      // 	.populate('user', 'name username'); // Populate author details

      // Respond with the list of posts
      res.status(200).json({
        success: true,
        message: `List of comments by ${username}`,
        data: myPost,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

export const getCommentsForPost = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { postId } = req.params;

    // Validate postId (optional)
    // Ensure postId is a valid ObjectId before proceeding with the query

    // Find all comments associated with the specified postId
    const comments: IComment[] = await commentModel
      .find({ post: postId })
      .populate('user', 'name username'); // Optionally populate user details for each comment

    // Prepare an array to store enriched comments with like and reply counts
    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        // Count the number of likes for this comment
        const likeCount = await likeModel.countDocuments({
          targetType: 'comment',
          targetId: comment._id,
        });

        // Count the number of replies for this comment
        const replyCount = await replyModel.countDocuments({
          comment: comment._id,
        });

        // Construct an enriched comment object with like and reply counts
        return {
          _id: comment._id,
          text: comment.text,
          user: comment.user, // Assuming user is populated
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          likeCount,
          replyCount,
          isCommented: true,
        };
      })
    );

    // Return the response with enriched comments
    res.status(200).json({
      success: true,
      comments: enrichedComments,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
  }
};
