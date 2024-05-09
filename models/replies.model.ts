import mongoose, { Schema, Document, Types } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';
import { IComment } from './comment.model';

// Define interface for Comments document
export interface IReply extends Document {
	text: string;
	post: Types.ObjectId | IPost; // Reference to Post ID
	user: Types.ObjectId | IUser; // Reference to User document
	comment: Types.ObjectId | IComment; // Reference to comment document
	replies: string[]; // Array of Reply IDs
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
		comment: {
			type: Schema.Types.ObjectId,
			ref: 'Post', // Reference to the 'Post' model
			required: true,
		},
		post: {
			type: Schema.Types.ObjectId,
			ref: 'Post', // Reference to the 'Post' model
			required: true,
		},
		user: {
			type: Schema.Types.ObjectId, // Reference to User model by ObjectId
			ref: 'User', // Referencing the 'User' model
			required: true,
		},
		replies: [
			{
				type: Schema.Types.ObjectId,
				ref: 'Reply', // Reference to the 'Reply' model
				default: [],
			},
		],
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
