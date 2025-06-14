const User = require('./../models/UserModel');
const Flat = require('./../models/FlatModel');
const Message = require('./../models/MessageModel');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { v2: cloudinary } = require('cloudinary');
const { createToken } = require('../utils/authUtils');
const emailService = require('../utils/mailtrapConfig');
const crypto = require('crypto');
const logger = require('../utils/logger');

// * Authentication middleware

// Middleware to handle user registration by validating input data and creating a new user
exports.register = async (req, res) => {
  try {
    // 1) Create a new user based on the request body
    const newUser = await User.create(req.body);

    // 2) Remove password from the output for security
    newUser.password = undefined;

    // 3) Send success response with the newly created user (without password)
    res.status(200).json({ status: 'success', message: `User ${req.body.firstName} ${req.body.lastName} created successfully`, data: newUser });
  } catch (error) {
    // Handle validation errors from Mongoose (e.g. invalid fields)
    if (error.name === 'ValidationError') {
      // Extract all validation error messages
      const errors = Object.values(error.errors).map((el) => el.message);
      logger.error(`Validation error during registration: ${errors.join(', ')}`);
      return res.status(400).json({ status: 'failed', message: 'Validation error', errors: errors });
    }

    // Handle duplicate email error (MongoDB duplicate key error)
    if (error.code === 11000) {
      logger.error(`Duplicate email during registration: ${req.body.email}`);
      return res.status(400).json({ status: 'failed', message: 'Email already exists' });
    }

    // Log and return any other server errors
    logger.error(`Error adding user: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error adding user', error: error.message });
  }
};

// Middleware to check if the provided email is already registered in the system
exports.checkEmail = async (req, res) => {
  try {
    // 1) Destructure email from request body
    const { email } = req.body;

    // 2) Validate that email exists
    if (!email) {
      return res.status(400).json({ status: 'failed', message: 'Email is required' });
    }

    // 3) Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();

    // 4) Validate email format
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ status: 'failed', valid: false, message: 'Invalid email format' });
    }

    // 5) Check if the email already exists in the database
    const userExists = await User.findOne({ email: normalizedEmail }).select('_id').lean();

    // 6) Send response based on email availability
    res.status(200).json({ status: 'success', available: !userExists, message: userExists ? 'Email already registered' : 'Email available' });
  } catch (error) {
    // Log and return server error
    logger.error(`Error checking email: ${error.message}`);
    res.status(500).json({ status: 'failed', message: 'Internal server error while checking email availability', error: error.message });
  }
};

// Middleware to handle user login by verifying credentials and generating a JWT token
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; // Extract email and password from request body

    // 1) Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ status: 'failed', message: 'Please provide email and password' });
    }

    // 2) Find user by email and explicitly select the password
    const userDB = await User.findOne({ email }).select('+password');

    // 3) Check if user exists and if password is correct
    if (!userDB || !(await userDB.comparePassword(password))) {
      // Log warning because either email not found or password wrong
      const clientIP = req.headers['x-forwarded-for'] || req.ip; // Get client IP address
      logger.warn(`Login failed: Invalid credentials for email: ${email} | IP: ${clientIP} ⚠️`);

      return res.status(401).json({ status: 'failed', message: 'Invalid email or password' });
    }

    // 4) Generate JWT token
    const token = createToken(userDB);

    // 5) Remove password from output
    userDB.password = undefined;

    // 6) Calculate how many seconds until the token expires
    const expiresInSeconds = jwt.decode(token).exp - Math.floor(Date.now() / 1000);

    // 7) Send response with user data, token and expiration time
    return res.status(200).json({ status: 'success', message: 'User logged in successfully', userDB, token, expiresIn: expiresInSeconds });
  } catch (error) {
    // Log and return server error
    logger.error(`Login error: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error logging in user', error: error.message });
  }
};

// Middleware to handle forgot password functionality by generating a reset token and sending a reset email
exports.forgotPassword = async (req, res) => {
  const { email } = req.body; // Extract the email from the request body

  // Validate the presence and format of the email
  if (!email || !validator.isEmail(email)) {
    return res.status(400).json({ status: 'failed', message: 'Invalid email format!' });
  }

  try {
    // Find the user in the database using the provided email
    const user = await User.findOne({ email });

    // Always return 200 even if user is not found (security reason: avoid leaking info)
    if (!user) {
      return res.status(200).json({ status: 'success', message: 'If this email is registered, a reset link has been sent.' });
    }

    // Generate a password reset token and save it on the user document
    const resetToken = await user.createNewPasswordToken();
    await user.save();

    // Build the reset URL that will be emailed to the user
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `Please click on this link to reset your password: ${resetUrl}. This link will expire in 10 minutes.`;

    try {
      // Send the reset email using the email service
      await emailService({
        email: user.email,
        subject: 'Reset Password',
        message,
        resetUrl,
        userName: user.firstName || 'User',
      });

      // Send success response after sending the email
      return res.status(200).json({ status: 'success', message: 'If this email is registered, a reset link has been sent.' });
    } catch (error) {
      // If sending email fails, clean up the reset token fields
      logger.error(`Error sending reset email: ${error.message}`);
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpires = undefined;
      await user.save();

      // Return error message
      return res.status(500).json({ status: 'failed', message: 'Error sending email', error: error.message });
    }
  } catch (error) {
    // Log and return server error
    logger.error(`Error in forgot password process: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error processing password reset request', error: error.message });
  }
};

// Controller to reset the user's password using a valid reset token
exports.resetPassword = async (req, res) => {
  try {
    // 1) Hash the token from the URL to compare it with the stored hashed token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // 2) Find user based on the reset token and ensure it hasn't expired
    const userData = await User.findOne({ passwordResetToken: hashedToken, passwordResetTokenExpires: { $gt: Date.now() } });

    // 3) If no user is found or the token has expired, return an error
    if (!userData) {
      return res.status(404).json({ status: 'failed', message: 'Invalid or expired token' });
    }

    // 4) Update the user's password with the new one provided in the request body
    userData.password = req.body.password;

    // 5) Remove the reset token and expiration date after the password is changed
    userData.passwordResetToken = undefined;
    userData.passwordResetTokenExpires = undefined;

    // 6) Update the timestamp for when the password was last changed
    userData.passwordChangedAt = Date.now();

    // 7) Save the changes to the database
    await userData.save();

    // 8) Send a success response indicating the password was reset successfully
    return res.status(200).json({ status: 'success', message: 'Password reset successfully!' });
  } catch (error) {
    // Log and return server error
    logger.error(`Reset password error: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'An error occurred while resetting the password. Please try again later.', error: error.message });
  }
};

