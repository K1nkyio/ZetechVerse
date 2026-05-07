const rateLimit = require('express-rate-limit');

const makeLimiter = ({ windowMinutes, max, message }) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message
  }
});

const loginLimiter = makeLimiter({
  windowMinutes: 15,
  max: 8,
  message: 'Too many login attempts. Please wait 15 minutes and try again.'
});

const signupLimiter = makeLimiter({
  windowMinutes: 60,
  max: 5,
  message: 'Too many signup attempts. Please wait before creating another account.'
});

const passwordResetLimiter = makeLimiter({
  windowMinutes: 60,
  max: 3,
  message: 'Too many password reset requests. Please wait before trying again.'
});

const contentWriteLimiter = makeLimiter({
  windowMinutes: 10,
  max: 20,
  message: 'Too many content submissions. Please slow down and try again shortly.'
});

const commentLimiter = makeLimiter({
  windowMinutes: 10,
  max: 30,
  message: 'Too many comments. Please slow down and try again shortly.'
});

const messageLimiter = makeLimiter({
  windowMinutes: 10,
  max: 20,
  message: 'Too many messages. Please wait a few minutes before sending more.'
});

module.exports = {
  commentLimiter,
  contentWriteLimiter,
  loginLimiter,
  messageLimiter,
  passwordResetLimiter,
  signupLimiter
};
