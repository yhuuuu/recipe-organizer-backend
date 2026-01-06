# 认证与用户菜单管理 API 文档

## 概述
后端已实现用户认证系统（JWT），不同用户可以保存和管理自己的菜单。

---

## 认证端点

### 1. 注册新用户
**POST** `/api/auth/register`

**请求体:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**响应 (201):**
```json
{
  "id": "user_id_123",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**验证规则:**
- username: 3-30 字符，小写，唯一
- email: 有效邮箱格式，唯一
- password: 最少 6 字符

---

### 2. 用户登录
**POST** `/api/auth/login`

**请求体:**
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

**响应 (200):**
```json
{
  "id": "user_id_123",
  "username": "john_doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 菜单端点 (需要认证)

所有菜单端点都需要在请求头中包含 JWT token：

```
Authorization: Bearer <token>
```

### 3. 获取当前用户的所有菜单
**GET** `/api/recipes`

**查询参数:**
- `q` (可选): 搜索标题或食材
- `cuisine` (可选): 按菜系过滤

**响应 (200):**
```json
[
  {
    "id": "recipe_id_1",
    "userId": "user_id_123",
    "title": "炒菜",
    "image": "https://...",
    "ingredients": ["油", "盐", "菜"],
    "steps": ["切菜", "炒菜", "起锅"],
    "cuisine": "Chinese",
    "sourceUrl": "https://...",
    "rating": 4.5,
    "isWishlisted": false,
    "createdAt": "2025-01-05T..."
  }
]
```

---

### 4. 获取单个菜单详情
**GET** `/api/recipes/:id`

**响应 (200):** 同上单个菜单对象

---

### 5. 创建新菜单
**POST** `/api/recipes`

**请求体:**
```json
{
  "title": "番茄鸡蛋汤",
  "image": "https://...",
  "ingredients": ["番茄", "鸡蛋", "盐", "油"],
  "steps": [
    "番茄切块",
    "锅里炒番茄",
    "加入鸡蛋",
    "加水烧开"
  ],
  "cuisine": "Chinese",
  "sourceUrl": "https://...",
  "rating": 4,
  "isWishlisted": false
}
```

**响应 (201):** 返回创建的菜单对象（含 id）

---

### 6. 更新菜单（完全替换）
**PUT** `/api/recipes/:id`

**请求体:** 同创建菜单

**响应 (200):** 返回更新后的菜单对象

---

### 7. 部分更新菜单
**PATCH** `/api/recipes/:id`

**请求体:**
```json
{
  "rating": 5,
  "isWishlisted": true
}
```

**响应 (200):** 返回更新后的菜单对象

---

### 8. 删除菜单
**DELETE** `/api/recipes/:id`

**响应:** 204 No Content

---

## 前端集成步骤

### 1. 保存 Token (登录/注册后)
```javascript
const response = await fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'john_doe', password: '...' })
});

const data = await response.json();
localStorage.setItem('token', data.token);
localStorage.setItem('username', data.username);
```

### 2. 在每个请求中包含 Token
```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:4000/api/recipes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. 处理 401 错误 (Token 过期)
```javascript
if (response.status === 401) {
  // 清除本地存储
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  // 重定向到登录页
  window.location.href = '/login';
}
```

### 4. 提取菜谱工作流
使用现有的 `/api/extract` 端点（无需认证）提取菜谱信息，然后用 token 保存到用户账户：

```javascript
// 1. 从文本或 URL 提取菜谱信息
const extractResponse = await fetch('http://localhost:4000/api/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    text: '菜谱文本' 
    // 或 url: 'https://...' 
  })
});
const extractedRecipe = await extractResponse.json();

// 2. 保存到用户账户
const token = localStorage.getItem('token');
const saveResponse = await fetch('http://localhost:4000/api/recipes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(extractedRecipe)
});
```

---

## 环境变量

在 `.env` 中设置以下变量（可选，有默认值）:

```
JWT_SECRET=your-super-secret-key-change-in-production
MONGODB_URI=mongodb://localhost:27017/recipe_organizer
PORT=4000
```

Token 过期时间: **7 天**

---

## 错误响应示例

### 缺少 Token
**401 Unauthorized**
```json
{ "error": "No token provided" }
```

### 无效 Token
**401 Unauthorized**
```json
{ "error": "Invalid or expired token" }
```

### 用户已存在
**409 Conflict**
```json
{ "error": "Username or email already exists" }
```

### 无效凭证
**401 Unauthorized**
```json
{ "error": "Invalid username or password" }
```

---

## 测试 cURL 示例

### 注册
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user","email":"test@example.com","password":"test123"}'
```

### 登录
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test_user","password":"test123"}'
```

### 获取菜谱列表
```bash
curl -X GET http://localhost:4000/api/recipes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 创建菜谱
```bash
curl -X POST http://localhost:4000/api/recipes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"番茄鸡蛋汤",
    "ingredients":["番茄","鸡蛋"],
    "steps":["炒番茄","加鸡蛋"],
    "cuisine":"Chinese"
  }'
```
