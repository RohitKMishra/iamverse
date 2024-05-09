import mongoose, { Schema, Document, Types } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';

// Define interface for Comments document
export interface IComment extends Document {
  text: string;
  post: Types.ObjectId | IPost; // Reference to Post ID
  user: Types.ObjectId | IUser; // Reference to User document
  comment: Types.ObjectId | IComment; // Reference to User document
  replies: string[]; // Array of Reply IDs
  createdAt: Date;
  updatedAt: Date;
}

// Define Mongoose schema for Comments collection
const commentSchema: Schema = new Schema(
  {
    text: {
      type: String,
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post', // Reference to the 'Post' model
      // required: true,
    },
    user: {
      type: Schema.Types.ObjectId, // Reference to User model by ObjectId
      ref: 'User', // Referencing the 'User' model
      required: true,
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: 'Post', // Reference to the 'Post' model
      // required: true,
    },
    // comment: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: 'comment', // Reference to the 'Reply' model
    //     default: [],
    //   },
    // ],
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

// commentSchema.index({ post: 1 }, { name: 'post_id_index' }); // Index on 'post' field
// commentSchema.index({ user: 1 }, { name: 'user_email_index' }); // Index on 'user' field

// Create and export Mongoose model for Comments
const commentModel = mongoose.model<IComment>('Comment', commentSchema);

export default commentModel;
