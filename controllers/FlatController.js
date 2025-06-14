const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const Flat = require('./../models/FlatModel');
const User = require('./../models/UserModel');
const Message = require('./../models/MessageModel');
const logger = require('../utils/logger');

// Middleware to add a new flat to the database
// Requires image upload and assigns the flat to the logged-in user
exports.addFlat = async (req, res) => {
  const owner = req.currentUser._id; // ID of the logged-in use

  // Check if image was uploaded correctly
  if (!req.file || !req.file.path || !req.file.filename) {
    return res.status(400).json({ status: 'failed', message: 'Image upload failed or missing' });
  }

  // Convert dateAvailable to a number (timestamp)
  req.body.dateAvailable = Number(req.body.dateAvailable);

  // Construct the flat data with image and owner
  const flatData = {
    ...req.body,
    owner,
    image: {
      url: req.file.path,
      public_id: req.file.filename,
    },
  };

  try {
    // Validate data before saving to the database
    const flat = new Flat(flatData);
    await flat.validate(); // Only validation, not saving yet

    // Save flat to database
    await flat.save();

    // Add flat ID to user's addedFlats
    await User.findByIdAndUpdate(owner, { $push: { addedFlats: flat._id } });

    // Send success response with flat data
    res.status(201).json({ status: 'success', message: 'Flat created successfully', data: flat });
  } catch (error) {
    // Remove uploaded image if validation failed
    if (req.file && req.file.filename) {
      await cloudinary.uploader.destroy(req.file.filename);
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      logger.error(`Validation error while adding flat: ${messages.join(', ')}`);
      return res.status(400).json({ status: 'failed', error: messages });
    }

    // Log and return server error
    logger.error(`Error adding flat: ${error.message}`);
    res.status(500).json({ status: 'failed', message: 'Error adding flat' });
  }
};

