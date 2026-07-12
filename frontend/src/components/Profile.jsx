import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import api from '../services/api';
import authService from '../services/authService';
import {
  User, HardDrive, Settings, Info, AlertCircle, Check,
  Upload, ChevronLeft, Loader, Library, Highlighter, Folder, Tag as TagIcon, Sparkles,
} from './Icons';
import ApiKeys from './ApiKeys';
import { getActivity } from '../services/libraryService';
import './Profile.css';

// Origen público del servidor (sin /api) para construir URLs de imágenes
const API_ORIGIN = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const Profile = ({ user, onUpdate, onClose }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    timezone: 'UTC',
  });

  const [profileImage, setProfileImage] = useState(null);
  const [imageFile, setImageFile]       = useState(null);
  const [loading, setLoading]           = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const [section, setSection] = useState('profile');
  const [stats, setStats]     = useState(null);

  useEffect(() => {
    if (section === 'storage' && !stats) {
      getActivity().then(d => setStats(d.stats)).catch(() => {});
    }
  }, [section, stats]);

  const fetchProfile = useCallback(async () => {
    try {
      if (!authService.getToken()) {
        if (user) populateFromUser(user);
        setLoadingProfile(false);
        return;
      }

      const { data } = await api.get('/profile');
      if (data.success && data.user) {
        const u = data.user;
        setFormData({
          firstName: u.first_name || u.firstName || u.username || '',
          lastName:  u.last_name  || u.lastName  || '',
          email:     u.email      || '',
          timezone:  u.timezone   || 'America/Lima',
        });
        const img = u.profile_image_url
          || (u.profile_image_path ? `${API_ORIGIN}${u.profile_image_path}` : null)
          || u.avatar_url || null;
        if (img) setProfileImage(img);
      }
    } catch (_) {
      if (user) populateFromUser(user);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  const populateFromUser = (u) => {
    setFormData({
      firstName: u.first_name || u.firstName || u.username || '',
      lastName:  u.last_name  || u.lastName  || '',
      email:     u.email      || '',
      timezone:  u.timezone   || 'America/Lima',
    });
    const img = u.profile_image_url
      || (u.profile_image_path ? `${API_ORIGIN}${u.profile_image_path}` : null)
      || u.avatar_url || null;
    if (img) setProfileImage(img);
  };

  useEffect(() => {
    if (user) populateFromUser(user);
    fetchProfile();
  }, [user, fetchProfile]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (error)   setError('');
    if (success) setSuccess('');
  };

  // Recorta la imagen a un cuadrado centrado de 400×400 (sin distorsión)
  const cropToSquare = (file) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth  - size) / 2;
      const sy = (img.naturalHeight - size) / 2;
      const out = 400;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = out;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, out, out);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(img.src);
        if (!blob) return resolve(null);
        resolve({ file: new File([blob], 'avatar.jpg', { type: 'image/jpeg' }), url: URL.createObjectURL(blob) });
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError(t('profile.alerts.imageTooLarge')); return; }
    const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!valid.includes(file.type)) { setError(t('profile.alerts.invalidImageType')); return; }
    setError('');

    const cropped = await cropToSquare(file);
    if (cropped) {
      setImageFile(cropped.file);
      setProfileImage(cropped.url);
    } else {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    const { isConfirmed } = await Swal.fire({
      title: t('profile.removePhoto.title'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('profile.removePhoto.confirm'),
      cancelButtonText: t('profile.removePhoto.cancel'),
    });
    if (!isConfirmed) return;
    setLoading(true);
    try {
      const { data } = await api.delete('/profile/image');
      if (data.success) {
        setProfileImage(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setSuccess(t('profile.alerts.photoRemoved'));
        setTimeout(() => setSuccess(''), 3000);
        onUpdate?.({ ...user, avatar_url: null, profile_image_url: null });
      } else {
        setError(data.message || t('profile.alerts.photoRemoveError'));
      }
    } catch (_) {
      setError(t('profile.alerts.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!formData.firstName.trim()) {
      setError(t('profile.alerts.nameRequired'));
      setLoading(false);
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t('profile.alerts.invalidEmail'));
      setLoading(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append('firstName', formData.firstName.trim());
      fd.append('lastName',  formData.lastName.trim());
      fd.append('email',     formData.email.trim());
      fd.append('timezone',  formData.timezone);
      if (imageFile) fd.append('profileImage', imageFile);

      const { data } = await api.put('/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        setSuccess(t('profile.alerts.profileUpdated'));
        const imgUrl = data.user?.profile_image_url
          || (data.user?.profile_image_path ? `${API_ORIGIN}${data.user.profile_image_path}` : null);
        if (imgUrl) setProfileImage(imgUrl);
        setImageFile(null);
        setTimeout(() => setSuccess(''), 3000);
        onUpdate?.({ ...user, ...data.user, avatar_url: imgUrl || data.user?.avatar_url });
      } else {
        setError(data.message || t('profile.alerts.updateError'));
      }
    } catch (_) {
      setError(t('profile.alerts.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (formData.firstName && formData.lastName)
      return `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase();
    if (user?.username) return user.username.substring(0, 2).toUpperCase();
    return 'U';
  };

  if (loadingProfile) {
    return (
      <div className="loading-screen">
        <Loader size={28} className="spinning" style={{ color: 'var(--accent)' }} />
        <p style={{ color: 'var(--text-3)', fontSize: '0.875rem', marginTop: '0.75rem' }}>
          {t('profile.loading')}
        </p>
      </div>
    );
  }

  const navItems = [
    { key: 'profile', icon: <User size={15} />,      label: t('profile.nav.profile') },
    { key: 'ai',      icon: <Sparkles size={15} />,  label: t('profile.nav.ai') },
    { key: 'storage', icon: <HardDrive size={15} />, label: t('profile.nav.storage') },
    { key: 'general', icon: <Settings size={15} />,  label: t('profile.nav.general') },
  ];

  const STAT_CARDS = [
    { key: 'papers',      label: t('profile.storage.papers'),      icon: <Library size={18} /> },
    { key: 'highlights',  label: t('profile.storage.highlights'),  icon: <Highlighter size={18} /> },
    { key: 'collections', label: t('profile.storage.collections'), icon: <Folder size={18} /> },
    { key: 'tags',        label: t('profile.storage.tags'),        icon: <TagIcon size={18} /> },
  ];

  const SECTION_TITLES = { profile: t('profile.nav.profile'), ai: t('profile.nav.ai'), storage: t('profile.nav.storage'), general: t('profile.nav.general') };

  return (
    <div className="settings-container">
      {/* Left sidebar */}
      <div className="settings-sidebar">
        {onClose && (
          <button className="back-button" onClick={onClose}>
            <ChevronLeft size={15} /> {t('profile.back')}
          </button>
        )}

        <nav className="settings-sections">
          <div className="section-group">
            <h3>{t('profile.accountGroup')}</h3>
            {navItems.map(({ key, icon, label }) => (
              <button
                key={key}
                className={`section-item ${section === key ? 'active' : ''}`}
                onClick={() => setSection(key)}
              >
                <span className="section-icon">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Right content */}
      <div className="settings-content">
        <div className="content-header">
          <h1>{SECTION_TITLES[section]}</h1>
          {section === 'profile' && (
            <p className="info-message">
              <Info size={14} />
              {t('profile.infoMessage')}
            </p>
          )}
        </div>

        {section === 'ai' && (
          <div className="profile-fields-section">
            <ApiKeys />
          </div>
        )}

        {section === 'storage' && (
          <div className="profile-fields-section">
            <p className="help-text" style={{ marginBottom: 16 }}>
              {t('profile.storage.summary')}
            </p>
            <div className="settings-stats">
              {STAT_CARDS.map(c => (
                <div key={c.key} className="settings-stat">
                  <span className="settings-stat-icon">{c.icon}</span>
                  <span className="settings-stat-num">{stats ? (stats[c.key] ?? 0) : '—'}</span>
                  <span className="settings-stat-label">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'general' && (
          <div className="profile-fields-section">
            <div className="form-group">
              <label>{t('profile.general.language')}</label>
              <input type="text" value={t('profile.general.languageValue')} disabled />
            </div>
            <div className="form-group">
              <label>{t('profile.general.account')}</label>
              <input type="text" value={`@${user?.username || ''}`} disabled />
            </div>
            <div className="form-group">
              <label>{t('profile.general.accountType')}</label>
              <input type="text" value={user?.role === 'super_admin' ? 'Super Admin' : t('profile.general.roleUser')} disabled />
            </div>
            <p className="help-text">{t('profile.general.themeHint')}</p>
          </div>
        )}

        {section === 'profile' && (
        <form onSubmit={handleSubmit} className="profile-form">
          {error && (
            <div className="form-alert form-alert-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          {success && (
            <div className="form-alert form-alert-success">
              <Check size={14} /> {success}
            </div>
          )}

          {/* Avatar */}
          <div className="profile-picture-section">
            <h3>{t('profile.avatar.title')}</h3>
            <div className="picture-controls">
              <div className="picture-preview">
                {profileImage
                  ? <img src={profileImage} alt={t('profile.avatar.alt')} />
                  : <div className="avatar-placeholder">{getInitials()}</div>
                }
              </div>

              <div className="picture-buttons">
                <button
                  type="button"
                  className="upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload size={14} /> {t('profile.avatar.upload')}
                </button>
                {profileImage && (
                  <button
                    type="button"
                    className="remove-button"
                    onClick={handleRemoveImage}
                    disabled={loading}
                  >
                    {t('profile.avatar.remove')}
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
            <p className="help-text">{t('profile.avatar.help')}</p>
          </div>

          <div className="profile-fields-section">
            {/* Name row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">{t('profile.form.firstName')}</label>
                <input
                  id="firstName" name="firstName" type="text"
                  value={formData.firstName} onChange={handleInput}
                  placeholder={t('profile.form.firstNamePlaceholder')} required disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">{t('profile.form.lastName')}</label>
                <input
                  id="lastName" name="lastName" type="text"
                  value={formData.lastName} onChange={handleInput}
                  placeholder={t('profile.form.lastNamePlaceholder')} disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">{t('profile.form.email')}</label>
              <input
                id="email" name="email" type="email"
                value={formData.email} onChange={handleInput}
                placeholder="correo@ejemplo.com" required disabled={loading}
              />
              <button
                type="button" className="link-button"
                onClick={() => Swal.fire({ title: t('profile.changeEmailDialog.title'), text: t('profile.changeEmailDialog.text'), icon: 'info' })}
              >
                {t('profile.form.changeEmail')}
              </button>
            </div>

            {/* Timezone */}
            <div className="form-group">
              <label htmlFor="timezone">{t('profile.form.timezone')}</label>
              <select
                id="timezone" name="timezone"
                value={formData.timezone} onChange={handleInput}
                disabled={loading}
              >
                <option value="UTC">UTC</option>
                <option value="America/Lima">{t('profile.timezones.lima')}</option>
                <option value="America/La_Paz">{t('profile.timezones.laPaz')}</option>
                <option value="America/Bogota">{t('profile.timezones.bogota')}</option>
                <option value="America/Guayaquil">{t('profile.timezones.guayaquil')}</option>
                <option value="America/Caracas">{t('profile.timezones.caracas')}</option>
                <option value="America/Buenos_Aires">{t('profile.timezones.buenosAires')}</option>
                <option value="America/Santiago">{t('profile.timezones.santiago')}</option>
                <option value="America/Mexico_City">{t('profile.timezones.mexico')}</option>
                <option value="America/New_York">{t('profile.timezones.newYork')}</option>
                <option value="America/Los_Angeles">{t('profile.timezones.losAngeles')}</option>
                <option value="Europe/Madrid">{t('profile.timezones.madrid')}</option>
                <option value="Europe/London">{t('profile.timezones.london')}</option>
              </select>
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button type="submit" className="save-button" disabled={loading}>
                {loading
                  ? <><Loader size={14} className="spinning" /> {t('profile.form.saving')}</>
                  : t('profile.form.save')
                }
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default Profile;
