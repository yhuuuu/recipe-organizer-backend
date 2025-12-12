# Recipe Organizer Backend

This is a minimal Express + MongoDB backend for the Recipe Organizer frontend.

Quick start

1. Copy env example:

```bash
cp .env.example .env
# edit .env to set MONGODB_URI and PORT
```

2. Install dependencies and run in dev:

```bash
cd Recipe-organizer-backend
npm install
npm run dev
```

API endpoints

- `GET /api/recipes` - list recipes, supports `?q=search` and `?cuisine=Chinese`
- `GET /api/recipes/:id` - get a recipe
- `POST /api/recipes` - create a recipe (title, ingredients[], steps[] required)
- `PUT /api/recipes/:id` - update/replace a recipe
- `PATCH /api/recipes/:id` - partial update
- `DELETE /api/recipes/:id` - delete a recipe

Notes

- Uses `mongoose` for MongoDB interactions
- Schema fields match the frontend `Recipe` type (id/title/image/ingredients/steps/cuisine/sourceUrl/rating/isWishlisted/createdAt)
