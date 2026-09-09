export function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.params) req.params = schema.params.parse(req.params);
      if (schema.query) req.query = schema.query.parse(req.query);
      next();
    } catch (e) {
      const issues = e.issues || e.errors || [];
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: issues[0]?.message || 'Invalid input', details: issues.map(i => ({ path: i.path?.join('.'), message: i.message })) } });
    }
  };
}
