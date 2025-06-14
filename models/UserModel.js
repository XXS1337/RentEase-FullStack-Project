const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Define the User schema
const userSchema = new mongoose.Schema(
  {
    // User's first name with validation
    firstName: {
      type: String,
      required: [true, 'User must have a first name'],
      minlength: [2, 'First name must be at least 2 characters long'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-ZăâîșțĂÂÎȘȚ -]+$/.test(v);
        },
        message: 'First name can only contain letters and spaces',
      },
    },
    // User's last name with validation
    lastName: {
      type: String,
      required: [true, 'User must have a last name'],
      minlength: [2, 'Last name must be at least 2 characters long'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-ZăâîșțĂÂÎȘȚ -]+$/.test(v);
        },
        message: 'Last name can only contain letters and spaces',
      },
    },
    // User's birth date with age validation (must be between 18 and 120 years old)
    birthDate: {
      type: Date,
      required: [true, 'Birth date is required'],
      validate: {
        validator: function (dob) {
          // Validate only on new user creation or when birthDate is being updated
          if (!this.isNew && !this.isModified('birthDate')) return true;

          const today = new Date();
          let age = today.getFullYear() - dob.getFullYear();
          const monthDiff = today.getMonth() - dob.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
          }

          if (age < 18) throw new Error(`User is only ${age} years old. Minimum 18 years required`);
          if (age > 120) throw new Error(`User is ${age} years old. Maximum 120 years allowed`);

          return true;
        },
      },
    },
    // User's email address with format validation
    email: {
      type: String,
      required: [true, 'User must have an email'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please enter a valid email'],
    },
    // User's password with strength validation
    password: {
      type: String,
      required: [true, 'User must have a password'],
      trim: true,
      validate: {
        validator: function (value) {
          // Add minimum length check first for better error messaging
          if (value.length < 6) return false;
          return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6,}$/.test(value);
        },
        message: 'Password must be at least 6 characters and contain at least one letter, one number, and one special character',
      },
    },
    // User role (admin or regular user)
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // List of flat IDs marked as favorite by the user
    favoriteFlats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
      },
    ],
    // List of flat IDs created by the user
    addedFlats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
      },
    ],
    // Timestamp for when password was last changed (used to invalidate tokens)
    passwordChangedAt: {
      type: Date,
    },
    // Token used for password reset
    passwordResetToken: {
      type: String,
    },
    // Token expiration used for password reset
    passwordResetTokenExpires: {
      type: Date,
    },
  },
  // Automatically include createdAt and updatedAt fields
  { timestamps: true }
);

// Pre-save middleware to hash password before saving
userSchema.pre('save', async function (next) {
  // If the password field was not modified, skip hashing
  if (!this.isModified('password')) {
    return next();
  }

  // Hash the password using bcrypt with 12 salt rounds
  this.password = await bcrypt.hash(this.password, 12);

  // If the document is new (e.g. user is registering), ensure role is set to 'user'
  if (this.isNew) {
    this.role = 'user';
  }

  // Proceed to the next middleware or save operation
  next();
});

// Instance method to compare input password with hashed password
userSchema.methods.comparePassword = async function (bodyPass) {
  return await bcrypt.compare(bodyPass, this.password);
};

// Instance method to check if password was changed after token was issued
userSchema.methods.isPasswordChanged = async function (jwtTimeStamp) {
  if (this.passwordChangedAt) {
    const passwordChangedTimestamp = parseInt(this.passwordChangedAt / 1000);
    return jwtTimeStamp < passwordChangedTimestamp;
  }
  return false;
};

// Instance method to generate a password reset token
userSchema.methods.createNewPasswordToken = function () {
  // Generate a secure random token (sent to the user's email)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token and store it in the database for later verification
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token expiration time (10 minutes from now)
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  // Return the original token (not hashed) so it can be emailed to the user
  return resetToken;
};

// Export the User model
module.exports = mongoose.model('User', userSchema);
