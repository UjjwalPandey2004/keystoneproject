import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { KeystoneLogo } from '../components/KeystoneLogo';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

// The password-reset email links to /reset-password?token=..., which opens this page in "reset" mode.
const resetTokenFromUrl = () =>
  window.location.pathname.startsWith('/reset-password') ? new URLSearchParams(window.location.search).get('token') : null;

const errorMessage = (err: any, fallback: string) => {
  const data = err.response?.data;
  const fieldError = data?.fieldErrors && Object.values(data.fieldErrors)[0];
  return (fieldError as string) || data?.message || fallback;
};

const FEATURES = ['Work Order Management', 'Role-Based Access', 'Field Service Operations'];

export const LoginPage: React.FC = () => {
  const { login, setQuickAuth } = useAuth();
  const [resetToken] = useState(resetTokenFromUrl);
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    if (next === 'login' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  };

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      try {
        await login(email, password);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid email or password. Please verify your credentials.');
      }
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    run(async () => {
      try {
        const res = await authApi.register({ userName: name, userEmail: email, password, phone: phone || undefined });
        setQuickAuth(res.email, res.role, res.name || name, res.token);
      } catch (err: any) {
        setError(errorMessage(err, 'Registration failed. Please try again.'));
      }
    });
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      try {
        await authApi.forgotPassword(email);
      } catch {
        // Same answer either way, so the form does not reveal which emails have accounts.
      }
      setNotice('If an account exists for that email, a password reset link has been sent to it.');
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    run(async () => {
      try {
        await authApi.resetPassword(resetToken || '', password);
        switchMode('login');
        setNotice('Your password has been reset. Sign in with your new password.');
      } catch (err: any) {
        setError(errorMessage(err, 'This reset link is invalid or has expired.'));
      }
    });
  };

  const passwordField = (label: string, value: string, onChange: (v: string) => void, autoComplete: string, placeholder: string) => (
    <div className="kl-field">
      <label className="kl-label">{label}</label>
      <div className="kl-input-wrap">
        <Lock size={18} className="kl-input-icon" />
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="kl-input kl-input-pad-right"
        />
        <button
          type="button"
          className="kl-eye"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );

  const emailField = (
    <div className="kl-field">
      <label className="kl-label">Work Email</label>
      <div className="kl-input-wrap">
        <Mail size={18} className="kl-input-icon" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="Enter your work email"
          className="kl-input"
        />
      </div>
    </div>
  );

  const heading: Record<Mode, { title: string; sub: string }> = {
    login: { title: 'Sign In', sub: 'Login to your Keystone account' },
    register: { title: 'Create Account', sub: 'Register a new customer account' },
    forgot: { title: 'Forgot Password', sub: 'We will email you a link to reset it' },
    reset: { title: 'Reset Password', sub: 'Choose a new password for your account' },
  };

  return (
    <div className="kl-page">
      <div className="kl-shape kl-shape-top" aria-hidden="true" />
      <div className="kl-shape kl-shape-bottom" aria-hidden="true" />
      <div className="kl-watermark" aria-hidden="true">K</div>

      <div className="kl-layout">
        {/* Left: branding */}
        <section className="kl-brand">
          <div className="kl-brand-logo"><KeystoneLogo size={132} /></div>
          <h1 className="kl-brand-name">KEYSTONE</h1>
          <p className="kl-brand-tagline">Field Service Management Platform</p>
          <p className="kl-brand-desc">
            Commercial facilities maintenance and field-service platform for Meridian Facilities Management.
          </p>
          <ul className="kl-features">
            {FEATURES.map((feature) => (
              <li key={feature}>
                <span className="kl-check"><Check size={14} strokeWidth={3} /></span>
                {feature}
              </li>
            ))}
          </ul>
        </section>

        {/* Right: login card */}
        <section className="kl-card">
          <div className="kl-card-brand">
            <KeystoneLogo size={52} />
            <span>KEYSTONE</span>
          </div>

          <h2 className="kl-title">{heading[mode].title}</h2>
          <p className="kl-subtitle">{heading[mode].sub}</p>

          {error && (
            <div className="kl-alert kl-alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="kl-alert kl-alert-ok" role="status">
              <CheckCircle2 size={16} />
              <span>{notice}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              {emailField}
              {passwordField('Password', password, setPassword, 'current-password', 'Enter your password')}
              <div className="kl-row-end">
                <button type="button" className="kl-link" onClick={() => switchMode('forgot')}>Forgot Password?</button>
              </div>
              <button type="submit" className="kl-submit" disabled={loading}>
                {loading ? 'Signing in…' : <>Sign In to Keystone <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="kl-field">
                <label className="kl-label">Full Name</label>
                <div className="kl-input-wrap">
                  <UserIcon size={18} className="kl-input-icon" />
                  <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Enter your full name" className="kl-input" />
                </div>
              </div>
              {emailField}
              <div className="kl-field">
                <label className="kl-label">Phone <span className="kl-optional">(optional)</span></label>
                <div className="kl-input-wrap">
                  <Phone size={18} className="kl-input-icon" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="Enter your phone number" className="kl-input" />
                </div>
              </div>
              {passwordField('Password', password, setPassword, 'new-password', 'At least 6 characters')}
              {passwordField('Confirm Password', confirm, setConfirm, 'new-password', 'Repeat your password')}
              <button type="submit" className="kl-submit" disabled={loading}>
                {loading ? 'Creating account…' : <>Create Account <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot}>
              {emailField}
              <button type="submit" className="kl-submit" disabled={loading}>
                {loading ? 'Sending…' : <>Send Reset Link <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset}>
              {passwordField('New Password', password, setPassword, 'new-password', 'At least 8 characters')}
              {passwordField('Confirm New Password', confirm, setConfirm, 'new-password', 'Repeat your new password')}
              <button type="submit" className="kl-submit" disabled={loading}>
                {loading ? 'Saving…' : <>Reset Password <ArrowRight size={18} /></>}
              </button>
            </form>
          )}

          <div className="kl-footer">
            {mode === 'login' ? (
              <span>Don't have an account? <button type="button" className="kl-link kl-link-underline" onClick={() => switchMode('register')}>Register here</button></span>
            ) : (
              <button type="button" className="kl-link" onClick={() => switchMode('login')}><ArrowLeft size={14} /> Back to Sign In</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
