const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  image: { type: String, default: '' },
  ingredients: { type: [String], default: [] },
  steps: { type: [String], default: [] },
  cuisine: { type: String, default: 'Western' },
  sourceUrl: { type: String, default: '' },
  rating: { type: Number, default: 0 },
  isWishlisted: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date().toISOString() },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Map _id to id in JSON responses
RecipeSchema.virtual('id').get(function () {
  return this._id.toString();
});

module.exports = mongoose.model('Recipe', RecipeSchema);
