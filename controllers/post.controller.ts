require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import mongoose, { Types, isValidObjectId } from 'mongoose'; // For validating post ID
// import { uploadImage } from '../utils/imageUpload';

import postModel, { IPost } from '../models/post.model';
import userModel, { IUser } from '../models/user.model';
import likeModel, { ILike } from '../models/likes.model';
import ErrorHandler from '../utils/ErrorHandler';

// Assuming you have middleware for authentication and authorization
import { isAuthenticated, authorizeRoles } from '../middleware/auth';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import { IComment } from '../models/comment.model';
import followModel from '../models/follow.model';
import RepostModel, { IRepost } from '../models/repost.model';
import repostModel from '../models/repost.model';

// Create post
interface ICreatePost {
  type: 'post' | 'comment' | 'reply';
  text?: string;
  image?: string;
  video?: string;
  user: Types.ObjectId | IUser; // Reference to User document
  post?: Types.ObjectId | IPost; // Reference to User document
  // comments?: Types.ObjectId | IComment; // Reference to User document
}

export const createPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from the request (assuming middleware populates req.user)
      const userId = req.user?._id;

      // Check if user exists
      const existingUser = await userModel.findById(userId);
      if (!existingUser) {
        return next(new ErrorHandler('User not found', 400));
      }

      // Get post data from request body
      const { type, text, image, video } = req.body;
      // console.log('text', text);

      // Validate required fields
      if (!type) {
        return next(new ErrorHandler('Post type is required', 400));
      }

      // Validate text length if provided
      if (text && text.length > 280) {
        return next(
          new ErrorHandler(
            'Post text exceeds maximum length (280 characters)',
            400
          )
        );
      }

      // Create new post document
      const newPostData: ICreatePost = {
        type,
        user: userId as Types.ObjectId,
      };
      // Add optional content to the post data if provided
      if (text) {
        newPostData.text = text;
      }
      if (image) {
        newPostData.image = image;
      }
      if (video) {
        newPostData.video = video;
      }
      // Upload image using your uploadImage utility (replace with actual logic)
      // let uploadedImage;
      // if (image) {
      // 	uploadedImage = await uploadImage(req.file); // Replace with actual image upload logic
      // }

      // Create new post document
      const newPost: IPost = new postModel(newPostData);

      // Save the post
      const savedPost = await newPost.save();

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        post: savedPost,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

