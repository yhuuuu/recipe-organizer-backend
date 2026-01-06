# Authentication & User Recipe Management API

Complete guide for implementing user authentication and user-specific recipe management in the frontend.

---

## Overview

This backend uses **JWT (JSON Web Tokens)** for stateless authentication. Each user can register, login, and manage their own recipes independently.

**Key Features:**
- Secure password hashing with bcryptjs
- JWT tokens with 7-day expiration
- User-specific recipe isolation
- Protected routes with authentication middleware

---

## Authentication Endpoints

### 1. Register New User

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Validation Rules:**
- `username`: 3-30 characters, lowercase, unique
- `email`: Valid email format, unique
- `password`: Minimum 6 characters

**Success Response (201):**
```json
{
  "id": "675a1b2c3d4e5f6789012345",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (409 Conflict):**
```json
{
  "error": "Username or email already exists"
}
```

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**Success Response (200):**
```json
{
  "id": "675a1b2c3d4e5f6789012345",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Invalid username or password"
}
```

---

## Protected Recipe Endpoints

All recipe endpoints require authentication via JWT token in the request header.

### Authentication Header

```http
Authorization: Bearer <your_jwt_token>
```

---

### 3. Get All User Recipes

**Endpoint:** `GET /api/recipes`

**Query Parameters:**
- `q` (optional): Search in title and ingredients (case-insensitive regex)
- `cuisine` (optional): Filter by cuisine type

**Example:**
```http
GET /api/recipes?q=chicken&cuisine=Chinese
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
[
  {
    "id": "675a1b2c3d4e5f6789012345",
    "userId": "675a1b2c3d4e5f6789012340",
    "title": "Kung Pao Chicken",
    "ingredients": ["chicken breast", "peanuts", "peppers", "soy sauce"],
    "steps": ["Cut chicken", "Stir fry", "Add sauce"],
    "cuisine": "Chinese",
    "image": "https://example.com/image.jpg",
    "sourceUrl": "https://example.com/recipe",
    "rating": 4.5,
    "isWishlisted": false,
    "createdAt": "2026-01-05T10:30:00.000Z"
  }
]
```

**Notes:**
- Only returns recipes belonging to the authenticated user
- Results are sorted by `createdAt` descending (newest first)

---

### 4. Get Single Recipe

**Endpoint:** `GET /api/recipes/:id`

**Example:**
```http
GET /api/recipes/675a1b2c3d4e5f6789012345
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):** Single recipe object (same structure as above)

**Error Response (404):**
```json
{
  "error": "Recipe not found"
}
```

**Note:** Returns 404 if recipe doesn't exist OR doesn't belong to the authenticated user.

---

### 5. Create Recipe

**Endpoint:** `POST /api/recipes`

**Required Fields:** `title`, `ingredients[]`, `steps[]`

**Request:**
```json
{
  "title": "Tomato Egg Soup",
  "ingredients": ["2 tomatoes", "3 eggs", "1 tsp salt", "2 cups water"],
  "steps": [
    "Cut tomatoes into wedges",
    "Beat eggs in a bowl",
    "Boil water and add tomatoes",
    "Pour in beaten eggs while stirring",
    "Season with salt"
  ],
  "cuisine": "Chinese",
  "image": "https://example.com/tomato-soup.jpg",
  "sourceUrl": "https://example.com/recipe",
  "rating": 4,
  "isWishlisted": false
}
```

**Success Response (201):**
Returns the created recipe with `id` and `userId` fields.

**Note:** The `userId` is automatically set from the JWT token.

---

### 6. Update Recipe (Full Replace)

**Endpoint:** `PUT /api/recipes/:id`

**Request:** Complete recipe object (same as create)

**Success Response (200):** Returns updated recipe

**Error Response (404):**
```json
{
  "error": "Recipe not found"
}
```

---

### 7. Partial Update Recipe

**Endpoint:** `PATCH /api/recipes/:id`

**Request Example:**
```json
{
  "rating": 5,
  "isWishlisted": true
}
```

**Success Response (200):** Returns updated recipe

**Use Cases:**
- Update rating after trying the recipe
- Toggle wishlist status
- Update individual fields without sending entire object

---

### 8. Delete Recipe

**Endpoint:** `DELETE /api/recipes/:id`

