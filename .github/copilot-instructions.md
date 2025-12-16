# Recipe Organizer Backend - AI Coding Guidelines

## Architecture Overview
This is a minimal Express.js REST API backend for a recipe organizer app, using MongoDB with Mongoose ODM.

**Key Components:**
- `src/index.js`: Main Express app setup, middleware, MongoDB connection, and server startup
- `src/models/recipe.js`: Mongoose schema for Recipe documents
- `src/routes/recipes.js`: REST endpoints for recipe CRUD operations

**Data Flow:**
Client requests → Express routes → Mongoose queries → MongoDB → JSON responses with virtual `id` field (maps `_id`)

**Design Decisions:**
- Single responsibility: API focused solely on recipe management
- Lean queries: Use `.lean().exec()` for performance on read operations
- Virtual IDs: Expose `_id` as `id` in JSON responses for frontend compatibility

## Developer Workflows
- **Development:** `npm run dev` (uses nodemon for auto-restart)
- **Production:** `npm start` (direct node execution)
- **Environment:** Copy `.env.example` to `.env`, set `MONGODB_URI` and `PORT`
- **Health Check:** `GET /api/health` returns `{ ok: true }`

## Code Conventions
- **Validation:** Use `express-validator` for input validation (e.g., POST requires non-empty title, ingredients[], steps[])
- **Error Handling:** Pass errors to `next(err)` for centralized handling in `index.js`
- **Query Filters:** GET `/api/recipes` supports `?q=search` (title/ingredients regex) and `?cuisine=filter`
- **Sorting:** Default sort by `createdAt` descending
- **Middleware Order:** helmet → cors → express.json(2mb limit) → morgan(dev) → routes

## API Patterns
- **CRUD Endpoints:** Standard REST with GET/POST/PUT/PATCH/DELETE
- **Response Format:** Recipes include virtual `id`, match frontend `Recipe` type
- **Search:** Case-insensitive regex on title and ingredients array
- **Updates:** PUT for full replace, PATCH for partial updates

## Dependencies
- **Core:** express, mongoose, cors, helmet, morgan
- **Validation:** express-validator
- **Dev:** nodemon

Reference: `README.md` for API docs, `package.json` for scripts/deps