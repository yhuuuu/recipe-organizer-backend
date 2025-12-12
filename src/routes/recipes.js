const express = require('express');
const { body, validationResult } = require('express-validator');
const Recipe = require('../models/recipe');

const router = express.Router();

// GET /api/recipes - list all recipes (with optional search & cuisine filter)
router.get('/', async (req, res, next) => {
  try {
    const { q, cuisine } = req.query;
    const filter = {};
    if (cuisine && cuisine !== 'All') filter.cuisine = cuisine;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ title: regex }, { ingredients: regex }];
    }

    const recipes = await Recipe.find(filter).sort({ createdAt: -1 }).lean().exec();
    res.json(recipes);
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id).lean().exec();
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

      const data = req.body;
      const created = await Recipe.create(data);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/recipes/:id - replace/update
router.put('/:id', async (req, res, next) => {
  try {
    const updates = req.body;
    const updated = await Recipe.findByIdAndUpdate(req.params.id, updates, { new: true }).exec();
    if (!updated) return res.status(404).json({ error: 'Recipe not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/recipes/:id - partial update
router.patch('/:id', async (req, res, next) => {
  try {
    const updates = req.body;
    const updated = await Recipe.findByIdAndUpdate(req.params.id, updates, { new: true }).exec();
    if (!updated) return res.status(404).json({ error: 'Recipe not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/recipes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await Recipe.findByIdAndDelete(req.params.id).exec();
    if (!removed) return res.status(404).json({ error: 'Recipe not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
