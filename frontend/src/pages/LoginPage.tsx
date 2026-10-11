import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, RotateCw, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { KeystoneLogo } from '../components/KeystoneLogo';

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const RESEND_SECONDS = 60;

// The password-reset email links to /reset-password?token=..., which opens this page in "reset" mode.
const resetTokenFromUrl = () =>
  window.location.pathname.startsWith('/reset-password') ? new URLSearchParams(window.location.search).get('token') : null;

const errorMessage = (err: any, fallback: string) => {
  const data = err.response?.data;
  const fieldError = data?.fieldErrors && Object.values(data.fieldErrors)[0];
  return (fieldError as string) || data?.message || fallback;
};

const FEATURES = ['Raise and track service requests', 'Certified HVAC, electrical & plumbing technicians', 'Pay online and download receipts'];

export const LoginPage: React.FC<{ initialMode?: 'login' | 'register'; onBack?: () => void }> = ({ initialMode = 'login', onBack }) => {
  const { login } = useAuth();
  const [resetToken] = useState(resetTokenFromUrl);
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : initialMode);
  // A visitor who filled in the public request form is told why they are signing in.
  const [draftNotice] = useState(() => {
    try {
      return sessionStorage.getItem('keystone_request_draft') ? 'Sign in or create a free account to submit your service request. Your details are saved.' : null;
    } catch {
      return null;
    }
  });
  // Start with the email typed into the website's request card, if any.
  const [email, setEmail] = useState(() => {
    try {
      return (JSON.parse(sessionStorage.getItem('keystone_request_draft') || '{}').email as string) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(0);

  // Countdown for the "Resend code" button.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setConfirm('');
    setShowPassword(false);
    setOtp('');
    if (next === 'login' && window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/#/login');
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
        if (err.response?.data?.error === 'EMAIL_NOT_VERIFIED') {
          // Right password, unverified email: go straight to the code screen.
          setMode('verify');
          setOtp('');
          setError(null);
          setNotice('Please verify your email before logging in. Enter the 6-digit code we emailed you, or request a new one.');
          return;
        }
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
        // No session yet: the account must be verified with the emailed code first.
        setMode('verify');
        setOtp('');
        setPassword('');
        setConfirm('');
        setResendIn(RESEND_SECONDS);
        setNotice(res.message || `We sent a 6-digit code to ${email}.`);
      } catch (err: any) {
        setError(errorMessage(err, 'Registration failed. Please try again.'));
      }
    });
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    run(async () => {
      try {
        await authApi.verifyEmail(email, otp.trim());
        switchMode('login');
        setNotice('Email verified. You can now sign in.');
      } catch (err: any) {
        setError(errorMessage(err, 'Invalid verification code.'));
      }
    });
  };

  const handleResend = () => {
    if (resendIn > 0 || !email) return;
    run(async () => {
      try {
        const res = await authApi.resendOtp(email);
        setResendIn(RESEND_SECONDS);
        setNotice(res.message);
      } catch (err: any) {
        setError(errorMessage(err, 'Could not send a new code.'));
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
    verify: { title: 'Verify your email', sub: `Enter the code sent to ${email || 'your email'}` },
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
            Keystone Maintenance Solutions: HVAC, electrical and plumbing maintenance with live request tracking.
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
          {onBack && (
            <button type="button" className="kl-link kl-back" onClick={onBack}><ArrowLeft size={14} /> Back to website</button>
          )}
          <div className="kl-card-brand">
            <KeystoneLogo size={52} />
            <span>KEYSTONE</span>
          </div>

          <h2 className="kl-title">{heading[mode].title}</h2>
          <p className="kl-subtitle">{heading[mode].sub}</p>

          {draftNotice && !notice && !error && (mode === 'login' || mode === 'register') && (
            <div className="kl-alert kl-alert-ok" role="status">
              <CheckCircle2 size={16} />
              <span>{draftNotice}</span>
            </div>
          )}
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

          {mode === 'verify' && (
            <form onSubmit={handleVerify}>
              {!email && emailField}
              <div className="kl-field">
                <label className="kl-label" htmlFor="kl-otp">Verification code</label>
                <div className="kl-input-wrap">
                  <ShieldCheck size={18} className="kl-input-icon" />
                  <input
                    id="kl-otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    placeholder="6-digit code"
                    className="kl-input kl-otp"
                    autoFocus
                  />
                </div>
              </div>
              <div className="kl-row-end">
                <button type="button" className="kl-link" onClick={handleResend} disabled={resendIn > 0 || loading}>
                  <RotateCw size={14} /> {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
              <button type="submit" className="kl-submit" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying…' : <>Verify Email <ArrowRight size={18} /></>}
              </button>
              <p className="kl-help">The code expires after 10 minutes and works once. Check your spam folder if it doesn't arrive.</p>
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
              <span>Don't have an account? <button type="button" className="kl-link kl-link-underline" onClick={() => switchMode('register')}>Sign up</button></span>
            ) : mode === 'register' ? (
              <span>Already have an account? <button type="button" className="kl-link kl-link-underline" onClick={() => switchMode('login')}>Sign in</button></span>
            ) : (
              <button type="button" className="kl-link" onClick={() => switchMode('login')}><ArrowLeft size={14} /> Back to Sign In</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
