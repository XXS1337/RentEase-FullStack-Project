const Flat = require('./../models/FlatModel');
const Message = require('./../models/MessageModel');
const logger = require('../utils/logger');

// Middleware to handle adding a new message to a flat
// Any authenticated user can send a message to a flat owner
exports.addMessage = async (req, res) => {
  try {
    const flatId = req.params.flatId; // ID of the flat being messaged
    const senderId = req.currentUser._id; // ID of the logged-in user
    const { content } = req.body; // Message content from the request body

    // Check if the flat exists in the database
    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ status: 'failed', message: 'Flat not found' });
    }

    // Prevent the flat owner from messaging themselves
    if (flat.owner.toString() === senderId.toString()) {
      return res.status(403).json({ status: 'failed', message: 'Owners cannot send messages to their own flats' });
    }

    // Create a new message document
    const message = await Message.create({ content, flatId, senderId });

    // Add the message ID to the flat's messages array
    await Flat.findByIdAndUpdate(flatId, { $push: { messages: message._id } });

    // Send success response with the newly created message
    res.status(201).json({ status: 'success', data: message });
  } catch (error) {
    // Log and return server error
    logger.error(`Error adding message: ${error.message}`);
    res.status(500).json({ status: 'failed', message: 'Server error while sending message' });
  }
};

// Middleware to retrieve all messages for a given flat
// Only the owner can see all messages, others see only their own
exports.getAllMessages = async (req, res) => {
  try {
    const flatId = req.params.flatId; // ID of the flat
    const userId = req.currentUser._id; // ID of the logged-in use

    // Check if the flat exists
    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ status: 'failed', message: 'Flat not found' });
    }

    // Determine if the user is the owner of the flat
    const isOwner = flat.owner.toString() === userId.toString();

    // All authenticated users can message
    const userCanMessage = true;

    let messages = [];

    // Owner sees all messages, other users see only their own
    if (isOwner) {
      messages = await Message.find({ flatId }).sort({ createdAt: 1 }).populate('senderId', 'firstName lastName email');
    } else {
      messages = await Message.find({ flatId, senderId: userId }).sort({ createdAt: 1 }).populate('senderId', 'firstName lastName email');
    }

    // Format messages for frontend
    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      flatId: msg.flatId,
      senderId: msg.senderId._id,
      content: msg.content,
      createdAt: msg.createdAt,
      senderName: `${msg.senderId.firstName} ${msg.senderId.lastName}`,
      senderEmail: msg.senderId.email,
    }));

    // Send response with messages and meta info
    return res.status(200).json({
      status: 'success',
      data: formattedMessages,
      meta: {
        isOwner,
        userCanMessage,
      },
    });
  } catch (error) {
    // Log and return server error
    logger.error(`Error fetching messages: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error fetching messages' });
  }
};
