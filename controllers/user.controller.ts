require('dotenv').config();
import { Request, Response, NextFunction } from 'express';
import userModel, { IUser } from '../models/user.model';
import ErrorHandler from '../utils/ErrorHandler';

import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import ejs from 'ejs';
import path from 'path';
import sendMail from '../utils/sendMail';
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from '../utils/jwt';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import { redis } from '../utils/redis';
import {
  getUserById,
  getAllUsersService,
  updateUserRoleService,
} from '../services/user.service';
import cloudinary from 'cloudinary';
import createResetToken from '../utils/resetToken';
import followModel, { IFollow } from '../models/follow.model';

//register user
interface IRegistrationBody {
  name: string;
  username: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, username, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      const isUsernameExist = await userModel.findOne({ username });

      if (!name) {
        return next(new ErrorHandler('Please enter your name', 400));
      }
      if (!username) {
        return next(new ErrorHandler('Please enter your username', 400));
      }
      if (!password) {
        return next(new ErrorHandler('Please enter your password', 400));
      }
      if (
        !password.match(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,20}$/
        )
      ) {
        return next(
          new ErrorHandler(
            'Password must contain at least one uppercase letter, one lowercase letter, one number, one symbol, and be between 6 and 20 characters long',
            400
          )
        );
      }
      if (isEmailExist) {
        return next(new ErrorHandler('Email already exist', 400));
      }
      if (isUsernameExist) {
        return next(
          new ErrorHandler('Username already exist please choose another', 400)
        );
      }

      const user: IRegistrationBody = {
        name,
        username,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, '../mails/activation-mail.ejs'),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: 'Activate your account',
          template: 'activation-mail.ejs',
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email:${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(100000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: '5m' }
  );
  return { token, activationCode };
};

//activte user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: IUser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: IUser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler('Invalid activation code', 400));
      }

      const { name, username, email, password } = newUser.user;

      const existUser = await userModel.findOne({ email });

      if (existUser) {
        return next(new ErrorHandler('Email already exist', 400));
      }

      const user = await userModel.create({ name, username, email, password });

      res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//login user
interface ILoginRequest {
  emailOrUsername: string;
  password: string;
}

// export const loginUser = CatchAsyncError(
// 	async (req: Request, res: Response, next: NextFunction) => {
// 		try {
// 			const { emailOrUsername, password } = req.body as ILoginRequest;

// 			if (!emailOrUsername || !password) {
// 				return next(new ErrorHandler('Please enter email and password', 400));
// 			}

// 			// Check if the provided value for emailOrUsername is an email address
// 			let user: IUser | null;
// 			if (emailOrUsername.includes('@')) {
// 				user = await userModel
// 					.findOne({ email: emailOrUsername })
// 					.select('+password');
// 			} else {
// 				// Otherwise, treat it as a username
// 				user = await userModel
// 					.findOne({ username: emailOrUsername })
// 					.select('+password');
// 			}

// 			if (!user) {
// 				return next(new ErrorHandler('Invalid email or password', 400));
// 			}

// 			const isPasswordMatch = await user.comparePassword(password);
// 			if (!isPasswordMatch) {
// 				return next(new ErrorHandler('Invalid email or password', 400));
// 			}
// 			sendToken(user, 200, res);
// 		} catch (error: any) {
// 			return next(new ErrorHandler(error.message, 400));
// 		}
// 	}
// );

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { emailOrUsername, password } = req.body as {
        emailOrUsername: string;
        password: string;
      };

      if (!emailOrUsername || !password) {
        return next(
          new ErrorHandler('Please enter email (or username) and password', 400)
        );
      }

      let user: IUser | null;
      if (emailOrUsername.includes('@')) {
        user = (await userModel
          .findOne({ email: emailOrUsername })
          .select('+password')) as IUser;
      } else {
        user = (await userModel
          .findOne({ username: emailOrUsername })
          .select('+password')) as IUser;
      }

      if (!user) {
        return next(
          new ErrorHandler('Invalid email (or username) or password', 400)
        );
      }

      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(
          new ErrorHandler('Invalid email (or username) or password', 400)
        );
      }

      // Password is correct, generate and send authentication tokens
      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Helper function to send authentication tokens