// * Protected routes middleware

// Middleware to protect system routes by verifying JWT token
exports.protect = async (req, res, next) => {
  try {
    // 1) Extract token from the Authorization header
    let token;
    // Check if the Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization?.toLowerCase().startsWith('bearer ')) {
      // Extract the token from the header
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token is provided, deny access
    if (!token) {
      return res.status(401).json({ status: 'failed', message: 'Access denied. No token provided' });
    }

    // 2) Verify the token using the secret key from environment variables
    let decodedToken;
    try {
      // Decode the token with JWT and verify its validity
      decodedToken = jwt.verify(token, process.env.SECRET_STR);
    } catch (error) {
      // Handle different types of JWT errors
      logger.error(`Token verification error: ${error.message}`);
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ status: 'failed', message: 'Invalid token!' });
      } else if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ status: 'failed', message: 'Token expired!' });
      }
      // Catch any other errors during token verification
      logger.error(`Protect middleware error: ${error.message}`);
      return res.status(500).json({ status: 'failed', message: 'Error verifying token', error: error.message });
    }

    // 3) Check if the user exists in the database using the decoded token's ID
    const currentUser = await User.findById(decodedToken.id);

    if (!currentUser) {
      // If user not found, deny access
      return res.status(401).json({ status: 'failed', message: 'User not found' });
    }

    // 4) Check if the user's password has changed after the token was issued
    if (await currentUser.isPasswordChanged(decodedToken.iat)) {
      // If the password has changed, session has expired, and user needs to log in again
      return res.status(401).json({ status: 'failed', message: 'Session expired. Please login again' });
    }

    // 5) Attach the current user object to the request so it can be accessed by other middlewares/routes
    req.currentUser = currentUser;

    // 6) Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Return server error
    return res.status(500).json({ status: 'failed', message: 'Error in validating token', error: error.message });
  }
};

