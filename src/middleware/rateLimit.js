const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const DAY_MS = 24 * 60 * 60 * 1000;

const GUEST_DAILY_LIMIT = Number(process.env.EXTRACT_GUEST_DAILY_LIMIT) || 5;
const USER_DAILY_LIMIT = Number(process.env.EXTRACT_USER_DAILY_LIMIT) || 50;

/**
 * Protects the Azure OpenAI budget. Guests get a small daily demo quota keyed
 * by IP; signed-in users get a larger quota keyed by user id so that sharing an
 * IP (office/campus NAT) does not consume someone else's allowance.
 */
const extractRateLimiter = rateLimit({
  windowMs: DAY_MS,
  limit: (req) => (req.isGuest ? GUEST_DAILY_LIMIT : USER_DAILY_LIMIT),
  keyGenerator: (req) =>
    req.isGuest ? `guest:${ipKeyGenerator(req.ip)}` : `user:${req.userId}`,
  // Only successful extractions consume quota. Validation errors and scrape
  // failures never reach Azure OpenAI, so charging for them would let a few
  // bad URLs burn a visitor's whole daily allowance.
  skipFailedRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    const limit = req.isGuest ? GUEST_DAILY_LIMIT : USER_DAILY_LIMIT;
    res.status(429).json({
      error: req.isGuest
        ? `Demo limit reached (${limit} AI extractions per day). Create a free account to keep going.`
        : `Daily AI extraction limit reached (${limit} per day). Please try again tomorrow.`,
      code: req.isGuest ? 'GUEST_QUOTA_EXCEEDED' : 'USER_QUOTA_EXCEEDED',
      limit,
    });
  },
});

module.exports = { extractRateLimiter, GUEST_DAILY_LIMIT, USER_DAILY_LIMIT };
