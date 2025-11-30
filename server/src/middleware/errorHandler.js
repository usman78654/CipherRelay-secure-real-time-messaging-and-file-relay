/**
 * Global error handler middleware.
 * Catches unhandled errors and prevents server crashes.
 */

export const errorHandler = (err, req, res, next) => {
  // Detect JSON parse errors coming from body parser
  if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parse error:', err.message);
    // Log the raw body captured by the json verify hook (if any)
    if (req && req.rawBody) {
      console.error('Raw body (first 1000 chars):', req.rawBody.substring(0, 1000));
    }
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }

  console.error('Error:', err && err.message ? err.message : err);

  res.status(500).json({
    error: 'Internal server error.',
    message: err && err.message ? err.message : String(err)
  });
};
