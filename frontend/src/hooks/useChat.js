import { useSearch }      from './useSearch';
import { useBibliography } from './useBibliography';

export function useChat({ user, loadHistory, loadFavorites }) {
  const search = useSearch({ user, loadHistory });
  const biblio = useBibliography({ loadFavorites, setMessages: search.setMessages });

  return {
    messages:    search.messages,
    setMessages: search.setMessages,
    extracting:  search.extracting,
    incognito:    search.incognito,
    setIncognito: search.setIncognito,

    handleExtract:         search.handleExtract,
    handleChooseCandidate: search.handleChooseCandidate,
    handleUploadPDF:       search.handleUploadPDF,
    handleSelectPaper:     search.handleSelectPaper,
    handleCiteCandidate:   search.handleCiteCandidate,
    handleNewChat:         search.handleNewChat,
    handleHistorySearch:   search.handleHistorySearch,

    biblioItems:    biblio.biblioItems,
    setBiblioItems: biblio.setBiblioItems,
    handleFavorite:  biblio.handleFavorite,
    handleExport:    biblio.handleExport,
    handleMetaUpdate: biblio.handleMetaUpdate,
    handleAddToBiblio: biblio.handleAddToBiblio,
  };
}
