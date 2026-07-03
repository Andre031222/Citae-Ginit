import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Trash2, Check, AlertCircle, Loader, Zap } from './Icons';
import { listApiKeys, addApiKey, testApiKey, removeApiKey } from '../services/apiKeyService';
import notify from '../services/swal';

// Metadatos por proveedor: etiqueta, pista del formato y dónde crear la clave.
const PROVIDER_META = {
  groq:       { label: 'Groq',          hint: 'Empieza por gsk_…',  url: 'https://console.groq.com/keys' },
  google:     { label: 'Google Gemini', hint: 'Empieza por AIza…',  url: 'https://aistudio.google.com/api-keys' },
  openrouter: { label: 'OpenRouter',    hint: 'Empieza por sk-or-…', url: 'https://openrouter.ai/keys' },
};

const STATUS_META = {
  active:    { label: 'Activa',   cls: 'ak-ok',   icon: <Check size={13} /> },
  exhausted: { label: 'Agotada',  cls: 'ak-warn', icon: <AlertCircle size={13} /> },
  invalid:   { label: 'Inválida', cls: 'ak-err',  icon: <AlertCircle size={13} /> },
};

function ApiKeys() {
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
      notify.error('No se pudieron cargar tus claves');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const raw = keyValue.trim();
    if (raw.length < 12) { notify.warning('La clave no parece válida'); return; }
    setAdding(true);
    try {
      await addApiKey(provider, raw);
      setKeyValue('');
      notify.success('Clave añadida y validada');
      await load();
    } catch (err) {
      notify.error('No se pudo añadir', err.response?.data?.error || 'Inténtalo de nuevo');
    } finally {
      setAdding(false);
    }
  };

  const handleTest = async (id) => {
    setBusyId(id);
    try {
      const r = await testApiKey(id);
      if (r.ok) notify.success('La clave funciona');
      else notify.warning('La clave no responde', r.reason || '');
      await load();
    } catch (_) {
      notify.error('No se pudo probar la clave');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (id) => {
    const res = await notify.confirm({
      title: '¿Eliminar esta clave?',
      text: 'Dejará de usarse de inmediato. Puedes añadir otra cuando quieras.',
      confirmText: 'Eliminar',
    });
    if (!res.isConfirmed) return;
    setBusyId(id);
    try {
      await removeApiKey(id);
      await load();
    } catch (_) {
      notify.error('No se pudo eliminar');
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
          Usa tu propia clave de IA. Se usará <strong>primero la tuya</strong> y, si se agota,
          Citae seguirá funcionando con el servicio por defecto. Tus claves se guardan cifradas
          y nunca se muestran completas.
        </p>
      </div>

      {hasExhausted && (
        <div className="ak-banner">
          <AlertCircle size={15} />
          <span>Una de tus claves se agotó o dejó de ser válida. Pruébala de nuevo, reemplázala o añade otra.</span>
        </div>
      )}

      <form className="ak-add" onSubmit={handleAdd}>
        <div className="ak-add-row">
          <select
            className="ak-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            aria-label="Proveedor de IA"
          >
            {providers.map(p => (
              <option key={p} value={p}>{PROVIDER_META[p]?.label || p}</option>
            ))}
          </select>
          <input
            className="ak-input"
            type="password"
            placeholder="Pega tu API key aquí"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="ak-btn ak-btn-add" type="submit" disabled={adding}>
            {adding ? <Loader size={15} className="ak-spin" /> : <Plus size={15} />}
            Añadir
          </button>
        </div>
        <p className="ak-hint">
          {meta.hint}{' · '}
          {meta.url && (
            <a href={meta.url} target="_blank" rel="noopener noreferrer">Obtener clave de {meta.label}</a>
          )}
        </p>
      </form>

      <div className="ak-list">
        {loading ? (
          <div className="ak-empty"><Loader size={18} className="ak-spin" /> Cargando…</div>
        ) : keys.length === 0 ? (
          <div className="ak-empty">Aún no has añadido ninguna clave.</div>
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
                    title="Probar la clave"
                  >
                    {busyId === k.id ? <Loader size={14} className="ak-spin" /> : <Zap size={14} />}
                    Probar
                  </button>
                  <button
                    className="ak-btn ak-btn-danger"
                    onClick={() => handleRemove(k.id)}
                    disabled={busyId === k.id}
                    aria-label="Eliminar clave"
                    title="Eliminar"
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
