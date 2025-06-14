const express = require('express');
const router = express.Router();
const authController = require('./../controllers/AuthController');
const adminController = require('./../controllers/AdminController');

// ================== Regular user routes ==================

/**
 * @route POST /users/register
 * @description Register a new user
 */
router.post('/register', authController.register);

/**
 * @route POST /users/checkEmail
 * @description Check if an email is already registered
 */
router.post('/checkEmail', authController.checkEmail);

/**
 * @route POST /users/login
 * @description Log in an existing user
 */
router.post('/login', authController.login);

/**
 * @route POST /users/forgotPassword
 * @description Request password reset email
 */
router.post('/forgotPassword', authController.forgotPassword);

/**
 * @route PATCH /users/resetPassword/:token
 * @description Reset user password using a valid reset token
 */
router.patch('/resetPassword/:token', authController.resetPassword);

/**
 * @route GET /users/me
 * @description Get the currently logged-in user's data
 */
router.get('/me', authController.protect, authController.getMe);

/**
 * @route PATCH /users/updateMyProfile
 * @description Update the currently logged-in user's profile
 */
router.patch('/updateMyProfile', authController.protect, authController.updateProfile);

/**
 * @route DELETE /users/deleteMyProfile
 * @description Delete the currently logged-in user's account and all associated data
 */
router.delete('/deleteMyProfile', authController.protect, authController.deleteProfile);

// ================== Admin-only routes ==================

/**
 * @route GET /users/allUsers
 * @description Get all users (admin only)
 */
router.get('/allUsers', authController.protect, authController.restrictIfNotAdmin, adminController.getAllUsers);

/**
 * @route PATCH /users/editProfile/:id
 * @description Edit a user's profile by ID (admin only)
 */
router.patch('/editProfile/:id', authController.protect, authController.restrictIfNotAdmin, adminController.editUserById);

/**
 * @route PATCH /users/updateRole/:id
 * @description Update a user's role by ID (admin only)
 */
router.patch('/updateRole/:id', authController.protect, authController.restrictIfNotAdmin, adminController.updateRole);

/**
 * @route PATCH /users/updateRole/:id
 * @description Update a user's role by ID (admin only)
 */
router.delete('/deleteProfile/:id', authController.protect, authController.restrictIfNotAdmin, adminController.deleteUserById);

/**
 * @route GET /users/getUserById/:id
 * @description Get user details by ID (admin only)
 */
router.get('/getUserById/:id', authController.protect, authController.restrictIfNotAdmin, adminController.getUserById);

/**
 * @description Export the router to be used in main app
 */
module.exports = router;