**Example:**
```http
DELETE /api/recipes/675a1b2c3d4e5f6789012345
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response:** `204 No Content`

**Error Response (404):**
```json
{
  "error": "Recipe not found"
}
```

---

## AI Recipe Extraction (Public Endpoint)

This endpoint does NOT require authentication.

**Endpoint:** `POST /api/extract`

### Extract from Text

**Request:**
```json
{
  "text": "Kung Pao Chicken Recipe\n\nIngredients:\n- 500g chicken breast\n- 100g peanuts\n\nSteps:\n1. Cut chicken\n2. Stir fry..."
}
```

### Extract from URL

**Request:**
```json
{
  "url": "https://www.recipetineats.com/kung-pao-chicken/"
}
```

**How it works:**
1. If URL is provided, scrapes webpage content using Cheerio
2. Sends content to Azure OpenAI (gpt-5.2-chat)
3. AI extracts structured recipe data
4. Returns JSON ready for frontend use

**Success Response (200):**
```json
{
  "title": "Kung Pao Chicken",
  "ingredients": ["500g chicken breast", "100g peanuts", "peppers"],
  "steps": ["Cut chicken into cubes", "Stir fry with peanuts", "Add sauce"],
  "cuisine": "Chinese",
  "image": "",
  "sourceUrl": "https://www.recipetineats.com/kung-pao-chicken/"
}
```

**Workflow:**
1. User pastes text/URL in frontend
2. Call `/api/extract` to get structured data
3. Auto-fill form with extracted data
4. User can edit before saving
5. Call `/api/recipes` (with auth token) to save to user's account

---

## Frontend Integration Guide

### 1. Save Token After Login/Register

```javascript
const response = await fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'john_doe', password: 'password123' })
});

if (response.ok) {
  const data = await response.json();
  // Save to localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('userId', data.id);
  localStorage.setItem('username', data.username);
}
```

---

### 2. Include Token in Every Protected Request

```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:4000/api/recipes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const recipes = await response.json();
```

---

### 3. Handle 401 Errors (Token Expired)

```javascript
const response = await fetch('http://localhost:4000/api/recipes', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (response.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  window.location.href = '/login'; // Redirect to login
}
```

---

### 4. Complete Recipe Creation Flow

```javascript
// Step 1: Extract recipe from text/URL (no auth needed)
const extractResponse = await fetch('http://localhost:4000/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    url: 'https://www.example.com/recipe' 
  })
});

const extractedRecipe = await extractResponse.json();

// Step 2: User can edit the extracted data in the form
// (auto-fill form fields with extractedRecipe data)

// Step 3: Save to user's account (requires auth)
const token = localStorage.getItem('token');
const saveResponse = await fetch('http://localhost:4000/api/recipes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(extractedRecipe)
});

const savedRecipe = await saveResponse.json();
```

---

### 5. Logout

```javascript
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  window.location.href = '/login';
}
```

---

## Error Handling Reference

### 400 Bad Request
```json
{
  "errors": [
    { "msg": "Invalid email", "param": "email" },
    { "msg": "Password must be at least 6 characters", "param": "password" }
  ]
}
```

### 401 Unauthorized
```json
{ "error": "No token provided" }
{ "error": "Invalid or expired token" }
{ "error": "Invalid username or password" }
```

### 404 Not Found
```json
{ "error": "Recipe not found" }
```

### 409 Conflict
```json
{ "error": "Username or email already exists" }
```

### 500 Internal Server Error
```json
{ "error": "Internal Server Error" }
```

---

## Environment Variables

Required variables in `.env`:

```bash
# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-key-change-in-production

# MongoDB
MONGODB_URI=mongodb+srv://...

# Server
PORT=4000

# Azure OpenAI (for recipe extraction)
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-5.2-chat
AZURE_OPENAI_API_VERSION=2024-04-01-preview
```

---

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'
```

### Get Recipes
```bash
curl -X GET http://localhost:4000/api/recipes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Recipe
```bash
curl -X POST http://localhost:4000/api/recipes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Recipe",
    "ingredients":["ingredient1","ingredient2"],
    "steps":["step1","step2"],
    "cuisine":"Chinese"
  }'
```

### Extract Recipe from URL
```bash
curl -X POST http://localhost:4000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.recipetineats.com/chicken-breast-recipe/"}'
```

---

## Security Best Practices

✅ **Never expose JWT_SECRET** - Keep it in `.env` and change in production  
✅ **Use HTTPS in production** - Encrypt data in transit  
✅ **Token expiration** - Tokens expire in 7 days, implement refresh if needed  
✅ **Password requirements** - Enforce minimum 6 characters (consider increasing)  
✅ **Input validation** - All inputs are validated with express-validator  
✅ **User isolation** - Recipes are filtered by userId at database level  

---

## Token Structure

JWT tokens contain:

```json
{
  "userId": "675a1b2c3d4e5f6789012345",
  "username": "john_doe",
  "iat": 1736082000,
  "exp": 1736686800
}
```

- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (7 days from issue)

---

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique, 3-30 chars, lowercase),
  email: String (unique, valid format),
  password: String (bcrypt hashed, not returned by default),
  createdAt: Date
}
```

### Recipes Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
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

---

## Support

For questions or issues, please open an issue on GitHub:
https://github.com/yhuuuu/recipe-organizer-backend/issues
