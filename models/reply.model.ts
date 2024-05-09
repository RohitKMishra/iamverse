import mongoose, { Schema, Document, Types } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';
import { IComment } from './comment.model';

// Define interface for Comments document
export interface IReply extends Document {
	text: string;
	image: string;
	video: string;
	user: Types.ObjectId | IUser; // Reference to User document
	targetType: string;
	targetId: Types.ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

// Define Mongoose schema for Comments collection
const replySchema: Schema = new Schema(
	{
		text: {
			type: String,
			required: true,
		},
		image: {
			type: String,
		},
		video: {
			type: String,
		},
		targetType: {
			type: String,
			enum: ['comment', 'reply'], // Allowed target types
			required: true,
		},
		targetId: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
		},
		user: {
			type: Schema.Types.ObjectId, // Reference to User model by ObjectId
			ref: 'User', // Referencing the 'User' model
			required: true,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true } // Adds createdAt and updatedAt fields
);

// replySchema.index({ post: 1 }, { name: 'post_id_index' }); // Index on 'post' field
// replySchema.index({ user: 1 }, { name: 'user_email_index' }); // Index on 'user' field

// Create and export Mongoose model for replys
const replyModel = mongoose.model<IReply>('Reply', replySchema);

export default replyModel;
