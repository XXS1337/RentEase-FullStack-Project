const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/UserRoutes');
const flatRoutes = require('./routes/FlatRoutes');
const messageRoutes = require('./routes/MessageRoutes');
const chatBotRoutes = require('./routes/ChatBotRoutes');
const logger = require('./utils/logger');

// Initialize Express app
const app = express();

// Load environment variables from .env file
dotenv.config();

// Define allowed origins for CORS
const allowedOrigins = [process.env.ALLOWED_ORIGIN_1, process.env.ALLOWED_ORIGIN_2];
const corsOptions = {
  origin: allowedOrigins, // Only allow specified domains
  credentials: true, // Allow credentials (cookies, auth headers)
  optionsSuccessStatus: 200, // Respond with 200 for preflight requests
};

// Apply middleware
app.use(cors(corsOptions)); // Enable CORS with custom settings
app.use(express.json()); // Parse incoming JSON requests

// Define the port to run the server on
const port = process.env.PORT || 5001;

// Connect to MongoDB database
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info('Connected to MongoDB ✅')) // Log success
  .catch((error) => logger.error(`❌ Failed to connect to MongoDB: ${error.message}`)); // Log failure

// Register application routes
app.use('/users', userRoutes); // Routes for user authentication and management
app.use('/flats', flatRoutes); // Routes for flats
app.use('/flats', messageRoutes); // Routes for sending/reading messages related to flats
app.use('/ai', chatBotRoutes); // Route for AI chatbot interactions (e.g. user questions, answers, GPT support)

// Catch-all handler for unmatched routes
app.all('*', (req, res) => {
  logger.warn(`Route not found: ${req.originalUrl}`); // Log 404 error
  return res.status(404).json({ status: 'failed', message: `Can't find ${req.originalUrl} on the server!` });
});

// Start the server and listen on the defined port
app.listen(port, () => {
  logger.info(`Server running on port ${port} ✅`); // Log successful startup
});
