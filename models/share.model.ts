require('dotenv').config();
import mongoose, { Document, Schema, Model, Date, Types } from 'mongoose';
import { IUser } from './user.model';
import { IComment } from './comment.model';
import { IPost } from './post.model';

export interface IShare extends Document {
  text: string;
  image: string;
  video: string;
  user: Types.ObjectId | IUser; // Reference to User document
  targetType: string;
  targetId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shareSchema: Schema<IShare> = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId, // Reference to User model by ObjectId
      ref: 'User', // Referencing the 'User' model
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'reply'], // Allowed target types
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    text: { type: String },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
  },
  { timestamps: true }
);

const shareModel: Model<IShare> = mongoose.model('Share', shareSchema);
export default shareModel;

// import mongoose, { Document, Schema } from 'mongoose';

// export interface IShare extends Document {
//   user: mongoose.Types.ObjectId;
//   post: mongoose.Types.ObjectId;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const shareSchema: Schema<IShare> = new mongoose.Schema(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     post: {
//       type: Schema.Types.ObjectId,
//       ref: 'Post',
//       required: true,
//     },
//   },
//   { timestamps: true }
// );

// const ShareModel = mongoose.model<IShare>('Share', shareSchema);

// export default ShareModel;
