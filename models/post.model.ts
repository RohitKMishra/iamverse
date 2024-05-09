require('dotenv').config();
import mongoose, { Document, Schema, Model, Date, Types } from 'mongoose';
import { IUser } from './user.model';
import { IComment } from './comment.model';
import { Notification, UserNotificationType } from './notification.Model';

export interface IPost extends Document {
  text: string;
  image: string;
  video: string;
  user: Types.ObjectId | IUser; // Reference to User document
  post: Types.ObjectId | IPost; // Reference to User document
  createdAt: Date;
  updatedAt: Date;
}

export interface IPost_withPLikes extends IPost {
  likedBy: mongoose.Types.Array<IUser>;
}

const postSchema: Schema<IPost> = new mongoose.Schema(
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
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    user: {
      type: Schema.Types.ObjectId, // Reference to User model by ObjectId
      ref: 'User', // Referencing the 'User' model
      required: true,
    },
  },
  { timestamps: true }
);

postSchema.index({ user: 1 });
postSchema.index({ comments: 1 });
postSchema.index({ likedBy: 1 });

// postSchema.methods.like = async function (
// 	this: IPost,
// 	userId: mongoose.Types.ObjectId
// ) {
// 	if (this.likedBy.indexOf(userId) == -1) {
// 		this.likedBy.push(userId);
// 		if (String(userId) != String(this.user))
// 			await Notification.create({
// 				for: this.user,
// 				from: userId,
// 				post: this._id,
// 				type: UserNotificationType.POST_LIKED,
// 			});
// 		this.save();
// 		return true;
// 	}
// 	return false;
// };

const postModel: Model<IPost> = mongoose.model('Post', postSchema);
export default postModel;
