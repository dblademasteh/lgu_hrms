export function validate(schema) {
  return (req, res, next) => {
    try {
      // Zod v4: subschemas live under .shape (direct .body access is undefined).
      // Fall back to direct props for Zod v3-era schemas.
      const shape = schema.shape ?? schema;
      const bodySchema = shape.body ?? schema.body;
      const paramsSchema = shape.params ?? schema.params;
      const querySchema = shape.query ?? schema.query;
      if (bodySchema?.parse) req.body = bodySchema.parse(req.body);
      if (paramsSchema?.parse) req.params = paramsSchema.parse(req.params);
      if (querySchema?.parse) {
        const parsed = querySchema.parse(req.query);
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
