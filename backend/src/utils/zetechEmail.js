const ALLOWED_ZETECH_EMAIL_DOMAINS = ['zetech.ac.ke', 'student.zetech.ac.ke'];

const getEmailDomain = (email = '') => String(email).trim().toLowerCase().split('@').pop() || '';

const isAllowedZetechEmail = (email = '') => ALLOWED_ZETECH_EMAIL_DOMAINS.includes(getEmailDomain(email));

const ZETECH_EMAIL_REQUIREMENT_MESSAGE = 'Please use your Zetech email address (@zetech.ac.ke or @student.zetech.ac.ke)';

module.exports = {
  ALLOWED_ZETECH_EMAIL_DOMAINS,
  ZETECH_EMAIL_REQUIREMENT_MESSAGE,
  isAllowedZetechEmail
};
