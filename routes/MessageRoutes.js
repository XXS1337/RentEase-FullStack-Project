const express = require('express');
const router = express.Router();
const authController = require('./../controllers/AuthController');
const messageController = require('./../controllers/MessageController');

/**
 * @route POST /flats/:flatId/messages
 * @description Send a new message to the flat owner (only authenticated users)
 */
router.post('/:flatId/messages', authController.protect, messageController.addMessage);

/**
 * @route GET /flats/:flatId/messages
 * @description Get all messages for a specific flat (only accessible by the flat owner)
 */
router.get('/:flatId/messages', authController.protect, messageController.getAllMessages);

/**
 * @description Export the router to be used in main app
 */
module.exports = router;
