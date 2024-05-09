require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import mongoose, { Types, isValidObjectId } from 'mongoose';
import postModel, { IPost } from '../models/post.model';
import ErrorHandler from '../utils/ErrorHandler';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import Share, { IShare } from '../models/share.model';
import { IUser } from '../models/user.model';
import commentModel, { IComment } from '../models/comment.model';
import replyModel from '../models/reply.model';

// Create post
interface ICreateShare {
  type: 'post' | 'comment' | 'reply';
  text?: string;
  image?: string;
  video?: string;
  user: Types.ObjectId | IUser; // Reference to User document
  post?: Types.ObjectId | IPost; // Reference to User document
  comment?: Types.ObjectId | IComment; // Reference to User document
}

export const sharePost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from request (assuming middleware populates req.user)
      const userId = req.user?._id;

      // Get target details from request body
      const { targetType } = req.body;
      const targetId = req.params.targetId;

      // Validate post ID
      if (!isValidObjectId(targetId)) {
        return next(new ErrorHandler('Invalid target ID', 400));
      }

      if (!['post', 'comment', 'reply'].includes(targetType)) {
        return next(new ErrorHandler('Invalid target type', 400));
      }

      let targetPost;
      let targetContent;
      switch (targetType) {
        case 'post':
          targetPost = await postModel.findById(targetId);
          break;
        case 'comment':
          targetContent = await commentModel.findById(targetId);
          if (targetContent) {
            targetPost = await postModel.findById(targetContent.post); // Find the post associated with the comment
          }
          break;
        case 'reply':
          targetContent = await replyModel.findById(targetId); // Replace ReplyModel with your actual reply model import
          if (targetContent) {
            if (targetType === 'comment') {
              const comment = await commentModel.findById(
                targetContent.targetId
              ); // Find the comment associated with the reply
              if (comment) {
                targetPost = await postModel.findById(comment.post); // Find the post associated with the comment
              }
            }
            // if (targetType === 'reply') {
            // 	const comment = await commentModel.findById(
            // 		targetContent.targetId
            // 	); // Find the comment associated with the reply
            //   if (comment) {
            //     targetPost = await postModel.findById(comment.post); // Find the post associated with the comment
            //   }
            // }
          }
          break;
      }

      // Check if target content exists
      if (!targetPost || !targetContent) {
        // Check for both post and target content existence
        return next(new ErrorHandler('Target content not found', 404));
      }

      // Check if the user has already shared this content (optional)
      // const existingShare = await Share.findOne({ user: userId, targetType, targetId });
      // if (existingShare) {
      //   return next(new ErrorHandler('You have already shared this content', 400));
      // }

      // Get optional message from request body
      const text = req.body.message; // Optional

      // Validate text length if provided
      if (text && text.length > 280) {
        return next(
          new ErrorHandler(
            'Post text exceeds maximum length (280 characters)',
            400
          )
        );
      }

      // Create a new share document
      const newShare = new Share({
        user: userId,
        targetType,
        targetId,
        text, // Include message if provided
      });

      // Save the share
      const savedShare = await newShare.save();

      // Populate the sharing user
      const populatedShare = await Share.findById(savedShare._id).populate(
        'user',
        'name username'
      );

      // Based on targetType, populate relevant data (post, comment, or reply)

      res.status(200).json({
        success: true,
        message: 'Content shared successfully',
        share: populatedShare, // Include share details or populated content data
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

// export const sharePost1 = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { postId } = req.params;
//     const userId = req.user?._id;

//     // Check if postId is valid
//     if (!mongoose.Types.ObjectId.isValid(postId)) {
//       return next(new ErrorHandler('Invalid post ID', 400));
//     }

//     // Check if the post exists
//     const post = await postModel.findById(postId);
//     if (!post) {
//       return next(new ErrorHandler('Post not found', 404));
//     }

//     // Check if the user has already shared the post
//     const existingShare = await ShareModel.findOne({
//       user: userId,
//       post: postId,
//     });
//     if (existingShare) {
//       return next(new ErrorHandler('Post already shared', 400));
//     }

//     // Create a new share
//     const newShare: IShare = new ShareModel({
//       user: userId,
//       post: postId,
//     });
//     await newShare.save();

//     // Update the sharedBy array in the post model
//     post.sharedBy.push(userId);
//     await post.save();

//     res
//       .status(201)
//       .json({ success: true, message: 'Post shared successfully' });
//   } catch (error: any) {
//     return next(new ErrorHandler(error.message, 500));
//   }
// };
