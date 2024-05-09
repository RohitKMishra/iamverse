import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './user.model';

// Define interface for Like document
export interface ILike extends Document {
	user: Types.ObjectId | IUser; // Reference to the user who liked
	targetType: string; // Type of the target entity (post, comment, reply, etc.)
	targetId: Types.ObjectId; // ID of the target entity (post, comment, reply, etc.)
}

// Define schema for Like
const likeSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		targetType: {
			type: String,
			required: true,
		},
		targetId: {
			type: Schema.Types.ObjectId,
			required: true,
		},
	},
	{ timestamps: true }
);

// Create and export Mongoose model for likes
const likeModel = mongoose.model<ILike>('Like', likeSchema);

export default likeModel;
