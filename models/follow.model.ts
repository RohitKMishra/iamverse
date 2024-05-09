import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { IUser } from './user.model';

export interface IFollow extends Document {
	follower: Types.ObjectId | IUser; // Reference to the User who is following
	following: Types.ObjectId | IUser; // Reference to the User being followed
}

const followSchema = new Schema<IFollow>(
	{
		follower: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User', // Reference to User model
		},
		following: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
	},
	{ timestamps: true } // Add timestamps for creation and update tracking
);

const FollowModel: Model<IFollow> = mongoose.model('Follow', followSchema);

export default FollowModel;