export const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { postId } = req.params;
    const userId = req.user?._id;

    // Validate post ID
    if (!isValidObjectId(postId)) {
      return next(new ErrorHandler('Invalid post ID', 400));
    }

    // Aggregate to calculate counts of likes and comments for the post
    const post = await postModel.aggregate([
      { $match: { _id: new Types.ObjectId(postId) } },
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
            $in: [new mongoose.Types.ObjectId(userId), '$likes.user'], // Compare user ID with likes.user._id
          },
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
          post: 1,
          text: 1,
          image: 1,
          video: 1,
          likeCount: 1,
          // commentCount: 1,
          nestedCount: 1,
          createdAt: 1,
          updatedAt: 1,
          isLiked: 1,

          // likes: 0, // Exclude the likes array from the final output
          // comments: 0,
        },
      },
    ]);

    // Check if post exists (post will be an array with one element after aggregation)
    if (!post || post.length === 0) {
      return post || next(new ErrorHandler('Post not found', 404));
    }

    // Extract the single post from the array
    const detailedPost = post[0];

    // Send the response with the detailed post including counts
    res.status(200).json({
      success: true,
      post: detailedPost,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

// export const getPostById = CatchAsyncError(
// 	async (req: Request, res: Response, next: NextFunction) => {
// 		try {
// 			const { postId } = req.params;

// 			// Validate post ID
// 			if (!isValidObjectId(postId)) {
// 				return next(new ErrorHandler('Invalid post ID', 400));
// 			}

// 			// Find post by ID
// 			const post = await postModel
// 				.findById(postId)
// 				.populate('user', 'name username email')
// 				.populate('comments')
// 				.populate('likedBy');
// 			// .populate({
// 			// 	path: 'comments', // Populate comments associated with the post
// 			// 	populate: {
// 			// 		path: 'user', // Populate user details for each comment
// 			// 		select: 'name email', // Select specific fields to populate
// 			// 	},
// 			// });
// 			// console.log(post); // Log the populated post object

// 			// Check if post exists
// 			if (!post) {
// 				return next(new ErrorHandler('Post not found', 404));
// 			}

// 			res.status(200).json({
// 				success: true,
// 				post,
// 			});
// 		} catch (error: any) {
// 			return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
// 		}
// 	}
// );

export const getAllPosts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Fetch all posts (consider pagination for large datasets)
      const posts = await postModel.find().populate('user', 'name email');

      res.status(200).json({
        success: true,
        posts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);
export const testPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This is test response to verify the post route is working
      res.status(200).json({
        success: true,
        message: 'Post route is working!',
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

export const getUserPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get username from request params
      const { username } = req.params; // Assuming 'username' is the param name

      // Find the user by username
      const user = await userModel.findOne({ username });

      // Check if user exists
      if (!user) {
        return next(new ErrorHandler('User not found', 404));
      }

      // Aggregate to retrieve posts by the user with counts of likes and comments
      const myPost = await postModel.aggregate([
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
          $lookup: {
            from: 'reposts',
            localField: '_id',
            foreignField: 'originalPost',
            as: 'reposts',
          },
        },
        {
          $lookup: {
            from: 'reposts',
            localField: '_id',
            foreignField: 'user',
            as: 'reposted',
          },
        },
        {
          $addFields: {
            likeCount: { $size: '$likes' },
            // commentCount: { $size: '$comments' },
            nestedCount: { $size: '$nested' },
            repostedCount: { $size: '$reposts' },
            isLiked: {
              $in: [new mongoose.Types.ObjectId(user._id), '$likes.user'], // Compare user Id with likes.user
            },
            isReposted: {
              $in: [new mongoose.Types.ObjectId(user._id), '$reposts.user'], // Compare user Id with likes.user
            },
            isNested: {
              $in: [new mongoose.Types.ObjectId(user._id), '$nested.user'], // Compare user Id with likes.user
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
          $sort: { createdAt: -1 },
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
            isLiked: 1,
            isNested: 1,
            isReposted: 1,
            likeCount: 1,
            repostedCount: 1,
            // commentCount: 1,
            nestedCount: 1,
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
        message: `List of posts by ${username}`,
        data: myPost,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
    }
  }
);

// export const myFeed = CatchAsyncError(
// 	async (req: Request, res: Response, next: NextFunction) => {
// 		try {
// 			// Get the logged-in user ID
// 			const userId = req.user?._id;
// 			const { offset = 0, limit = 10 } = req.query; // Set default values for offset and limit

// 			// Find following user IDs (excluding the current user)
// 			const following = await followModel
// 				.find({ follower: userId })
// 				.select('following');
// 			const followingUserIds = following.map((follow) => follow.following);

// 			// Combine current user ID with following user IDs for the query
// 			const userIds = [...followingUserIds, userId];

// 			// Find posts from following users and the current user
// 			const posts = await postModel
// 				.find({
// 					user: { $in: userIds }, // Use $in operator to check for multiple user IDs
// 				})
// 				.sort({ createdAt: -1 }) // Sort by creation date descending (latest first)
// 				.skip(Number(offset)) // Apply offset for pagination
// 				.limit(Number(limit)) // Apply limit for pagination
// 				.populate('user', 'name username email');

// 			res.status(200).json({
// 				success: true,
// 				message: 'Posts from following and yourself',
// 				posts: posts,
// 			});
// 		} catch (error: any) {
// 			return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
// 		}
// 	}
// );

export const myFeed = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
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
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'post',
            as: 'nested',
          },
        },
        {
          $lookup: {
            from: 'reposts',
            let: { postId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $in: [
                          '$user',
                          userIds.map((id) => new Types.ObjectId(id)),
                        ],
                      }, // Repost by current user or users being followed
                      { $eq: ['$originalPost', '$$postId'] }, // Match reposts for the current post
                    ],
                  },
                },
              },
            ],
            as: 'reposts',
          },
        },
        {
          $addFields: {
            likeCount: { $size: '$likes' },
            // commentCount: { $size: '$comments' },
            nestedCount: { $size: '$nested' },
            repostedCount: { $size: '$reposts' },

            isLiked: {
              $in: [new mongoose.Types.ObjectId(userId), '$likes.user'],
            }, // Compare user Id with likes.user

            isReposted: { $gt: [{ $size: '$reposts' }, 0] }, // Check if post has been reposted
            isNested: { $gt: [{ $size: '$nested' }, 0] }, // Check if post has been nested
            isRepostedByUser: {
              $in: [new mongoose.Types.ObjectId(userId), '$reposts.user'],
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
            reposts: {
              $push: {
                $mergeObjects: [
                  { user: '$isRepostedByUser' }, // Include a flag for repost by user
                  { originalPost: '$$ROOT' }, // Include original post details
                ],
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [
                '$root',
                { nestedPosts: '$nestedPosts' },
                { reposts: '$reposts' },
              ],
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
                  $mergeObjects: [
                    '$$nestedPost',
                    {
                      userDetails: {
                        name: {
                          $arrayElemAt: ['$nestedPosts.userDetails.name', 0],
                        }, // Access first element of the name array
                        username: {
                          $arrayElemAt: [
                            '$nestedPosts.userDetails.username',
                            0,
                          ],
                        }, // Access first element of the username array
                        // Exclude email or other user details
                      },
                    },
                  ],
                },
              },
            },
            likeCount: 1,
            commentCount: 1,
            nestedCount: 1,
            repostedCount: 1,
            isReposted: 1,
            isNested: 1,
            isLiked: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      const reposts = await RepostModel.aggregate([
        {
          $match: {
            user: { $in: userIds.map((id) => new Types.ObjectId(id)) },
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
            from: 'likes',
            localField: 'uset',
            foreignField: 'user',
            as: 'likes',
          },
        },
        {
          $lookup: {
            from: 'posts',
            localField: 'originalPost._id',
            foreignField: 'post',
            as: 'originalPost.nested',
          },
        },
        {
          $lookup: {
            from: 'reposts',
            localField: 'originalPost._id',
            foreignField: 'originalPost',
            as: 'originalPost.reposts',
          },
        },
        {
          $addFields: {
            // Calculate like and comment counts for the original post
            'originalPost.likeCount': { $size: '$originalPost.likes' },
            'originalPost.nestedCount': { $size: '$originalPost.nested' },
            'originalPost.repostedCount': { $size: '$originalPost.reposts' },
            isLiked: {
              $in: [new mongoose.Types.ObjectId(userId), '$likes.user'],
            }, // Compare user Id with likes.user

            // isReposted: { $gt: [{ $size: '$originalPost.repostedCount' }, 0] }, // Check if post has been reposted
            isNested: { $gt: [{ $size: '$originalPost.nested' }, 0] }, // Check if post has been nested
            // isRepostedByUser: {
            //   $in: [new mongoose.Types.ObjectId(userId), '$reposts.user'],
            // },

            // 'originalPost.commentCount': { $size: '$originalPost.comments' },
            isRepostedPost: 'true',
          },
        },
        {
          $project: {
            isRepostedPost: 1,
            user: 1,
            // comment: 1, // Repost comment (optional)
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
              isReposted: 1,
              isNested: 1,
              isLiked: 1,
              likeCount: 1,
              nestedCount: 1,
              repostedCount: 1,
              createdAt: 1,
              updatedAt: 1,
              // likes: 0, // Exclude the likes array from the final output (optional)
              // comments: 0, // Exclude the comments array from the final output (optional)
            },
          },
        },
      ]);

      const allPosts = [...reposts, ...posts];
      allPosts.sort((a, b) => b.createdAt - a.createdAt);

      res.status(200).json({
        success: true,
        message: 'Posts from yourself and your following users',
        data: allPosts,
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
        return next(new ErrorHandler('Invalid post ID', 400));
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

export const nestedPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID from the request
      const userId = req.user?._id;
      const { postId } = req.params;
      const type = 'post';

      // Validate post ID
      if (!isValidObjectId(postId)) {
        return next(new ErrorHandler('Invalid post ID', 400));
      }

      // Check if the post Id exists
      const validPostId = await postModel.findById(postId);

      if (!validPostId) {
        return next(new ErrorHandler('Invalid post ID', 400));
      }

      // Get content for the nested post
      const { text, image, video } = req.body;

      if (!text && !image && !video) {
        return next(new ErrorHandler('Content is required', 400));
      }

      // const nested post data
      const nestedPostData: ICreatePost = {
        type,
        user: userId as Types.ObjectId,
        post: new Types.ObjectId(postId),
      };

      // Add optional content to the comment data if provided
      if (text) {
        if (text.length > 280) {
          return next(
            new ErrorHandler(
              'Post text exceeds maximum length (280 characters)',
              400
            )
          );
        } else {
          nestedPostData.text = text;
        }
      }

      if (image) {
        nestedPostData.image = image;
      }
      if (video) {
        nestedPostData.video = video;
      }

      // Create a nested post document
      const nestedPost: IPost = new postModel(nestedPostData);

      // Save the nestedPost to the PostModel
      const saveNestedPost = await nestedPost.save();

      // Fetch response
      res.status(201).json({
        success: true,
        message: 'Reply created successfully',
        nestedPost: saveNestedPost,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getNestedPostForPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;

      // Validate post ID
      if (!isValidObjectId(postId)) {
        return next(new ErrorHandler('Invalid post ID', 400));
      }

      // Check if the post ID exists
      const validPostId = await postModel.findById(postId);

      if (!validPostId) {
        return next(new ErrorHandler('Invalid post ID', 400));
      }

      // Use aggregation to find nested posts with like and comment counts
      const nestedPosts = await postModel.aggregate([
        { $match: { post: new Types.ObjectId(postId) } }, // Filter posts where 'post' field matches postId
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
            from: 'posts',
            localField: '_id',
            foreignField: 'post',
            as: 'nested',
          },
        },
        {
          $addFields: {
            likeCount: { $size: '$likes' },
            nestedCount: { $size: '$nested' },
          },
        },
        {
          $project: {
            likes: 0, // Exclude the likes array from the final output
            comments: 0, // Exclude the comments array from the final output
          },
        },
        {
          $sort: { createdAt: -1 }, // Sort by creation date descending (latest first)
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
            'user.email': 1, // Adjust according to privacy settings
            text: 1,
            image: 1,
            video: 1,
            likeCount: 1,
            nestedCount: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      // Return the response with populated data
      res.status(200).json({
        success: true,
        data: nestedPosts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// export const followUser = async (
// 	req: Request,
// 	res: Response,
// 	next: NextFunction
// ) => {
// 	try {
// 		const userId = req.user?._id; // Get current user ID
// 		const { id } = req.params; // Get user ID to follow

// 		const user = (await userModel.findById(userId)) as IUser;
// 		if (!user) {
// 			return next(new ErrorHandler('User not found', 404));
// 		}

// 		const success = await user.follow(id);
// 		if (success) {
// 			res
// 				.status(200)
// 				.json({ success: true, message: 'User followed successfully' });
// 		} else {
// 			res
// 				.status(400)
// 				.json({ success: false, message: 'Failed to follow user' });
// 		}
// 	} catch (error: any) {
// 		return next(new ErrorHandler(error.message, 500));
// 	}
// };

// export const unfollowUser = async (
// 	req: Request,
// 	res: Response,
// 	next: NextFunction
// ) => {
// 	try {
// 		const userId = req.user?._id; // Get current user ID
// 		const { id } = req.params; // Get user ID to unfollow

// 		const user = (await userModel.findById(userId)) as IUser;
// 		if (!user) {
// 			return next(new ErrorHandler('User not found', 404));
// 		}

// 		const success = await user.unfollow(id);
// 		if (success) {
// 			res
// 				.status(200)
// 				.json({ success: true, message: 'User unfollowed successfully' });
// 		} else {
// 			res
// 				.status(400)
// 				.json({ success: false, message: 'Failed to unfollow user' });
// 		}
// 	} catch (error: any) {
// 		return next(new ErrorHandler(error.message, 500));
// 	}
// };

export const myFeed1 = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      const { offset = 0, limit = 50 } = req.query;

      // Find following user IDs (including the current user)
      const following = await followModel
        .find({ follower: userId })
        .select('following');
      const followingUserIds = following.map((follow) => follow.following);

      // Include current user ID and following user IDs for the query
      const userIds = [...followingUserIds, userId];

      const posts = await postModel.aggregate([
        // {
        //   $match: {
        //     user: { $in: userIds.map((id) => new Types.ObjectId(id)) },
        //   },
        // },
        {
          $match: {
            $or: [
              { user: { $in: userIds.map((id) => new Types.ObjectId(id)) } },
              {
                _id: {
                  $in: {
                    $map: {
                      input: '$reposts',
                      as: 'repost',
                      in: '$$repost.originalPost',
                    },
                  },
                },
              },
            ],
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
            from: 'posts',
            localField: '_id',
            foreignField: 'post',
            as: 'nested',
          },
        },
        {
          $lookup: {
            from: 'reposts',
            let: { postUserId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $in: [
                          '$user',
                          userIds.map((id) => new Types.ObjectId(id)),
                        ],
                      },
                      { $eq: ['$originalPost', '$$postUserId'] },
                    ],
                  },
                },
              },
            ],
            as: 'reposts',
          },
        },
        {
          $addFields: {
            likeCount: { $size: '$likes' },
            nestedCount: { $size: '$nested' },
            repostedCount: { $size: '$reposts' },
            isLiked: {
              $in: [new Types.ObjectId(userId), '$likes.user'],
            },
            isReposted: { $gt: [{ $size: '$reposts' }, 0] },
            isNested: { $gt: [{ $size: '$nested' }, 0] },
            isRepostedByUser: {
              $in: [new mongoose.Types.ObjectId(userId), '$reposts.user'],
            },
          },
        },
        {
          $project: {
            likes: 0,
            comments: 0,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $skip: Number(offset),
        },
        {
          $limit: Number(limit),
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
          $unwind: '$user',
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
            nestedCount: 1,
            repostedCount: 1,
            isReposted: 1,
            isNested: 1,
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
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// async function getRepostedPostIds(
//   userId: Types.ObjectId
// ): Promise<Types.ObjectId[]> {
//   const reposts: IRepost[] = await RepostModel.find({ user: userId }).select(
//     'originalPost'
//   );
//   return reposts.map((repost) => repost.originalPost);
// }

export const getUserPosts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;

      // Find user IDs of the users being followed (including the current user)
      const followingUsers = await userModel
        .findById(userId)
        .select('following');
      const followingUserIds = followingUsers?.following || [];
      // followingUserIds.push(userId); // Include current user in the list
      const userIds = [...followingUserIds, userId];

      // Aggregate pipeline to fetch posts with related data
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
            from: 'reposts',
            let: { postId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $in: [
                          '$user',
                          userIds.map((id) => new Types.ObjectId(id)),
                        ],
                      },
                      { $eq: ['$originalPost', '$$postId'] },
                    ],
                  },
                },
              },
            ],
            as: 'reposts',
          },
        },
        {
          $addFields: {
            likeCount: { $size: '$likes' },
            repostCount: { $size: '$reposts' },
            isLiked: { $in: [userId, '$likes.user'] },
            isReposted: { $gt: [{ $size: '$reposts' }, 0] },
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
          $addFields: {
            nestedCount: { $size: '$nestedPosts' },
          },
        },
        {
          $project: {
            likes: 0,
            reposts: 0,
            nestedPosts: 0,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);

      res.status(200).json({
        success: true,
        message: 'User posts and interactions retrieved successfully',
        posts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllPost = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the user ID from the request
      const userId = req.user?._id;

      // Get all posts created by the user
      const userPosts = await postModel
        .find({ user: userId })
        .populate({
          path: 'user',
          select: 'name avatar',
        })
        .populate({
          path: 'likedBy',
          select: '_id',
        });

      // Get following list of the user
      const following = await userModel.findById(userId).select('following');

      // Check if following exists
      if (!following) {
        return next(new ErrorHandler('User not found', 404));
      }

      // Get all posts from users the current user is following
      const followingPosts = await postModel
        .find({ user: { $in: following.following } })
        .populate({
          path: 'user',
          select: 'name avatar',
        })
        .populate({
          path: 'likedBy',
          select: '_id',
        });

      // Get all reposts created by the user
      const userReposts = await repostModel.find({ user: userId }).populate({
        path: 'originalPost',
        populate: [
          { path: 'user', select: 'name avatar' },
          { path: 'likedBy', select: '_id' },
        ],
      });

      // Get all reposts where the original post was created by users the current user is following
      const followingReposts = await repostModel
        .find({
          originalPost: { $in: followingPosts.map((post) => post._id) },
        })
        .populate({
          path: 'user',
          select: 'name avatar',
        })
        .populate({
          path: 'originalPost',
          populate: [
            { path: 'user', select: 'name avatar' },
            { path: 'likedBy', select: '_id' },
          ],
        });

      // Combine all posts
      const allPosts = [
        ...userPosts,
        ...followingPosts,
        ...userReposts,
        ...followingReposts,
      ];

      // Sort posts by created date in descending order
      // allPosts.sort((a, b) => b.createdAt - a.createdAt);

      // Check if current user liked the post
      // const checkLiked = async (post) => {
      //   return post.likedBy.some(user => user._id.toString() === userId.toString());
      // };

      // // Iterate through each post and populate additional data
      // for (const post of allPosts) {
      //   // Get the number of likes for the post
      //   const likesCount = post.likedBy.length;
      //   post.likesCount = likesCount;

      //   // Get the number of nested posts (replies) for the post
      //   const nestedPostsCount = await postModel.countDocuments({ post: post._id });
      //   post.nestedPostsCount = nestedPostsCount;

      //   // Check if the current user liked the post
      //   post.isLiked = await checkLiked(post);
      // }

      res.status(200).json({
        success: true,
        message: 'All posts retrieved successfully',
        posts: allPosts,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
