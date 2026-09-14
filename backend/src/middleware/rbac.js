export function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (role === 'SUPER_ADMIN') return next();
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }
    next();
  };
}
