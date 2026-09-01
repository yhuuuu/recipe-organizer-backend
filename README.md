# Haohaochifan — Backend

A RESTful API built with Express.js and MongoDB for managing user recipes with
JWT authentication and AI-powered recipe extraction.

Serves https://haohaochifan.netlify.app · deployed at
https://haohaochifan-api.onrender.com

## Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 👤 **User Isolation** - Each user manages their own recipes
- 🤖 **AI Recipe Extraction** - Extract recipe data from text or URLs using Azure OpenAI
- 🌐 **Web Scraping** - Automatic recipe scraping from URLs with Cheerio
- 📊 **MongoDB Atlas** - Cloud database with Mongoose ODM
- 🔒 **Security** - Helmet middleware, CORS, password hashing with bcrypt

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js 4.18.2
- **Database:** MongoDB with Mongoose 7.0.0
- **Authentication:** JWT (jsonwebtoken), bcryptjs
- **AI Integration:** Azure OpenAI (gpt-5.2-chat)
- **Web Scraping:** Axios, Cheerio
- **Security:** Helmet, CORS
- **Dev Tools:** Nodemon, Morgan (logging)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yhuuuu/recipe-organizer-backend.git
cd recipe-organizer-backend
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Server Configuration
PORT=4000

# JWT Authentication
JWT_SECRET=your-super-secret-key-change-in-production

# Azure OpenAI (for recipe extraction)
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_DEPLOYMENT=gpt-5.2-chat
AZURE_OPENAI_API_VERSION=2024-04-01-preview

# AI extraction quotas (optional, per day)
# Guests are keyed by IP, signed-in users by user id.
EXTRACT_GUEST_DAILY_LIMIT=5
EXTRACT_USER_DAILY_LIMIT=50
```

### 3. Run Development Server

```bash
npm run dev
```

Server will start at `http://localhost:4000`

### 4. Run Production Server

```bash
npm start
```

## API Documentation

### Authentication Endpoints

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "id": "user_id",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Response (200):** Same as register response

---

### Recipe Endpoints (Protected - Requires JWT)

All recipe endpoints require the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

#### Get All User Recipes
```http
GET /api/recipes?q=search&cuisine=Chinese
Authorization: Bearer <token>
```

**Query Parameters:**
- `q` (optional): Search in title and ingredients
- `cuisine` (optional): Filter by cuisine type

**Response (200):**
```json
[
  {
    "id": "recipe_id",
    "userId": "user_id",
    "title": "Kung Pao Chicken",
    "ingredients": ["chicken", "peanuts", "peppers"],
    "steps": ["Cut chicken", "Stir fry", "Add sauce"],
    "cuisine": "Chinese",
    "image": "https://example.com/image.jpg",
    "sourceUrl": "https://example.com/recipe",
    "rating": 4.5,
    "isWishlisted": false,
    "createdAt": "2026-01-05T..."
  }
]
```

#### Get Single Recipe
```http
GET /api/recipes/:id
Authorization: Bearer <token>
```

#### Create Recipe
```http
POST /api/recipes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Tomato Egg Soup",
  "ingredients": ["tomatoes", "eggs", "salt"],
  "steps": ["Cut tomatoes", "Beat eggs", "Cook soup"],
  "cuisine": "Chinese",
  "image": "https://...",
  "sourceUrl": "https://...",
  "rating": 4,
  "isWishlisted": false
}
```

**Response (201):** Returns created recipe with `id`

#### Update Recipe (Full Replace)
```http
PUT /api/recipes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "ingredients": [...],
  "steps": [...],
  ...
}
```

#### Partial Update Recipe
```http
PATCH /api/recipes/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "isWishlisted": true
}
```

#### Delete Recipe
```http
DELETE /api/recipes/:id
Authorization: Bearer <token>
```

**Response:** 204 No Content

---

### AI Recipe Extraction Endpoint (Public)

#### Extract Recipe from Text or URL
```http
POST /api/extract
Content-Type: application/json

{
  "text": "Recipe content here..."
}
```

OR

```http
POST /api/extract
Content-Type: application/json

{
  "url": "https://www.example.com/recipe"
}
```

**Response (200):**
```json
{
  "title": "Extracted Recipe Name",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "steps": ["step 1", "step 2"],
  "cuisine": "Chinese",
  "image": "",
  "sourceUrl": "https://..."
}
```

**Features:**
- Accepts either plain text or URL
- Automatically scrapes webpage content from URLs
- Uses Azure OpenAI to extract structured recipe data
- Returns JSON format ready for frontend use

**Failure cases:**

Some recipe sites answer scrapers with `200` and an anti-bot interstitial rather
than a `403`. Those pages are long enough to pass a length check, so the model
would dutifully invent a recipe out of the sidebar links and return a confident,
entirely fictional result. Extractions that come back with no ingredients or no
steps are therefore rejected:

```json
{
  "error": "Could not find a recipe in that text. Please include the ingredients and steps.",
  "code": "NO_RECIPE_FOUND"
}
```

