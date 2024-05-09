import crypto from 'crypto';
import userModel, { IUser } from '../models/user.model';

// Function to generate a password reset token
const createResetToken = async (userId: string): Promise<string> => {
	// Generate a random token using crypto
	const resetToken = crypto.randomBytes(32).toString('hex');

	// Save the reset token to the user document in the database
	const user = await userModel.findById(userId);
	if (!user) {
		throw new Error('User not found');
	}

	// Store the reset token and expiry date in the user document
	user.resetPasswordToken = resetToken;
	user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour

	await user.save();

	return resetToken;
};

export default createResetToken;