// Middleware to restrict access to only admin users
exports.restrictIfNotAdmin = async (req, res, next) => {
  // Check if the current user is authenticated and has the 'admin' role
  if (req.currentUser && req.currentUser.role === 'admin') {
    // If the user is an admin, proceed to the next middleware or route handler
    next();
  } else {
    // If the user is not an admin, deny access and return a 403 Forbidden status
    return res.status(403).json({ status: 'failed', message: 'Access denied.' });
  }
};

// * Regular user only middleware

// Middleware to get logged-in user's data
exports.getMe = async (req, res) => {
  // Return the current user info from the request (set by protect middleware)
  return res.status(200).json({ status: 'success', currentUser: req.currentUser });
};

// Middleware to update the user's profile and password
exports.updateProfile = async (req, res) => {
  try {
    // 1) Get the authenticated user
    const user = await User.findById(req.currentUser.id);

    // If user is not found, return 404
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    // 2) Initialize update objects
    const profileUpdates = {};
    let shouldUpdatePassword = false;
    let shouldUpdateToken = false;
    let newToken = null;

    // 3) Process all fields from request body
    for (const field in req.body) {
      switch (field) {
        // Handle password update
        case 'newPassword':
          user.password = req.body.newPassword;
          user.passwordChangedAt = Date.now();
          shouldUpdatePassword = true;
          break;

        // Handle profile fields
        case 'firstName':
        case 'lastName':
        case 'birthDate':
          profileUpdates[field] = req.body[field];
          break;

        case 'email':
          if (req.body.email !== user.email) {
            profileUpdates.email = req.body.email;
            shouldUpdateToken = true; // Invalidate old token if email is changed
          }
          break;

        // Reject unexpected fields
        default:
          return res.status(400).json({ status: 'failed', message: `Invalid field: ${field}` });
      }
    }

    // 4) Apply profile updates if any
    if (Object.keys(profileUpdates).length > 0) {
      Object.assign(user, profileUpdates);
    }

    // 5) Generate new token if password or email changed
    if (shouldUpdatePassword || shouldUpdateToken) {
      newToken = createToken(user);
      user.activeToken = newToken;
    }

    // 6) Save all changes with full validation
    await user.save();

    // 7) Prepare response
    const response = {
      status: 'success',
      message: 'User updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        birthDate: user.birthDate,
      },
    };

    // Include new token in response if generated
    if (newToken) {
      response.token = newToken;
    }

    // Send response with the new user's data
    return res.status(200).json(response);
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((el) => el.message);
      return res.status(400).json({ status: 'failed', message: 'Validation error', errors });
    }

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ status: 'failed', message: 'Email already in use' });
    }

    // Return any other server errors
    return res.status(500).json({ status: 'failed', message: 'Error updating user', error: error.message });
  }
};

// Middleware to delete the user's profile
exports.deleteProfile = async (req, res) => {
  try {
    const userId = req.currentUser.id; // ID of the logged-in user

    // 1. Delete all messages sent by this user
    await Message.deleteMany({ senderId: userId });

    // 2. Find all flats owned by this user
    const flats = await Flat.find({ owner: userId });

    for (const flat of flats) {
      // 3. Delete Cloudinary image if exists
      if (flat.image && flat.image.public_id) {
        await cloudinary.uploader.destroy(flat.image.public_id);
      }

      // 4. Delete all messages related to this flat
      await Message.deleteMany({ flatId: flat._id });

      // 5. Remove this flat from other users' favorites
      await User.updateMany({ favoriteFlats: flat._id }, { $pull: { favoriteFlats: flat._id } });
    }

    // 6. Delete all flats owned by this user
    await Flat.deleteMany({ owner: userId });

    // 7. Delete the user
    const deletedUser = await User.findByIdAndDelete(userId);

    // If user was already deleted or not found
    if (!deletedUser) {
      return res.status(404).json({ status: 'failed', message: 'User not found!' });
    }

    // 8. Send success response
    return res.status(200).json({ status: 'success', message: 'Account and all associated data deleted successfully!' });
  } catch (error) {
    // Log and return server error
    logger.error(`Delete profile error: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error deleting account', error: error.message });
  }
};
