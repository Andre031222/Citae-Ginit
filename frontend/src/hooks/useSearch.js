import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';
import notify from '../services/swal';

export function useSearch({ user, loadHistory }) {
  const [messages,   setMessages]   = useState([]);
  const [extracting, setExtracting] = useState(false);

  // Modo incógnito: las búsquedas no se guardan en el historial
  const [incognito, setIncognito] = useState(false);
  const incognitoRef = useRef(false);
  useEffect(() => { incognitoRef.current = incognito; }, [incognito]);
  // Persiste sólo si hay sesión y NO estamos en incógnito
  const canPersist = useCallback(() => !!user && !incognitoRef.current, [user]);

  const generateCitations = useCallback(async (paperId) => {
    const { data } = await api.post(`/papers/${paperId}/citations/generate-all`);
    const map = {};
    data.citations.forEach(c => { map[c.format_type] = c.citation_text; });
    return map;
  }, []);

  const handleExtract = useCallback(async (input, filters = null) => {
    const uid = Date.now();
    setMessages(prev => [
      ...prev,
      { id: uid,     role: 'user',      content: input },
      { id: uid + 1, role: 'assistant', loading: true, searching: true,
        query: input, loadingText: 'Buscando en bases académicas…' },
    ]);
    setExtracting(true);
    try {
      const payload = { input };
      if (filters && Object.keys(filters).length) payload.filters = filters;
      const { data } = await api.post('/papers/search-candidates', payload);
      const userMsg  = { id: uid, role: 'user', content: input };

      if (data.action === 'exact') {
        const paper        = data.paper;
        const citations    = await generateCitations(paper.id);
        const assistantMsg = { id: uid + 1, role: 'assistant', loading: false, paper, citations };
        setMessages(prev => prev.map(m => m.id === uid + 1 ? assistantMsg : m));
        if (canPersist() && paper) {
          try {
            await api.post('/auth/history', {
              query: input, type: 'citation',
              paperData: { title: paper.title, authors: paper.authors,
                publication_year: paper.publication_year, id: paper.id },
              sessionData: [userMsg, assistantMsg],
            });
            loadHistory();
          } catch (_) {}
        }
      } else {
        const assistantMsg = {
          id: uid + 1, role: 'assistant', loading: false,
          action:         data.action,
          query:          data.query          || input,
          candidates:     data.candidates     || [],
          recommendation: data.recommendation || null,
          aiNarrative:    data.aiNarrative    || null,
          message:        data.message        || null,
          searchMeta:     data.searchMeta     || null,
        };
        setMessages(prev => prev.map(m => m.id === uid + 1 ? assistantMsg : m));
        if (canPersist()) {
          try {
            await api.post('/auth/history', {
              query: data.query || input, type: 'citation',
              paperData: null,
              sessionData: [userMsg, assistantMsg],
            });
            loadHistory();
          } catch (_) {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === uid + 1
          ? { ...m, loading: false, error: err.response?.data?.error || 'Error al buscar el artículo' }
          : m
      ));
    } finally { setExtracting(false); }
  }, [canPersist, generateCitations, loadHistory]);

  const handleChooseCandidate = useCallback(async (candidate, messageId) => {
    setExtracting(true);
    try {
      const { data }  = await api.post('/papers/from-candidate', { candidate });
      const paper     = data.paper;
      const citations = await generateCitations(paper.id);
      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === messageId
            ? { ...m, candidates: undefined, action: undefined,
                recommendation: undefined, aiNarrative: undefined,
                message: undefined, paper, citations }
            : m
        );
        if (canPersist()) {
          const idx  = updated.findIndex(m => m.id === messageId);
          const pair = idx > 0 ? [updated[idx - 1], updated[idx]] : [updated[idx]];
          api.post('/auth/history', {
            query: paper.title, type: 'citation',
            paperData: { title: paper.title, authors: paper.authors,
              publication_year: paper.publication_year, id: paper.id },
            sessionData: pair,
          }).then(() => loadHistory()).catch(() => {});
        }
        return updated;
      });
    } catch (err) {
      notify.error('Error al cargar', err.response?.data?.error || 'No se pudo cargar el artículo');
    } finally { setExtracting(false); }
  }, [canPersist, generateCitations, loadHistory]);

  const handleUploadPDF = useCallback(async (file) => {
    const isImage = file.type.startsWith('image/');
    const uid = Date.now();
    setMessages(prev => [
      ...prev,
      { id: uid,     role: 'user',      content: file.name, isPdf: true },
      { id: uid + 1, role: 'assistant', loading: true },
    ]);
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append(isImage ? 'image' : 'pdf', file);
      const { data } = await api.post(
        isImage ? '/papers/upload-image' : '/papers/upload-pdf', fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const { paper, warning } = data;
      if (warning) notify.warning('Aviso', warning);
      const citations = await generateCitations(paper.id);
      setMessages(prev => prev.map(m =>
        m.id === uid + 1 ? { ...m, loading: false, paper, citations } : m
      ));
      if (canPersist() && paper) {
        try {
          await api.post('/auth/history', {
            query: paper.title || file.name, type: 'pdf',
            paperData: { title: paper.title, authors: paper.authors,
              publication_year: paper.publication_year, id: paper.id },
          });
          loadHistory();
        } catch (_) {}
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === uid + 1
          ? { ...m, loading: false, error: err.response?.data?.error ||
              (isImage ? 'Error al procesar la imagen' : 'Error al procesar el PDF') }
          : m
      ));
    } finally { setExtracting(false); }
  }, [canPersist, generateCitations, loadHistory]);

  const handleSelectPaper = useCallback(async (paper) => {
    const uid = Date.now();
    setMessages(prev => [
      ...prev,
      { id: uid,     role: 'user',      content: paper.title },
      { id: uid + 1, role: 'assistant', loading: true },
    ]);
    setExtracting(true);
    try {
      const citations = await generateCitations(paper.id);
      setMessages(prev => prev.map(m =>
        m.id === uid + 1 ? { ...m, loading: false, paper, citations } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === uid + 1 ? { ...m, loading: false, error: 'Error al generar citaciones' } : m
      ));
    } finally { setExtracting(false); }
  }, [generateCitations]);

  // Cita una obra/candidato externo (ej. desde el descubrimiento de autores)
  const handleCiteCandidate = useCallback(async (candidate) => {
    if (!candidate?.title) return;
    const uid = Date.now();
    const userMsg = { id: uid, role: 'user', content: candidate.title };
    setMessages(prev => [
      ...prev,
      userMsg,
      { id: uid + 1, role: 'assistant', loading: true,
        loadingText: 'Generando cita…' },
    ]);
    setExtracting(true);
    try {
      const { data }  = await api.post('/papers/from-candidate', { candidate });
      const paper     = data.paper;
      const citations = await generateCitations(paper.id);
      const assistantMsg = { id: uid + 1, role: 'assistant', loading: false, paper, citations };
      setMessages(prev => prev.map(m => m.id === uid + 1 ? assistantMsg : m));
      if (canPersist() && paper) {
        try {
          await api.post('/auth/history', {
            query: paper.title, type: 'citation',
            paperData: { title: paper.title, authors: paper.authors,
              publication_year: paper.publication_year, id: paper.id },
            sessionData: [userMsg, assistantMsg],
          });
          loadHistory();
        } catch (_) {}
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === uid + 1
          ? { ...m, loading: false, error: err.response?.data?.error || 'No se pudo generar la cita' }
          : m
      ));
    } finally { setExtracting(false); }
  }, [canPersist, generateCitations, loadHistory]);

  const handleNewChat = useCallback(() => setMessages([]), []);

  const handleHistorySearch = useCallback((item) => {
    if (item?.session_data?.length) {
      setMessages(item.session_data);
    } else {
      handleExtract(item?.search_query || item);
    }
  }, [handleExtract]);

  return {
    messages, setMessages,
    extracting,
    incognito, setIncognito,
    generateCitations,
    handleExtract, handleChooseCandidate, handleUploadPDF, handleSelectPaper,
    handleCiteCandidate,
    handleNewChat, handleHistorySearch,
  };
}
