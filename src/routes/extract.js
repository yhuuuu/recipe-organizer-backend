const express = require('express');
const { body, validationResult } = require('express-validator');
const OpenAI = require('openai');

const router = express.Router();

// Initialize Azure OpenAI
const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

if (!azureEndpoint || !azureApiKey) {
  throw new Error('Missing Azure OpenAI configuration. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env');
}
// Configure OpenAI client to call Azure OpenAI
const genAI = new OpenAI({
  apiKey: azureApiKey,
  baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`,
  defaultHeaders: { 'api-key': azureApiKey },
  defaultQuery: { 'api-version': azureApiVersion },
});

// Define the recipe schema for structured output
const recipeSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'The name/title of the recipe',
    },
    ingredients: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'List of ingredients with quantities',
    },
    steps: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Step-by-step cooking instructions',
    },
    cuisine: {
      type: 'string',
      description: 'The cuisine type (e.g., Chinese, Western, Japanese, etc.)',
    },
    image: {
      type: 'string',
      description: 'Image URL if mentioned in the text, otherwise empty string',
    },
    sourceUrl: {
      type: 'string',
      description: 'Source URL if mentioned in the text, otherwise empty string',
    },
  },
  required: ['title', 'ingredients', 'steps', 'cuisine'],
};

// POST /api/extract - Extract recipe information from raw text
router.post(
  '/',
  body('text').isString().notEmpty().withMessage('Text is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { text } = req.body;
      console.log('Received text for extraction:', text.substring(0, 100) + '...');

      const systemPrompt = `You are a recipe extraction assistant. Extract recipe data and return JSON only, matching this schema:
${JSON.stringify(recipeSchema)}

Rules:
- Always return valid JSON (no extra text).
- If a field is missing, use empty string or empty array.
- Infer cuisine if possible; otherwise default to "Western".`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ];

      const result = await genAI.chat.completions.create({
        model: azureDeployment,
        messages,
        // temperature omitted because this model only supports the default (1)
        response_format: { type: 'json_object' },
      });

      const content = result?.choices?.[0]?.message?.content || '{}';
      const extractedRecipe = JSON.parse(content);
      
      console.log('Extracted recipe:', extractedRecipe);

      // Ensure all required fields have default values
      const recipe = {
        title: extractedRecipe.title || '',
        ingredients: extractedRecipe.ingredients || [],
        steps: extractedRecipe.steps || [],
        cuisine: extractedRecipe.cuisine || 'Western',
        image: extractedRecipe.image || '',
        sourceUrl: extractedRecipe.sourceUrl || '',
      };

      console.log('Sending response:', recipe);
      res.json(recipe);
    } catch (err) {
      console.error('Azure OpenAI error:', err);
      next(err);
    }
  }
);


module.exports = router;
