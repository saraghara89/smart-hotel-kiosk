function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found.' });
}

function errorHandler(error, req, res, next) {
  const status = Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600
    ? error.statusCode
    : 500;

  console.error({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    method: req.method,
    path: req.path,
    status
  });

  const safeMessage = status >= 500
    ? 'Internal server error.'
    : (error.publicMessage || 'Request failed.');

  res.status(status).json({ success: false, message: safeMessage });
}

module.exports = { notFound, errorHandler };
