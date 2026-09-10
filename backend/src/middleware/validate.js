export function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.params) req.params = schema.params.parse(req.params);
      if (schema.query) {
        const parsed = schema.query.parse(req.query);
        // Express 5 exposes req.query as a getter-only accessor, so plain
        // assignment throws. defineProperty shadows it on the instance —
        // works on Express 4 and 5 alike.
        Object.defineProperty(req, 'query', {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }
      next();
    } catch (e) {
      const issues = e.issues || e.errors || [];
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: issues[0]?.message || 'Invalid input', details: issues.map(i => ({ path: i.path?.join('.'), message: i.message })) } });
    }
  };
}