| Status | Meaning |
| --- | --- |
| 400 | The site actively blocks scrapers, or neither text nor a valid URL was sent |
| 422 | The page was read but contains no recipe |
| 429 | Daily quota exhausted |

The model also ignores the cuisine enum in both the prompt and the JSON schema —
it has returned values such as `American`, which is not in the frontend's union
type. Neither the prompt nor the schema is a guarantee, so the value is clamped
against `VALID_CUISINES` server-side before the response is sent.

**Rate limiting (protects the Azure OpenAI budget):**

This endpoint is intentionally public so visitors can try the AI extraction
without creating an account, so it is rate limited instead of authenticated:

| Caller | Key | Default daily limit | Env var |
| --- | --- | --- | --- |
| Guest (no/invalid token) | client IP | 5 | `EXTRACT_GUEST_DAILY_LIMIT` |
| Signed-in user | user id | 50 | `EXTRACT_USER_DAILY_LIMIT` |

An invalid or forged token is treated as a guest, so the stricter limit cannot
be bypassed. When the quota is exhausted the endpoint returns 429:

```json
{
  "error": "Demo limit reached (5 AI extractions per day). Create a free account to keep going.",
  "code": "GUEST_QUOTA_EXCEEDED",
  "limit": 5
}
```

Successful responses include the caller's remaining quota:

```json
{ "quota": { "isGuest": true, "limit": 5, "remaining": 4 } }
```

Quota tracks Azure OpenAI spend, not HTTP status. A `422` still cost a model
call, so it is billed against the quota; a `400` (blocked site, bad input) never
reached the model and is refunded. Without this, a single blocked URL could be
replayed indefinitely at our expense, because `skipFailedRequests` refunds
everything `>= 400`. See `requestWasSuccessful` in `src/middleware/rateLimit.js`.

> Limits are stored in memory, so they reset on restart and are per-instance.
> Move to a shared store (e.g. Redis) if you ever run more than one instance.
> The free Render instance sleeps when idle, which resets counters in practice.

---

### Health Check
```http
GET /api/health
```

**Response (200):**
```json
{ "ok": true }
```

## Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  username: String (unique, 3-30 chars),
  email: String (unique, valid email),
  password: String (bcrypt hashed, min 6 chars),
  createdAt: Date
}
```

### Recipe Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  title: String (required),
  ingredients: [String],
  steps: [String],
  cuisine: String (default: 'Western'),
  image: String,
  sourceUrl: String,
  rating: Number (default: 0),
  isWishlisted: Boolean (default: false),
  createdAt: Date
}
```

## Project Structure

```
Recipe-organizer-backend/
├── src/
│   ├── index.js              # Express app setup, trust proxy for Render
│   ├── models/
│   │   ├── user.js           # User model with password hashing
│   │   └── recipe.js         # Recipe model with userId reference
│   ├── routes/
│   │   ├── auth.js           # Registration & login endpoints
│   │   ├── recipes.js        # CRUD recipe endpoints (protected)
│   │   └── extract.js        # AI extraction, scraping, cuisine clamping
│   └── middleware/
│       ├── auth.js           # JWT verification (rejects on failure)
│       ├── optionalAuth.js   # Identifies the caller but allows guests
│       └── rateLimit.js      # Per-day extraction quotas
├── .env                      # Environment variables
├── .gitignore
├── package.json
├── AUTH_API.md               # Detailed authentication guide
└── README.md
```

`optionalAuth.js` is what makes the public demo possible: it attaches
`req.userId` when a valid token is present and sets `req.isGuest` otherwise,
without rejecting the request. An invalid or forged token falls through to guest,
so the stricter quota cannot be bypassed by sending garbage.

`trust proxy` is set in `index.js` because Render terminates TLS upstream —
without it every guest would share the proxy's IP and therefore a single quota.

## Security Features

- **Password Hashing:** bcryptjs with salt rounds
- **JWT Tokens:** 7-day expiry, stored in frontend localStorage
- **Protected Routes:** Authentication middleware validates all recipe operations
- **User Isolation:** Recipes are filtered by `userId` at database level
- **Input Validation:** express-validator for request validation
- **Security Headers:** Helmet middleware
- **CORS:** Configured for cross-origin requests

## Error Handling

### Common Error Responses

**401 Unauthorized** - Missing or invalid token
```json
{ "error": "No token provided" }
{ "error": "Invalid or expired token" }
```

**409 Conflict** - Duplicate user
```json
{ "error": "Username or email already exists" }
```

**400 Bad Request** - Validation errors
```json
{
  "errors": [
    { "msg": "Invalid email", "param": "email" }
  ]
}
```

**404 Not Found** - Recipe not found or unauthorized
```json
{ "error": "Recipe not found" }
```

## Development

### Available Scripts

```bash
npm start       # Run production server
npm run dev     # Run with nodemon (auto-restart)
```

### Testing Authentication

```bash
# Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# Get recipes (with token)
curl -X GET http://localhost:4000/api/recipes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m "feat: add feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

MIT

## Author

yhuuuu

## Links

- **Repository:** https://github.com/yhuuuu/recipe-organizer-backend
- **Frontend:** Recipe Organizer (separate repository)
