require('dotenv').config();
import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type id = mongoose.Types.ObjectId;

export interface IUser extends Document {
  length: number;
  name: string;
  username: string;
  email: string;
  bio?: string;
  password: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  avatar: {
    public_id: string;
    url: string;
  };
  role: string;
  isVerified: boolean;
  followers?: mongoose.Types.Array<IUser['_id']>;
  following?: mongoose.Types.Array<IUser['_id']>;
  followerCount?: number;
  followingCount?: number;
  createdAt?: string;
  courses: Array<{ courseId: string }>;
  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
}

// export interface IUser extends IUserSchema {
// 	fullName: string;
// 	follow: (id: string) => Promise<boolean>;
// 	unfollow: (id: string) => Promise<boolean>;
// }

// // @ts-ignore
// export interface IUser_Populated extends IUser {
// 	followers?: mongoose.Types.Array<IUser>;
// 	following?: mongoose.Types.Array<IUser>;
// }

// export interface IUserModel extends Model<IUser> {}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
    },
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 5,
      lowercase: true,
      match: /^[A-z]*$/,
    },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      validate: {
        validator: function (value: string) {
          return emailRegexPattern.test(value);
        },
        message: 'please enter a valid email',
      },
      unique: true,
    },
    password: {
      type: String,
      // required: [true, "Please enter your password"],
      minlength: [6, 'Password must be atleast 6 characters'],
      select: false,
    },
    bio: {
      type: String,
      default: 'Tell us about yourself!',
      maxlength: 256,
      // select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Number,
    },
    followers: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      select: false,
      ref: 'User',
    },
    following: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
      select: false,
      ref: 'User',
    },
    followerCount: {
      type: Number,
      default: 0,
      // select: false,
    },
    followingCount: {
      type: Number,
      default: 0,
      // select: false,
    },
    // courses: [
    // 	{
    // 		courseId: String,
    // 	},
    // ],
  },
  { timestamps: true }
);

//Hash Password before saving
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();

  if (this.isModified('followers'))
    this.followerCount = this.followers?.length || 0;

  if (this.isModified('following'))
    this.followingCount = this.following?.length || 0;
});

//sign Access token
userSchema.methods.SignAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN || '', {
    expiresIn: '5m',
  });
};

//sign Refresh token
userSchema.methods.SignRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || '', {
    expiresIn: '3d',
  });
};

// userSchema.methods.SignAccessToken = function () {
//   const secret = process.env.ACCESS_TOKEN || "default_secret";
//   return jwt.sign({ id: this._id }, secret);
// };

// userSchema.methods.SignRefreshToken = function () {
//   const secret = process.env.REFRESH_TOKEN || "default_secret";
//   return jwt.sign({ id: this._id }, secret);
// };

//compare password
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

const userModel: Model<IUser> = mongoose.model('User', userSchema);
export default userModel;
