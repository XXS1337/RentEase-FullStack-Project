const User = require('./../models/UserModel');
const Flat = require('./../models/FlatModel');
const Message = require('./../models/MessageModel');
const { v2: cloudinary } = require('cloudinary');
const logger = require('../utils/logger');

// * Admin only middleware

// Middleware to get all users from the database
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100000, sort, ...filters } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const matchStage = {};

    // Filter by role if provided
    if (filters.role) {
      matchStage.role = filters.role;
    }

    // Filter: age range (calculated from birthDate)
    if (filters.age) {
      const [min, max] = filters.age.split('-').map(Number);
      const now = new Date();
      const minDate = new Date(now.getFullYear() - max, now.getMonth(), now.getDate());
      const maxDate = new Date(now.getFullYear() - min, now.getMonth(), now.getDate());
      matchStage.birthDate = { $gte: minDate, $lte: maxDate };
    }

    // Aggregation pipeline to filter, sort and paginate users
    const pipeline = [
      { $match: matchStage },

      // Add virtual fields: publishedFlatsCount and accurate age
      {
        $addFields: {
          // Count the number of flats published by the user (handles null as empty array)
          publishedFlatsCount: { $size: { $ifNull: ['$addedFlats', []] } },
          // Calculate precise age by comparing full birth date to current date
          age: {
            $let: {
              vars: {
                // Extract birth date components
                birthYear: { $year: '$birthDate' },
                birthMonth: { $month: '$birthDate' },
                birthDay: { $dayOfMonth: '$birthDate' },

                // Extract current date components (using Mongo's $$NOW)
                nowYear: { $year: '$$NOW' },
                nowMonth: { $month: '$$NOW' },
                nowDay: { $dayOfMonth: '$$NOW' },
              },
              in: {
                // Step 1: Base age = nowYear - birthYear
                // Step 2: Subtract 1 if birthday hasn't occurred yet this year
                $subtract: [
                  { $subtract: ['$$nowYear', '$$birthYear'] },
                  {
                    $cond: [
                      {
                        // If current month is before birth month
                        // OR current day is before birth day in same month
                        $or: [
                          { $lt: ['$$nowMonth', '$$birthMonth'] },
                          {
                            $and: [{ $eq: ['$$nowMonth', '$$birthMonth'] }, { $lt: ['$$nowDay', '$$birthDay'] }],
                          },
                        ],
                      },
                      1, // Subtract 1 year if birthday hasn't occurred yet
                      0, // Otherwise, keep full difference
                    ],
                  },
                ],
              },
            },
          },
        },
      },

      // Filter by publishedFlatsCount if provided
      ...(filters.flatsCount
        ? (() => {
            const [min, max] = filters.flatsCount.split('-').map(Number);
            return [
              {
                $match: {
                  publishedFlatsCount: { $gte: min, $lte: max },
                },
              },
            ];
          })()
        : []),

      // Sort stage
      (() => {
        if (!sort) return { $sort: { createdAt: -1 } };
        const sortObj = {};
        const fields = sort.split(',');
        for (const field of fields) {
          const dir = field.startsWith('-') ? -1 : 1;
          const name = field.replace('-', '');
          sortObj[name] = dir;
        }
        return { $sort: sortObj };
      })(),

      // Pagination
      { $skip: skip },
      { $limit: Number(limit) },

      // Project only needed fields
      {
        $project: {
          _id: 0,
          id: '$_id',
          firstName: 1,
          lastName: 1,
          email: 1,
          birthDate: 1,
          age: 1,
          role: 1,
          publishedFlatsCount: 1,
          createdAt: 1,
        },
      },
    ];

    // Execute aggregation
    const users = await User.aggregate(pipeline);
    const totalCount = await User.countDocuments(matchStage);

    // Send success response with user data
    return res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      page: Number(page),
      limit: Number(limit),
      totalCount,
      count: users.length,
      data: users,
    });
  } catch (error) {
    // Log and return server error
    logger.error(`Error retrieving users: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error retrieving users', error: error.message });
  }
};

// Middleware to update a user by ID
exports.editUserById = async (req, res) => {
  try {
    // 1) Get user ID from the parameters
    const userId = req.params.id;

    // 2) Check if the user exists
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found!' });
    }

    // 3) Update the user with the data provided in the request body
    Object.assign(user, req.body);

    // 4) Update passwordChangedAt if password is changed
    if (req.body.newPassword && typeof req.body.newPassword === 'string') {
      user.password = req.body.newPassword;
      user.passwordChangedAt = Date.now();
    }

    // 5) Save user
    await user.save();

    // 6) Send success response with the updated user data
    return res.status(200).json({ status: 'success', message: 'User updated successfully!', updatedUser: user });
  } catch (error) {
    // Log and return server error
    logger.error(`Error updating user: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error updating user', error: error.message });
  }
};

// Middleware to update a user's role
exports.updateRole = async (req, res) => {
  try {
    const userId = req.params.id; // ID of user to update
    const newRole = req.body.role; // New role value

    // 1) Validate the new role
    const validRoles = ['admin', 'user'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ status: 'failed', message: 'Invalid role specified!' });
    }

    // 2) Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found!' });
    }

    // 3) Update the user's role
    user.role = newRole;
    await user.save();

    // 4) Return a success response
    return res.status(200).json({ status: 'success', message: 'User role updated successfully!', user });
  } catch (error) {
    // Log and return server error
    logger.error(`Error updating user role: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error updating user role', error: error.message });
  }
};

// Middleware to delete a user by ID
exports.deleteUserById = async (req, res) => {
  try {
    const userId = req.params.id; // ID of user to delete

    // 1. Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found!' });
    }

    // 2. Delete all messages sent by this user
    await Message.deleteMany({ senderId: userId });

    // 3. Find all flats owned by this user
    const flats = await Flat.find({ owner: userId });

    for (const flat of flats) {
      // 4. Delete Cloudinary image if exists
      if (flat.image && flat.image.public_id) {
        await cloudinary.uploader.destroy(flat.image.public_id);
      }

      // 5. Delete all messages related to this flat
      await Message.deleteMany({ flatId: flat._id });

      // 6. Remove this flat from favoriteFlats of all users
      await User.updateMany({ favoriteFlats: flat._id }, { $pull: { favoriteFlats: flat._id } });
    }

    // 7. Delete all flats owned by this user
    await Flat.deleteMany({ owner: userId });

    // 8. Delete the user from the database
    await User.findByIdAndDelete(userId);

    // 9. Send success response
    return res.status(200).json({ status: 'success', message: 'User and all associated data deleted successfully!' });
  } catch (error) {
    // Log and return server error
    logger.error(`Error deleting user: ${error.message}`);
    return res.status(500).json({ status: 'failed', message: 'Error deleting user', error: error.message });
  }
};

// Middleware to get a user by ID
exports.getUserById = async (req, res) => {
  try {
    // Fetch the user from the database using the ID from URL params
    const user = await User.findById(req.params.id);

    // If the user does not exist, return 404 Not Found response
    if (!user) {
      return res.status(404).json({ status: 'failed', message: 'User not found' });
    }

    //Send success response with user's data
    res.status(200).json(user);
  } catch (error) {
    // Log and return server error
    logger.error(`Error retrieving user by ID: ${error.message}`);
    res.status(500).json({ status: 'failed', message: 'Error retrieving user', error: error.message });
  }
};