// function sendToken(user: IUser, statusCode: number, res: Response) {
// 	const accessToken = user.SignAccessToken();
// 	const refreshToken = user.SignRefreshToken();

// 	res.status(statusCode).json({
// 		success: true,
// 		accessToken,
// 		refreshToken,
// 	});
// }
//logout user
export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie('access_token', '', { maxAge: 1 });
      res.cookie('refresh_token', '', { maxAge: 1 });
      const userId = req.user?._id || '';
      redis.del(userId);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update access token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;

      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = 'Could not refresh token';

      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }

      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(
          new ErrorHandler('Please login to access to this resource!', 400)
        );
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: '15d' }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: '3d' }
      );

      req.user = user;

      res.cookie('access_token', accessToken, accessTokenOptions);
      res.cookie('refresh_token', refreshToken, refreshTokenOptions);

      await redis.set(user._id, JSON.stringify(user), 'EX', 604800); //7 days

      // res.status(200).json({
      //   status: "success",
      //   accessToken,
      // });
      next();
    } catch (error: any) {
      console.error('Error in updateAccessToken middleware:', error);
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getUserByUsername = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get username from request params
    const { username } = req.params; // Assuming 'username' is the param name
    // Find the user by username

    const user: IUser | null = await userModel.findOne({ username });

    // Check if user exists
    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    // Check if the current user is following this user
    const currentUserId = req.user?._id; // Assuming the user ID is attached to the request
    let isFollowing = false;

    if (currentUserId) {
      const follow: IFollow | null = await followModel.findOne({
        follower: currentUserId,
        following: user._id,
      });

      if (follow) {
        isFollowing = true;
      }
    }

    // Aggregate to count followers and followings
    const followersCount = await followModel.countDocuments({
      following: user._id,
    });
    const followingsCount = await followModel.countDocuments({
      follower: user._id,
    });

    // Prepare the response data with follower and following counts
    const responseData = {
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      followersCount,
      followingsCount,
      following: isFollowing, // Include following status in the response
      createdAt: user.createdAt,
    };

    res.status(200).json({
      success: true,
      message: 'User information',
      data: responseData,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

interface ISocialAuthBody {
  name: string;
  email: string;
  avatar: string;
  username?: string;
}

//social Auth
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar, username } = req.body as ISocialAuthBody;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({
          email,
          name,
          avatar,
          username,
        });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user info
interface IUpdateUserInfo {
  name?: string;
  username?: string;
  email?: string;
  bio?: string;
}

export const updateUserInfos = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, username, email, bio } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;

      // Validate input
      if (!name && !username && !email && !bio) {
        return next(
          new ErrorHandler('Please provide at least one field to update', 400)
        );
      }

      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler('User not found', 404));
      }

      // Update user information
      if (name) user.name = name;
      if (username) user.username = username;
      if (bio) user.bio = bio;

      if (email && email !== user.email) {
        // Email is being updated, generate a new activation token
        const activationToken = createActivationToken({
          name: user.name,
          username: user.username,
          email,
        });
        user.email = email;

        const activationCode = activationToken.activationCode;

        const data = { user: { name: user.name }, activationCode };
        const html = await ejs.renderFile(
          path.join(__dirname, '../mails/activation-mail.ejs'),
          data
        );

        await sendMail({
          email: user.email,
          subject: 'Activate your new email address',
          template: 'activation-mail.ejs',
          data,
        });

        // Update activation token in database (optional)
        // await user.updateOne({ activationToken: activationToken.token });
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: 'User information updated successfully',
        user: {
          name: user.name,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, username, email, bio } = req.body as IUpdateUserInfo;
      const userId = req.user?._id;

      // Validate input
      if (!name && !username && !email && !bio) {
        return next(
          new ErrorHandler('Please provide at least one field to update', 400)
        );
      }

      const user = await userModel.findById(userId);

      if (!user) {
        return next(new ErrorHandler('User not found', 404));
      }

      // Check if the provided values are the same as current user info
      if (name && name === user.name) {
        return next(new ErrorHandler('Name is already set to this value', 400));
      }
      if (username && username === user.username) {
        return next(
          new ErrorHandler('Username is already set to this value', 400)
        );
      }
      if (email && email === user.email) {
        return next(
          new ErrorHandler('Email is already set to this value', 400)
        );
      }

      // Update user information
      if (name) user.name = name;
      if (username) user.username = username;
      if (bio) user.bio = bio;

      if (email && email !== user.email) {
        // Email is being updated, generate a new activation token
        const activationToken = createActivationToken({
          name: user.name,
          username: user.username,
          email,
        });
        user.email = email;

        const activationCode = activationToken.activationCode;

        const data = { user: { name: user.name }, activationCode };
        const html = await ejs.renderFile(
          path.join(__dirname, '../mails/activation-mail.ejs'),
          data
        );

        try {
          await sendMail({
            email: user.email,
            subject:
              "Verify your new email address and you gota make sure you've given the your original email address a",
            template: 'activation-mail.ejs',
            data,
          });

          res.status(201).json({
            success: true,
            message: `Please check your email:${user.email} to verify your new email`,
            activationToken: activationToken.token,
          });
        } catch (error: any) {
          return next(new ErrorHandler(error.message, 400));
        }

        // Update activation token in database (optional)
        // await user.updateOne({ activationToken: activationToken.token });
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: 'User information updated successfully',
        user: {
          name: user.name,
          username: user.username,
          email: user.email,
          bio: user.bio,
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user password

interface IUpdateUserPassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdateUserPassword;

      if (!oldPassword || !newPassword) {
        return next(new ErrorHandler('Please enter old and new password', 400));
      }

      const user = await userModel.findById(req.user?._id).select('+password');

      if (user?.password === undefined) {
        return next(new ErrorHandler('Invalid user', 400));
      }
      const isPasswordMatch = await user?.comparePassword(oldPassword);

      if (!isPasswordMatch) {
        return next(new ErrorHandler('Invalid old password ', 400));
      }

      user.password = newPassword;

      await user.save();

      await redis.set(req.user?._id, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IUpdateProfilePicture {
  avatar: string;
}

//update profile picture
export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateProfilePicture;

      const userId = req.user?._id;

      const user = await userModel.findById(userId);

      if (avatar && user) {
        //if user have one avatar then call this if
        if (user?.avatar?.public_id) {
          //first delete the old image
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }

      await user?.save();

      await redis.set(userId, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Forget password
export const forgetPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new ErrorHandler('Please provide your email address', 400));
      }

      const user = await userModel.findOne({ email });
      // console.log("user",user)

      if (!user) {
        return next(new ErrorHandler('User not found', 404));
      }

      // Generate password reset token
      const resetToken = await createResetToken(user._id.toString()); // Pass userId as a string

      const resetLink = `${process.env.CLIENT_URL}?verify=${resetToken}`;

      const data = { user: { name: user.name }, resetLink };
      const html = await ejs.renderFile(
        path.join(__dirname, '../mails/reset-password-mail.ejs'),
        data
      );

      await sendMail({
        email: user.email,
        subject: 'Password Reset Request',
        template: 'reset-password-mail.ejs',
        data,
      });

      res.status(200).json({
        success: true,
        message: `Password reset link sent to ${user.email}`,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
// Reset password
// Route to handle password reset using the reset token
export const resetPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { newPassword } = req.body;
      const resetToken = req.params.resetToken;

      console.log('resetToken', resetToken);

      if (!resetToken || !newPassword) {
        return next(
          new ErrorHandler('Reset token and new password are required', 400)
        );
      }

      if (
        !newPassword.match(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,20}$/
        )
      ) {
        return next(
          new ErrorHandler(
            'Password must contain at least one uppercase letter, one lowercase letter, one number, one symbol, and be between 6 and 20 characters long',
            400
          )
        );
      }

      // Find user by reset token
      const user = await userModel.findOne({
        resetPasswordToken: resetToken,
        resetPasswordExpires: { $gt: new Date() }, // Check if reset token is not expired
      });

      if (!user) {
        return next(new ErrorHandler('Invalid or expired reset token', 400));
      }

      // Update user's password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//get all users -- only for admin
export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?._id;
      getAllUsersService(res, currentUserId);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getRandomUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the current user ID from the request (assuming it's attached via middleware)
    const currentUserId = req.user?._id; // Assuming the user ID is attached to the request

    // Find five random users
    const randomUsers: IUser[] = await userModel.aggregate([
      { $sample: { size: 5 } }, // Retrieve five random documents
    ]);

    // Prepare an array of user IDs for the random users
    const randomUserIds = randomUsers.map((user) => user._id);

    // Check follow status for each random user
    const followStatuses: { [key: string]: boolean } = {};
    if (currentUserId) {
      const followings: IFollow[] = await followModel.find({
        follower: currentUserId,
        following: { $in: randomUserIds },
      });

      // Map followings to a dictionary for quick lookup
      followings.forEach((follow) => {
        followStatuses[follow.following.toString()] = true;
      });
    }

    // Prepare response with random users and follow statuses
    const responseUsers = randomUsers.map((user) => ({
      _id: user._id,
      name: user.name,
      // email: user.email,
      username: user.username,
      // Check if the current user is following this random user
      isFollowing: followStatuses[user._id.toString()] || false,
    }));

    // Send the response with the random users and follow statuses
    res.status(200).json({
      success: true,
      users: responseUsers,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
  }
};

// export const getRandomUsers = CatchAsyncError(
// 	async (req: Request, res: Response, next: NextFunction) => {
// 		try {
// 			// Get the logged-in user ID (assuming it's available in req.user)
// 			const currentUserId = req.user?._id;

// 			// Aggregate pipeline to achieve random sampling and following check
// 			const aggregation = [
// 				{ $sample: { size: 5 } },
// 				{
// 					$lookup: {
// 						from: 'follows',
// 						localField: '_id',
// 						foreignField: 'following',
// 						as: 'following',
// 					},
// 				},
// 				{
// 					$unwind: {
// 						path: '$following', // Unwind the following array
// 					},
// 				},
// 				{
// 					$addFields: {
// 						isFollowing: {
// 							$cond: {
// 								// Conditional expression to check for following status
// 								if: { $eq: ['$following._id', currentUserId] }, // Check if following IDs match
// 								then: true,
// 								else: false,
// 							},
// 						},
// 					},
// 				},
// 				{
// 					$project: {
// 						following: 0, // Exclude the entire following object if not needed
// 						_id: 1,
// 						name: 1,
// 						username: 1,
// 						// ... other desired user fields
// 					},
// 				},
// 			];

// 			// Execute the aggregation pipeline
// 			const users = await userModel.aggregate(aggregation);

// 			res.status(200).json({
// 				success: true,
// 				users,
// 			});
// 		} catch (error: any) {
// 			return next(new ErrorHandler(error.message, 500)); // Handle errors gracefully
// 		}
// 	}
// );

//update user role -- only for admin
export const updateUserRole = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, role } = req.body;

      updateUserRoleService(res, id, role);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//delete user -- only admin
export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const user = await userModel.findById(id);

      if (!user) {
        return next(new ErrorHandler('User not found', 404));
      }

      await user.deleteOne({ id });

      await redis.del(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
