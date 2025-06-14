const jwt = require('jsonwebtoken');

// Function to create a JWT token for a given user
function createToken(user) {
  // Sign a token with the user's ID as payload
  // Use the secret string from environment variables
  // Set the token to expire according to LOGIN_EXPIRES from .env
  return jwt.sign({ id: user._id }, process.env.SECRET_STR, { expiresIn: process.env.LOGIN_EXPIRES });
}

// Export the createToken function for use in authentication modules
module.exports = { createToken };
