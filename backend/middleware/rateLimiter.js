const rateLimitStore = new Map();

const chatRateLimiter = (maxRequests = 20, windowMs = 60000) => {
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests. Please wait before sending more messages.",
      });
    }

    record.count++;
    next();
  };
};

// Cleanup stale entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore) {
    if (now > record.resetTime) rateLimitStore.delete(key);
  }
}, 60000);

export default chatRateLimiter;
