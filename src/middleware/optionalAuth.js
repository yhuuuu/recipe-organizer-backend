const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

/**
 * Attaches user info when a valid token is present, but never rejects the
 * request. Lets a route serve both guests and signed-in users.
 */
const optionalAuthMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    req.isGuest = true;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    req.isGuest = false;
  } catch (error) {
    req.isGuest = true;
  }

  next();
};

module.exports = { optionalAuthMiddleware };