// Middleware to fetch all flats using aggregation and filtering
exports.getAllFlats = async (req, res) => {
  try {
    const { page = 1, limit = 100000, sort, ...filters } = req.query;

    const pipeline = [];

    // 1. Build dynamic filter object
    const filter = {};
    for (const key in filters) {
      const value = filters[key];

      if (value.includes(',')) {
        // Handle multiple values (e.g., type=Studio,Apartment)
        filter[key] = {
          $in: value.split(',').map((v) => (isNaN(v) ? v : Number(v))),
        };
      } else if (value.includes('-')) {
        // Handle range values (e.g., rentPrice=300-800)
        const [min, max] = value.split('-');
        filter[key] = {
          $gte: Number(min),
          $lte: Number(max),
        };
      } else if (key === 'city') {
        // Handle flexible city match (e.g., Alba-Iulia vs Alba Iulia)
        // Flexible matching for city names, allowing space or dash (e.g., "Alba Iulia" or "Alba-Iulia")
        const cityRegex = value.replace(/[-\s]+/g, '[-\\s]?');
        filter[key] = { $regex: cityRegex, $options: 'i' };
      } else if (['title', 'address'].includes(key)) {
        // Case-insensitive partial text match for title and address
        filter[key] = { $regex: value, $options: 'i' };
      } else {
        // Convert 'true'/'false' strings to booleans for fields like hasAC
        if (value === 'true' || value === 'false') {
          filter[key] = value === 'true'; // convert to Boolean
        } else {
          // Otherwise, use number if numeric, or keep as string
          filter[key] = isNaN(value) ? value : Number(value);
        }
      }
    }

    // 2. Apply filtering to pipeline
    if (Object.keys(filter).length > 0) {
      pipeline.push({ $match: filter });
    }

    // 3. Apply sorting
    if (sort) {
      const sortFields = sort.split(',');
      const sortObj = {};
      sortFields.forEach((field) => {
        const order = field.startsWith('-') ? -1 : 1;
        const fieldName = field.replace('-', '');
        sortObj[fieldName] = order;
      });
      pipeline.push({ $sort: sortObj });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } }); // default sort by newest
    }

    // 4. Join with users collection (populate owner with selected fields)
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner',
        pipeline: [
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
            },
          },
        ],
      },
    });

    // 5. Used $unwind to simplify access to owner fields for matching or projection
    pipeline.push({ $unwind: '$owner' });

    // 6. Pagination
    const skip = (Number(page) - 1) * Number(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // 7. Run aggregation
    const flats = await Flat.aggregate(pipeline);

    // 8. Get total count (without pagination)
    const totalCount = await Flat.countDocuments(filter);

    // 9. Send success response with paginated and filtered flats
    return res.status(200).json({
      status: 'success',
      page: Number(page),
      limit: Number(limit),
      totalCount,
      count: flats.length,
      data: flats,
    });
  } catch (error) {
    // Log and return server error
    logger.error(`Error fetching flats: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error fetching flats', error: error.message });
  }
};

// Middleware to get a flat by ID and populate related details
exports.getFlatById = async (req, res) => {
  try {
    const flatId = req.params.flatId; // ID of the flat to retrieve

    // Validate the format of flatId
    if (!mongoose.Types.ObjectId.isValid(flatId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid flat ID format' });
    }

    // Find the flat and populate owner and messages
    const flat = await Flat.findById(flatId).populate('owner', 'firstName lastName email').populate('messages');

    // Return 404 if flat not found
    if (!flat) {
      return res.status(404).json({ status: 'failed', message: 'Flat not found' });
    }

    // Send success response with the flat
    res.status(200).json({ status: 'success', data: flat });
  } catch (error) {
    // Log and return server error
    logger.error(`Error retrieving flat details: ${error.message}`);
    res.status(500).json({ status: 'failed', message: 'Error retrieving flat details' });
  }
};

// Middleware to update a flat by ID from the database
// Only the owner of the flat can perform the update
exports.updateFlat = async (req, res) => {
  try {
    const flatId = req.params.flatId; // ID of the flat to update
    const userId = req.currentUser._id; // ID of the logged-in user

    // 1. Validate flatId format
    if (!mongoose.Types.ObjectId.isValid(flatId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid flat ID format' });
    }

    // 2. Find the flat by its ID
    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ status: 'failed', message: 'Flat not found' });
    }

    // 3. Ensure the user is the owner of the flat
    if (flat.owner.toString() !== userId.toString()) {
      return res.status(403).json({ status: 'failed', message: 'You can only update your own flats' });
    }

    // 4. Handle image update
    if (req.file) {
      if (flat.image && flat.image.public_id) {
        await cloudinary.uploader.destroy(flat.image.public_id);
      }

      flat.image = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    // 5. Update the rest of the fields
    const numberFields = ['areaSize', 'yearBuilt', 'rentPrice', 'streetNumber', 'dateAvailable'];
    Object.entries(req.body).forEach(([key, value]) => {
      if (key !== 'flatId' && key !== 'image') {
        flat[key] = numberFields.includes(key) ? Number(value) : value;
      }
    });

    // 6. Save the updated flat to the database
    await flat.save();

    // 7. Return a success response with the updated flat data
    res.status(200).json({ status: 'success', message: 'Flat updated successfully', data: flat });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      logger.error(`Validation error updating flat: ${errors.join(', ')}`);
      return res.status(400).json({ status: 'failed', message: errors.join(', ') });
    }

    // Log and return any other server errors
    logger.error(`Error updating flat: ${error.message}`);
    res.status(500).json({ status: 'failed', message: 'Error updating flat' });
  }
};

// Middleware to delete a flat by ID from the database
// Deletes the flat, all the associated messages and removes the flat from all user's favorites
exports.deleteFlat = async (req, res) => {
  try {
    const flatId = req.params.flatId; // ID of the flat to delete
    const userId = req.currentUser._id; // ID of the logged-in user

    // 1. Validate flatId format
    if (!mongoose.Types.ObjectId.isValid(flatId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid flat ID format' });
    }

    // 2. Check if flat exists and belongs to the user
    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ status: 'failed', message: 'Flat not found' });
    }

    // 3. Verify ownership
    if (flat.owner.toString() !== userId.toString()) {
      return res.status(403).json({ status: 'failed', message: 'You can only delete your own flats' });
    }

    // 4. Delete image from Cloudinary (if it exists)
    if (flat.image && flat.image.public_id) {
      await cloudinary.uploader.destroy(flat.image.public_id);
    }

    // 5. Delete all messages related to this flat
    await Message.deleteMany({ flatId: flat._id });

    // 6. Remove this flat from any user's favoriteFlats array
    await User.updateMany({ favoriteFlats: flat._id }, { $pull: { favoriteFlats: flat._id } });

    // 7. Remove from owner's addedFlats array
    await User.findByIdAndUpdate(userId, { $pull: { addedFlats: flatId } });

    // 8. Finally, delete the flat
    await Flat.findByIdAndDelete(flatId);

    // 9. Send success response
    res.status(200).json({ status: 'success', message: 'Flat deleted successfully', data: { id: flatId } });
  } catch (error) {
    // Log and return server error
    logger.error(`Error deleting flat: ${error.message}`);
    res.status(500).json({ status: 'failed', message: 'Error deleting flat' });
  }
};

// Middleware to get all flats added by the logged-in user
exports.getMyFlats = async (req, res) => {
  try {
    const userId = req.currentUser._id; // ID of the logged-in user

    // Find flats owned by user and sort by newest
    const flats = await Flat.find({ owner: userId }).sort({ createdAt: -1 });

    // Send success response
    return res.status(200).json({ status: 'success', count: flats.length, data: flats });
  } catch (error) {
    // Log and return server error
    logger.error(`Error fetching user flats: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error fetching your flats' });
  }
};

