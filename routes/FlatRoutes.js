const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('./../utils/cloudinaryConfig');
const upload = multer({ storage });
const authController = require('./../controllers/AuthController');
const flatController = require('./../controllers/FlatController');

/**
 * @route GET /flats
 * @description Get all flats with optional filtering, sorting, and pagination
 */
router.get('/', flatController.getAllFlats);

/**
 * @route POST /flats
 * @description Add a new flat (requires image upload and authentication)
 */
router.post('/', authController.protect, upload.single('image'), flatController.addFlat);

/**
 * @route GET /flats/myFlats
 * @description Get all flats added by the logged-in user
 */
router.get('/myFlats', authController.protect, flatController.getMyFlats);

/**
 * @route DELETE /flats/:flatId
 * @description Delete a flat by ID (only the flat owner can delete)
 */
router.delete('/:flatId', authController.protect, flatController.deleteFlat);

/**
 * @route GET /flats/:flatId
 * @description Get details of a single flat by ID (authenticated user)
 */
router.get('/:flatId', authController.protect, flatController.getFlatById);

/**
 * @route PATCH /flats/:flatId
 * @description Update a flat by ID (requires authentication and optional image upload)
 */
router.patch('/:flatId', authController.protect, upload.single('image'), flatController.updateFlat);

/**
 * @route POST /flats/:flatId/addToFavorites
 * @description Add a flat to the logged-in user's favorites list
 */
router.post('/:flatId/addToFavorites', authController.protect, flatController.addToFavorites);

/**
 * @route DELETE /flats/:flatId/removeFromFavorites
 * @description Remove a flat from the logged-in user's favorites list
 */
router.delete('/:flatId/removeFromFavorites', authController.protect, flatController.removeFromFavorites);

/**
 * @description Export the router to be used in main app
 */
module.exports = router;
