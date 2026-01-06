const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Recipe = require('../models/recipe');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/recipes - list all recipes for current user (with optional search & cuisine filter)
router.get('/', async (req, res, next) => {
  try {
    const { q, cuisine } = req.query;
    const filter = { userId: req.userId }; // Filter by current user
    if (cuisine && cuisine !== 'All') filter.cuisine = cuisine;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ title: regex }, { ingredients: regex }];
    }

    const recipes = await Recipe.find(filter).sort({ createdAt: -1 }).lean().exec();
    console.log(`Found ${recipes.length} recipes for user ${req.username} with query:`, { q, cuisine });
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    const recipe = await Recipe.findOne({ _id: req.params.id, userId: req.userId }).lean().exec();
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

// POST /api/recipes
router.post(
  '/',
  body('title').isString().notEmpty(),
  body('ingredients').isArray({ min: 1 }),
  body('steps').isArray({ min: 1 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const data = { ...req.body, userId: req.userId };
      const created = await Recipe.create(data);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/recipes/:id - replace/update
router.put(
  '/:id',
  body('title').isString().notEmpty(),
  body('ingredients').isArray({ min: 1 }),
  body('steps').isArray({ min: 1 }),
  async (req, res, next) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid recipe ID' });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const recipe = await Recipe.findOne({ _id: req.params.id, userId: req.userId }).exec();
      if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
      Object.assign(recipe, req.body);
      await recipe.save();
      res.json(recipe);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/recipes/:id - partial update
router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    const updates = req.body;
    const updated = await Recipe.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updates,
      { new: true, runValidators: true }
    ).exec();
    if (!updated) return res.status(404).json({ error: 'Recipe not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }
    const removed = await Recipe.findOneAndDelete({ _id: req.params.id, userId: req.userId }).exec();
    if (!removed) return res.status(404).json({ error: 'Recipe not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});


module.exports = router;
