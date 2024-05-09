require('dotenv').config();
import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { IUser } from './user.model';
import { IPost } from './post.model';

export interface IRepost extends Document {
  user: Types.ObjectId | IUser[]; // Reference to the user who reposted
  originalPost: Types.ObjectId | IPost; // Reference to the original post
  comment: string; // Optional comment added by the reposting user
  createdAt: Date;
  updatedAt: Date;
}

const repostSchema: Schema<IRepost> = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    comment: {
      type: String,
      maxlength: 256,
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
  { timestamps: true }
);

const RepostModel: Model<IRepost> = mongoose.model('Repost', repostSchema);

export default RepostModel;
