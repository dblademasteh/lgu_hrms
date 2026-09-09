import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="card p-8 max-w-md text-center">
        <p className="mono-label">Error 404</p>
        <h1 className="font-display text-xl font-bold text-ink mt-2">Page not found</h1>
        <p className="text-sm text-muted mt-2">The page you requested does not exist or has been moved.</p>
        <Link to="/" className="btn btn-primary mt-6">Back to Sign In</Link>
      </div>
    </div>
  );
}