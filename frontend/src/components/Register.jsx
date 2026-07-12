import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import {
  Loader, AlertCircle, Eye, EyeOff,
  ChevronLeft, ArrowRight,
} from './Icons';
import authService from '../services/authService';
import citoLogo from '../assets/citae-logo-v2.png';
import { useBranding } from '../context/BrandingContext';
import { googleAuthUrl } from '../services/apiBase';

const GOOGLE_AUTH_URL = googleAuthUrl();

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"/>
  </svg>
);

function usernameFromEmail(email) {
  return email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 30) || 'user';
}

const STRENGTH_COLORS = ['', '#DC2626', '#D97706', '#16A34A'];

const Register = ({ onLogin }) => {
  const { t }        = useTranslation();
  const navigate     = useNavigate();
  const { branding } = useBranding();
  const STRENGTH_LABELS = ['', t('auth.strengthWeak'), t('auth.strengthGood'), t('auth.strengthStrong')];
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const strength = password.length === 0 ? 0
    : password.length < 8  ? 1
    : password.length < 12 ? 2
    : 3;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError(t('auth.errorPasswordTooShort')); return; }
    setLoading(true);
    setError('');
    try {
      const username = usernameFromEmail(email);
      const res = await authService.register({ username, email, password, role });
      onLogin(res.user);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.error || t('auth.errorCreateAccount'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-right-toplinks">
          <Link to="/" className="auth-back"><ChevronLeft size={13} /> {t('auth.home')}</Link>
          <Link to="/login" className="auth-switch">{t('auth.haveAccount')}</Link>
        </div>

        <div className="auth-brand-logo-wrap">
          <img src={branding.logo_url || citoLogo} alt={branding.site_name || 'Citae'} width={56} height={56} />
        </div>

        <div className="auth-form-head">
          <h2>{t('auth.createFreeAccount')}</h2>
          <p>{t('auth.registerSubtitle')}</p>
        </div>

        <a className="auth-google" href={GOOGLE_AUTH_URL}>
          <GoogleIcon />
          <span>{t('auth.continueGoogle')}</span>
        </a>

        <div className="auth-or">
          <span />
          <span>{t('auth.orWithEmail')}</span>
          <span />
        </div>

        {error && (
          <div className="auth-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">
          <div className="auth-field">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder={t('auth.emailPlaceholder')}
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          <div className="auth-field">
            <label>{t('auth.password')}</label>
            <div className="auth-input-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={t('auth.passwordPlaceholder')}
                required
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="auth-strength">
                <div className="auth-strength-bars">
                  {[1, 2, 3].map(i => (
                    <span key={i} className="auth-strength-bar"
                      style={{ background: strength >= i ? STRENGTH_COLORS[strength] : 'var(--surface-3)' }} />
                  ))}
                </div>
                <span className="auth-strength-label" style={{ color: STRENGTH_COLORS[strength] }}>
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label>{t('auth.profile')} <span style={{ fontWeight: 400, color: 'var(--f-muted)' }}>{t('auth.optional')}</span></label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="auth-select"
            >
              <option value="">{t('auth.selectProfile')}</option>
              <option value="student">{t('auth.roleStudent')}</option>
              <option value="researcher">{t('auth.roleResearcher')}</option>
              <option value="professor">{t('auth.roleProfessor')}</option>
              <option value="other">{t('auth.roleOther')}</option>
            </select>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? <><Loader size={15} className="spinning" /> {t('auth.creatingAccount')}</>
              : <>{t('auth.createAccount')} <ArrowRight size={14} /></>
            }
          </button>
        </form>

        <p className="auth-footer-note">
          {t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.signInLink')}</Link>
        </p>
        <p className="auth-footer-note auth-footer-legal">
          {t('auth.legal')}
        </p>
      </div>
    </div>
  );
};

export default Register;