// Middleware to add a flat to user's favorites
exports.addToFavorites = async (req, res) => {
  try {
    // Fallback for requests with no body
    if (req.headers['content-length'] === '0') {
      req.body = {};
    }

    const userId = req.currentUser._id; // ID of the logged-in user
    const flatId = req.params.flatId; // ID of the flat

    // 1. Validate flatId format
    if (!mongoose.Types.ObjectId.isValid(flatId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid flat ID format' });
    }

    // 2. Check if the flat exists
    const flat = await Flat.findById(flatId);
    if (!flat) {
      return res.status(404).json({ status: 'failed', message: 'Flat not found' });
    }

    // 3. Find the user by their ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    // 4. Check if the flat is already in the user's favorites
    if (user.favoriteFlats.includes(flatId)) {
      return res.status(400).json({ status: 'failed', message: 'Flat is already in favorites' });
    }

    // 5. Add the flat to the user's favorites
    user.favoriteFlats.push(flatId);
    await user.save();

    // Send success response
    return res.status(200).json({ status: 'success', message: 'Flat added to favorites', favorites: user.favoriteFlats });
  } catch (error) {
    // Log and return server error
    logger.error(`Error adding flat to favorites: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error adding flat to favorites', error });
  }
};

// Middleware for removing a flat from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    // Fallback for requests with no body
    if (req.headers['content-length'] === '0') {
      req.body = {};
    }

    const userId = req.currentUser._id; // ID of the logged-in user
    const flatId = req.params.flatId; // ID of the flat

    // 1. Validate flatId format
    if (!mongoose.Types.ObjectId.isValid(flatId)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid flat ID format' });
    }

    // 2. Find the user by their ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    // 3. Check if the flat is in the user's favorites
    const index = user.favoriteFlats.indexOf(flatId);
    if (index === -1) {
      return res.status(400).json({ status: 'failed', message: 'Flat is not in favorites' });
    }

    // 4. Remove the flat from the user's favorites
    user.favoriteFlats.splice(index, 1);
    await user.save();

    // Send success response
    return res.status(200).json({ status: 'success', message: 'Flat removed from favorites', favorites: user.favoriteFlats });
  } catch (error) {
    // Log and return server error
    logger.error(`Error removing flat from favorites: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error removing flat from favorites' });
  }
};
