import mongoose, { Document, Model } from 'mongoose';
import { hashPassword } from '../lib/hash';
import './Notification';
import { Notification, UserNotificationType } from './Notification';

type id = mongoose.Types.ObjectId;

interface IUserSchema extends Document {
	firstName: string;
	lastName: string;
	bio?: string;
	phoneNumber?: string;
	email?: string;
	userName: string;
	password?: string;
	followers?: mongoose.Types.Array<id>;
	following?: mongoose.Types.Array<id>;
	followerCount?: number;
	followingCount?: number;
	profilePicUrl: string;
	_createdAt: Date;
	_updatedAt: Date;
}

export interface IUser extends IUserSchema {
	fullName: string;
	follow: (id: string) => Promise<boolean>;
	unfollow: (id: string) => Promise<boolean>;
}

// @ts-ignore
export interface IUser_Populated extends IUser {
	followers?: mongoose.Types.Array<IUser>;
	following?: mongoose.Types.Array<IUser>;
}

export interface IUserModel extends Model<IUser> {}

const userSchema = new mongoose.Schema(
	{
		firstName: {
			type: String,
			required: true,
			minlength: 2,
		},
		lastName: {
			type: String,
			required: true,
			minlength: 1,
		},
		phoneNumber: {
			type: String,
			select: false,
		},
		bio: {
			type: String,
			default: 'Hey',
			maxlength: 256,
			select: false,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			select: false,
			match:
				/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
		},
		userName: {
			type: String,
			required: true,
			unique: true,
			minlength: 5,
			lowercase: true,
			match: /^[A-z]*$/,
		},
		password: {
			type: String,
			required: true,
			minlength: 8,
			select: false,
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
			select: false,
		},
		followingCount: {
			type: Number,
			default: 0,
			select: false,
		},
		profilePicUrl: {
			type: String,
			default:
				'https://res.cloudinary.com/dnakyuj25/image/upload/c_fit,q_auto,w_300/v1588297947/placeholder.png',
		},
		_createdAt: {
			type: Date,
			select: false,
		},
		_updatedAt: {
			type: Date,
			select: false,
		},
	},
	{
		timestamps: { createdAt: '_createdAt', updatedAt: '_updatedAt' },
	}
);

userSchema.pre<IUser>('save', async function (next) {
	if (this.isModified('password') && this.password) {
		this.password = await hashPassword(this.password);
	}

	if (this.isModified('followers'))
		this.followerCount = this.followers?.length || 0;

	if (this.isModified('following'))
		this.followingCount = this.following?.length || 0;
});

userSchema.methods.follow = async function (this: IUser_Populated, id: string) {
	const user = this;
	const userToFollow = await User.findById(id).select('+followers');
	if (user && String(user._id) != String(id)) {
		if (!userToFollow) {
			throw Error("The user you are trying to follow doesn't exist.");
		}

		if (user.following && userToFollow.followers) {
			if (
				user.following.findIndex(
					(u) => String(u._id) === String(userToFollow._id)
				) != -1
			)
				return false;

			user.following.push(userToFollow._id);
			userToFollow.followers.push(user._id);

			user.save();
			userToFollow.save();

			await Notification.create({
				from: user._id,
				for: userToFollow._id,
				type: UserNotificationType.USER_FOLLOWED,
			});
			return true;
		}
	}

	return false;
};

userSchema.methods.unfollow = async function (
	this: IUser_Populated,
	id: string
) {
	const user = this;
	const userToFollow = await User.findById(id).select('+followers');
	if (user) {
		if (!userToFollow) {
			throw Error("The user you are trying to follow doesn't exist.");
		}
		if (user.following && userToFollow.followers) {
			if (
				user.following.findIndex(
					(u) => String(u._id) === String(userToFollow._id)
				) == -1
			)
				return false;

			user.following.pull(userToFollow._id);
			userToFollow.followers.pull(user._id);

			user.save();
			userToFollow.save();
			await Notification.findOneAndDelete({
				from: user._id,
				for: userToFollow._id,
				type: UserNotificationType.USER_FOLLOWED,
			});
			return true;
		}
	}

	return false;
};

userSchema.virtual('fullName').get(function (this: IUser) {
	return `${this.firstName} ${this.lastName}`;
});

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
