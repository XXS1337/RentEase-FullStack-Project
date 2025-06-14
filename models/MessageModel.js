const mongoose = require('mongoose');

// Define the schema for a message sent between users about a flat
const messageSchema = new mongoose.Schema(
  {
    // Text content of the message
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    // Reference to the flat this message is related to
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: [true, 'Flat ID is required'],
    },
    // Reference to the user who sent the message
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
  },
  // Automatically adds createdAt and updatedAt fields
  { timestamps: true }
);

// Export the Mongoose model for use in the app
module.exports = mongoose.model('Message', messageSchema);
