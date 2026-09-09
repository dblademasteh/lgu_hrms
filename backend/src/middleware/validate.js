export function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.params) req.params = schema.params.parse(req.params);
      if (schema.query) req.query = schema.query.parse(req.query);
      next();
    } catch (e) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: e.errors?.[0]?.message || 'Invalid input' } });
    }
  };
}
