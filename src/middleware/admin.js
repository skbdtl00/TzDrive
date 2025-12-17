const config = require('../config');

function adminMiddleware(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== config.adminSecret) {
    return res.status(401).json({ message: 'Admin authorization required' });
  }
  next();
}

module.exports = adminMiddleware;
