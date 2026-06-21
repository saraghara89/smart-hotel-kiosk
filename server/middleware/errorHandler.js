function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error'
  });
}

module.exports = { notFound, errorHandler };
