const mongoose = require('mongoose');

// Define the schema for a real estate flat
const flatSchema = new mongoose.Schema(
  {
    // Title of the advertisement
    adTitle: {
      type: String,
      required: [true, 'Ad title is required'],
      minlength: [5, 'Ad title must be between 5 and 60 characters'],
      maxlength: [60, 'Ad title must be between 5 and 60 characters'],
      trim: true,
    },
    // City where the flat is located
    city: {
      type: String,
      required: [true, 'City is required'],
      minlength: [2, 'City name must be at least 2 characters'],
      trim: true,
      index: true, // Index to speed up filtering and sorting by city
    },
    // Name of the street
    streetName: {
      type: String,
      required: [true, 'Street name is required'],
      minlength: [2, 'Street name must be at least 2 characters'],
      trim: true,
    },
    // Street number
    streetNumber: {
      type: Number,
      required: [true, 'Street number is required'],
      min: [1, 'Street number must be a positive number'],
    },
    // Size of the flat in square meters
    areaSize: {
      type: Number,
      required: [true, 'Area size is required'],
      min: [1, 'Area size must be a valid positive number'],
      index: true, // Index to speed up filtering flats by area range
    },
    // Whether the flat has air conditioning
    hasAC: {
      type: Boolean,
      default: false,
      required: [true, 'AC status is required'],
    },
    // Year the building was constructed
    yearBuilt: {
      type: Number,
      required: [true, 'Year built is required'],
      min: [1900, 'Year built must be between 1900 and current year'],
      max: [new Date().getFullYear(), 'Year built must be between 1900 and current year'],
    },
    // Monthly rent price in chosen currency
    rentPrice: {
      type: Number,
      required: [true, 'Rent price is required'],
      min: [0.01, 'Rent price must be greater than zero'],
      index: true, // Index to speed up filtering and sorting by rent price
    },
    // Timestamp representing the date when the flat becomes available
    dateAvailable: {
      type: Number, // not Date!
      required: [true, 'Date available is required'],
    },
    // Image metadata stored from Cloudinary
    image: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    // Reference to the user who owns this flat
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
    },
    // List of message IDs related to this flat
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        default: [],
      },
    ],
  },
  // Automatically include createdAt and updatedAt fields
  { timestamps: true }
);

// Compound index for filtering by city and rent price
flatSchema.index({ city: 1, rentPrice: 1 }); // Optimized for queries like { city: "X", rentPrice: { $lte: Y } }

// Compound index for filtering by city and area size
flatSchema.index({ city: 1, areaSize: 1 }); // Optimized for queries like { city: "X", areaSize: { $gte: Y } }

// Export the Mongoose model for use in the app
module.exports = mongoose.model('Flat', flatSchema);
