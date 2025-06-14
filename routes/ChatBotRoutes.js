const express = require('express');
const router = express.Router();
const chatBotController = require('../controllers/ChatBotController');
const authController = require('../controllers/AuthController');

/**
 * @route /ai
 * @description Route for AI chatbot interactions (e.g. user questions, answers, GPT support via ChatGPT)
 */
router.post('/chatbot', authController.protect, chatBotController.handleChat);

module.exports = router;
