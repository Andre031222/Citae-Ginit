import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Plus, Trash2, Check, AlertCircle, Loader, Zap, ExternalLink } from './Icons';
import { listApiKeys, addApiKey, testApiKey, removeApiKey } from '../services/apiKeyService';
import notify from '../services/swal';

function ApiKeys() {
  const { t } = useTranslation();

  // Metadatos por proveedor: etiqueta, formato, dónde crear la clave y los pasos.
  const PROVIDER_META = {
    groq: {
      label: 'Groq', hint: t('profile.apiKeys.providers.groq.hint'), url: 'https://console.groq.com/keys',
      steps: t('profile.apiKeys.providers.groq.steps', { returnObjects: true }),
    },
    google: {
      label: 'Google Gemini', hint: t('profile.apiKeys.providers.google.hint'), url: 'https://aistudio.google.com/api-keys',
      steps: t('profile.apiKeys.providers.google.steps', { returnObjects: true }),
    },
    openrouter: {
      label: 'OpenRouter', hint: t('profile.apiKeys.providers.openrouter.hint'), url: 'https://openrouter.ai/keys',
      steps: t('profile.apiKeys.providers.openrouter.steps', { returnObjects: true }),
    },
  };

  const STATUS_META = {
    active:    { label: t('profile.apiKeys.status.active'),    cls: 'ak-ok',   icon: <Check size={13} /> },
    exhausted: { label: t('profile.apiKeys.status.exhausted'), cls: 'ak-warn', icon: <AlertCircle size={13} /> },
    invalid:   { label: t('profile.apiKeys.status.invalid'),   cls: 'ak-err',  icon: <AlertCircle size={13} /> },
  };

  const [keys, setKeys]         = useState([]);
  const [providers, setProviders] = useState(['groq', 'google', 'openrouter']);
  const [loading, setLoading]   = useState(true);
  const [provider, setProvider] = useState('groq');
  const [keyValue, setKeyValue] = useState('');
  const [adding, setAdding]     = useState(false);
  const [busyId, setBusyId]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listApiKeys();
      setKeys(data.keys || []);
      if (data.providers?.length) setProviders(data.providers);
    } catch (_) {
      notify.error(t('profile.apiKeys.toasts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const raw = keyValue.trim();
    if (raw.length < 12) { notify.warning(t('profile.apiKeys.toasts.invalidKey')); return; }
    setAdding(true);
    try {
      await addApiKey(provider, raw);
      setKeyValue('');
      notify.success(t('profile.apiKeys.toasts.added'));
      await load();
    } catch (err) {
      notify.error(t('profile.apiKeys.toasts.addErrorTitle'), err.response?.data?.error || t('profile.apiKeys.toasts.addErrorText'));
    } finally {
      setAdding(false);
    }
  };

  const handleTest = async (id) => {
    setBusyId(id);
    try {
      const r = await testApiKey(id);
      if (r.ok) notify.success(t('profile.apiKeys.toasts.works'));
      else notify.warning(t('profile.apiKeys.toasts.noResponse'), r.reason || '');
      await load();
    } catch (_) {
      notify.error(t('profile.apiKeys.toasts.testError'));
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (id) => {
    const res = await notify.confirm({
      title: t('profile.apiKeys.toasts.removeConfirmTitle'),
      text: t('profile.apiKeys.toasts.removeConfirmText'),
      confirmText: t('profile.apiKeys.toasts.removeConfirmBtn'),
    });
    if (!res.isConfirmed) return;
    setBusyId(id);
    try {
      await removeApiKey(id);
      await load();
    } catch (_) {
      notify.error(t('profile.apiKeys.toasts.removeError'));
    } finally {
      setBusyId(null);
    }
  };

  const meta = PROVIDER_META[provider] || {};
  const hasExhausted = keys.some(k => k.status === 'exhausted' || k.status === 'invalid');

  return (
    <div className="ak-wrap">
      <div className="ak-intro">
        <Sparkles size={16} />
        <p>
          {t('profile.apiKeys.intro1')}<strong>{t('profile.apiKeys.introStrong1')}</strong>{t('profile.apiKeys.intro2')}<strong>{t('profile.apiKeys.introStrong2')}</strong>{t('profile.apiKeys.intro3')}
        </p>
      </div>

      {hasExhausted && (
        <div className="ak-banner">
          <AlertCircle size={15} />
          <span>{t('profile.apiKeys.banner')}</span>
        </div>
      )}

      <form className="ak-add" onSubmit={handleAdd}>
        <div className="ak-add-row">
          <select
            className="ak-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            aria-label={t('profile.apiKeys.providerAria')}
          >
            {providers.map(p => (
              <option key={p} value={p}>{PROVIDER_META[p]?.label || p}</option>
            ))}
          </select>
          <input
            className="ak-input"
            type="password"
            placeholder={t('profile.apiKeys.keyPlaceholder')}
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="ak-btn ak-btn-add" type="submit" disabled={adding}>
            {adding ? <Loader size={15} className="ak-spin" /> : <Plus size={15} />}
            {t('profile.apiKeys.add')}
          </button>
        </div>
        <div className="ak-howto">
          <div className="ak-howto-head">
            <span className="ak-howto-title">{t('profile.apiKeys.howToTitle', { provider: meta.label })}</span>
            {meta.url && (
              <a className="ak-howto-link" href={meta.url} target="_blank" rel="noopener noreferrer">
                {t('profile.apiKeys.openProvider', { provider: meta.label })} <ExternalLink size={12} />
              </a>
            )}
          </div>
          <ol className="ak-howto-steps">
            {(meta.steps || []).map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <p className="ak-howto-note">{meta.hint} · {t('profile.apiKeys.freeNote')}</p>
        </div>
      </form>

      <div className="ak-list">
        {loading ? (
          <div className="ak-empty"><Loader size={18} className="ak-spin" /> {t('profile.apiKeys.loading')}</div>
        ) : keys.length === 0 ? (
          <div className="ak-empty">{t('profile.apiKeys.empty')}</div>
        ) : (
          keys.map(k => {
            const st = STATUS_META[k.status] || STATUS_META.active;
            const pm = PROVIDER_META[k.provider] || { label: k.provider };
            return (
              <div key={k.id} className="ak-item">
                <div className="ak-item-main">
                  <span className="ak-provider">{pm.label}</span>
                  <span className="ak-masked">{k.key_masked}</span>
                </div>
                <span className={`ak-status ${st.cls}`}>{st.icon}{st.label}</span>
                <div className="ak-actions">
                  <button
                    className="ak-btn ak-btn-ghost"
                    onClick={() => handleTest(k.id)}
                    disabled={busyId === k.id}
                    title={t('profile.apiKeys.testTitle')}
                  >
                    {busyId === k.id ? <Loader size={14} className="ak-spin" /> : <Zap size={14} />}
                    {t('profile.apiKeys.test')}
                  </button>
                  <button
                    className="ak-btn ak-btn-danger"
                    onClick={() => handleRemove(k.id)}
                    disabled={busyId === k.id}
                    aria-label={t('profile.apiKeys.removeAria')}
                    title={t('profile.apiKeys.removeTitle')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ApiKeys;
