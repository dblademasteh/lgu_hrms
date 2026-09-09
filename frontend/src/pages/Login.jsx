import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore.js';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const validate = () => {
    const e = {};
    if (!username) e.username = 'Username is required';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length === 0) {
      const ok = await login(username, password);
      if (ok) navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[10px] bg-accent text-accent-ink flex items-center justify-center font-display font-bold" aria-hidden="true">L</div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">LGU HRMS</h1>
            <p className="text-sm text-muted">Human Resource Management System</p>
          </div>
        </div>
        <p className="text-sm text-muted mb-6">Sign in to access personnel records</p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-ink mb-1">Username</label>
            <input id="username" type="text" value={username} onChange={e=>setUsername(e.target.value)} aria-invalid={!!errors.username} aria-describedby={errors.username ? "username-error" : undefined} className="input" placeholder="admin"/>
            {errors.username && <p id="username-error" className="text-sm text-error mt-1">{errors.username}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">Password</label>
            <input id="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} className="input" placeholder="admin123"/>
            {errors.password && <p id="password-error" className="text-sm text-error mt-1">{errors.password}</p>}
          </div>
          <button type="submit" className="btn btn-primary w-full">Sign In</button>
        </form>
        <p className="mono-label text-center mt-6">On-prem &middot; COA compliant &middot; RBAC protected</p>
      </div>
    </div>
  );
}
