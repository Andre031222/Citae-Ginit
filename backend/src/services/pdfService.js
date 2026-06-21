const pdf = require('pdf-parse');
const axios = require('axios');

class PDFService {
  constructor() {
    this.crossrefBaseUrl = 'https://api.crossref.org/works';
  }

  async extractFromPDF(pdfBuffer) {
    try {
      console.log('Iniciando extracción de PDF...');

      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('El archivo PDF está vacío o corrupto');
      }

      let data;
      try {
        data = await pdf(pdfBuffer, {
          max: 50, // Limitar páginas para evitar timeout
          version: 'v2.0.550'
        });
      } catch (pdfError) {
        console.error('Error al parsear PDF:', pdfError);
        // Reintento con opciones por defecto antes de rendirse
        try {
          data = await pdf(pdfBuffer);
        } catch (secondError) {
          console.error('Segundo intento falló:', secondError);
          return {
            title: 'Documento PDF - No se pudo extraer texto',
            authors: '', abstract: '', full_text: '',
            doi: '', journal: '',
            publication_year: new Date().getFullYear(),
            keywords: [], pages: 0,
            success: false, partial: true,
            error: secondError.message, document_type: 'article',
          };
        }
      }
      
      if (!data) {
        throw new Error('No se pudo leer el archivo PDF');
      }

      console.log(`PDF procesado: ${data.numpages || 0} páginas, ${data.text?.length || 0} caracteres`);

      const hasText = data.text && data.text.trim().length > 0;

      const metadata = {
        title: '',
        authors: '',
        abstract: '',
        full_text: hasText ? data.text : '',
        doi: '',
        journal: '',
        publication_year: null,
        keywords: [],
        pages: data.numpages || 0,
        raw_info: data.info || {},
        has_text: hasText
      };

      if (hasText) {
        metadata.title = this.extractTitle(data.text, data.info) || '';
        metadata.authors = this.extractAuthors(data.text) || '';
        metadata.abstract = this.extractAbstract(data.text) || '';
        metadata.doi = this.extractDOI(data.text) || '';
        metadata.journal = this.extractJournal(data.text) || '';
        metadata.publication_year = this.extractYear(data.text, data.info);
        metadata.keywords = this.extractKeywords(data.text) || [];
      } else {
        // Sin texto extraíble: caer a la metadata embebida del PDF
        console.log('PDF sin texto extraíble, usando solo metadata');
        metadata.title = data.info?.Title || data.info?.Subject || 'Documento PDF sin título';
        metadata.authors = data.info?.Author || data.info?.Creator || '';

        if (data.info?.CreationDate) {
          const year = this.extractYear(data.info.CreationDate);
          if (year) metadata.publication_year = year;
        }
      }

      // Con DOI enriquecemos vía CrossRef, rellenando solo los campos vacíos
      if (metadata.doi) {
        console.log('DOI encontrado:', metadata.doi);
        try {
          const crossrefData = await this.fetchFromCrossRef(metadata.doi);
          metadata.title = metadata.title || crossrefData.title;
          metadata.authors = metadata.authors || crossrefData.authors;
          metadata.journal = metadata.journal || crossrefData.journal;
          metadata.publication_year = metadata.publication_year || crossrefData.publication_year;
          metadata.volume = crossrefData.volume;
          metadata.issue = crossrefData.issue;
          metadata.publisher = crossrefData.publisher;
          metadata.url = crossrefData.url;
          metadata.crossref_enriched = true;
        } catch (crossrefError) {
          console.log('No se pudo obtener datos adicionales de CrossRef:', crossrefError.message);
        }
      }

      if (!metadata.title || metadata.title.trim() === '') {
        metadata.title = 'Documento PDF - ' + new Date().toLocaleDateString();
      }

      const cleanedMetadata = this.cleanMetadata(metadata);
      cleanedMetadata.extraction_method = hasText ? 'text' : 'metadata_only';
      
      return cleanedMetadata;
    } catch (error) {
      console.error('Error extracting PDF:', error);

      // Devolver datos mínimos en caso de error para que el historial funcione
      return {
        title: 'Error al procesar PDF - ' + (error.message || 'Error desconocido'),
        authors: '', abstract: '', full_text: '',
        doi: '', journal: '',
        publication_year: new Date().getFullYear(),
        keywords: [], pages: 0,
        success: false, partial: true,
        error: error.message, document_type: 'article',
      };
    }
  }

  // Extraer metadatos desde texto plano (p.ej. texto OCR de una imagen).
  // Reutiliza los mismos helpers que extractFromPDF y el enriquecimiento CrossRef.
  async extractFromText(text) {
    const hasText = text && text.trim().length > 0;

    const metadata = {
      title: '',
      authors: '',
      abstract: '',
      full_text: hasText ? text : '',
      doi: '',
      journal: '',
      publication_year: null,
      keywords: [],
      pages: 0,
      raw_info: {},
      has_text: hasText,
    };

    if (hasText) {
      metadata.title = this.extractTitle(text, null) || '';
      metadata.authors = this.extractAuthors(text) || '';
      metadata.abstract = this.extractAbstract(text) || '';
      metadata.doi = this.extractDOI(text) || '';
      metadata.journal = this.extractJournal(text) || '';
      metadata.publication_year = this.extractYear(text, null);
      metadata.keywords = this.extractKeywords(text) || [];
    }

    if (metadata.doi) {
      console.log('DOI encontrado en texto OCR:', metadata.doi);
      try {
        const crossrefData = await this.fetchFromCrossRef(metadata.doi);
        metadata.title = metadata.title || crossrefData.title;
        metadata.authors = metadata.authors || crossrefData.authors;
        metadata.journal = metadata.journal || crossrefData.journal;
        metadata.publication_year = metadata.publication_year || crossrefData.publication_year;
        metadata.volume = crossrefData.volume;
        metadata.issue = crossrefData.issue;
        metadata.publisher = crossrefData.publisher;
        metadata.url = crossrefData.url;
        metadata.crossref_enriched = true;
      } catch (crossrefError) {
        console.log('No se pudo obtener datos adicionales de CrossRef:', crossrefError.message);
      }
    }

    if (!metadata.title || metadata.title.trim() === '') {
      metadata.title = 'Documento escaneado - ' + new Date().toLocaleDateString();
      metadata.partial = true;
    }

    const cleanedMetadata = this.cleanMetadata(metadata);
    cleanedMetadata.extraction_method = 'ocr';
    return cleanedMetadata;
  }

  extractTitle(text, info) {
    if (info && info.Title) {
      return info.Title.trim();
    }

    const lines = text.split('\n').filter(line => line.trim().length > 0);

    // Heurística: el título suele estar en las primeras líneas y ser más largo
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      // Título probable: más de 10 caracteres, no todo en mayúsculas, no es autor
      if (line.length > 10 && line.length < 200 &&
          !this.isAllCaps(line) && 
          !this.looksLikeAuthor(line) &&
          !this.looksLikeJournal(line)) {
        return line;
      }
    }

    return '';
  }

  extractAuthors(text) {
    const lines = text.split('\n').slice(0, 50); // Buscar en las primeras 50 líneas
    const authorPatterns = [
      /^([A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*(?:[A-Z][a-z]+)?(?:\s*,\s*)?)+$/,
      /^by\s+(.+)$/i,
      /^authors?:\s*(.+)$/i
    ];

    const authors = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (this.looksLikeAuthor(trimmed)) {
        const parts = trimmed.split(/(?:,\s*(?:and\s+)?|\s+and\s+)/i);
        for (const part of parts) {
          const cleaned = part.trim();
          if (cleaned && this.isValidAuthorName(cleaned)) {
            authors.push(cleaned);
          }
        }
      }

      for (const pattern of authorPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const authorList = match[1].split(/[,;&]/);
          for (const author of authorList) {
            const cleaned = author.trim();
            if (cleaned && this.isValidAuthorName(cleaned)) {
              authors.push(cleaned);
            }
          }
        }
      }
    }

    const uniqueAuthors = [...new Set(authors)];
    return uniqueAuthors.slice(0, 10).join(', '); // Máximo 10 autores
  }

  extractAbstract(text) {
    const abstractRegex = /(?:abstract|resumen|summary)\s*:?\s*\n+([\s\S]+?)(?:\n\s*(?:keywords|introduction|1\.|introduction|chapter|section|acknowledgment|resumen|palabras clave))/i;
    const match = text.match(abstractRegex);

    if (match) {
      const abstract = match[1].trim()
        .replace(/\s+/g, ' ')
        .substring(0, 2000); // Limitar a 2000 caracteres
      return abstract;
    }

    return '';
  }

  extractDOI(text) {
    const doiPatterns = [
      /10\.\d{4,}\/[-._;()\/:A-Za-z0-9]+/g,
      /doi\.org\/10\.\d{4,}\/[-._;()\/:A-Za-z0-9]+/g,
      /DOI:?\s*(10\.\d{4,}\/[-._;()\/:A-Za-z0-9]+)/gi
    ];

    for (const pattern of doiPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        let doi = matches[0];
        doi = doi.replace(/doi\.org\//i, '');
        doi = doi.replace(/DOI:?\s*/i, '');
        doi = doi.trim();

        if (/^10\.\d{4,}\/[-._;()\/:A-Za-z0-9]+$/.test(doi)) {
          return doi;
        }
      }
    }

    return '';
  }

  extractJournal(text) {
    const lines = text.split('\n').slice(0, 100);
    const journalPatterns = [
      /(?:journal|revista):\s*(.+)/i,
      /published\s+in\s+(.+)/i,
      /(?:proceedings|conference|symposium)\s+(?:of|on)\s+(.+)/i
    ];

    for (const line of lines) {
      const trimmed = line.trim();

      for (const pattern of journalPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const journal = match[1].trim();
          if (journal.length < 200) {
            return journal;
          }
        }
      }

      if (this.looksLikeJournal(trimmed)) {
        return trimmed;
      }
    }

    return '';
  }

  extractYear(text, info) {
    if (info && info.CreationDate) {
      const yearMatch = info.CreationDate.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 1900 && year <= new Date().getFullYear()) {
          return year;
        }
      }
    }

    const yearRegex = /(?:published|año|year|fecha|date)[:\s]+.*?(\d{4})|(?:©|\(c\)|copyright)\s*(\d{4})|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi;
    const matches = text.match(yearRegex);
    
    if (matches) {
      for (const match of matches) {
        const yearMatch = match.match(/(\d{4})/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year >= 1900 && year <= new Date().getFullYear()) {
            return year;
          }
        }
      }
    }

    const lines = text.split('\n').slice(0, 50);
    for (const line of lines) {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[0]);
        if (year >= 1900 && year <= new Date().getFullYear()) {
          return year;
        }
      }
    }

    return null;
  }

  extractKeywords(text) {
    const keywordsRegex = /(?:keywords|palabras clave|key words|tags)\s*:?\s*([^\n]+)/i;
    const match = text.match(keywordsRegex);
    
    if (match) {
      const keywords = match[1]
        .split(/[,;]/)
        .map(k => k.trim())
        .filter(k => k.length > 0 && k.length < 50);
      return keywords.slice(0, 10); // Máximo 10 keywords
    }

    return [];
  }

  async fetchFromCrossRef(doi) {
    try {
      const response = await axios.get(`${this.crossrefBaseUrl}/${doi}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'CITAE/1.0 (mailto:support@citae.app)'
        }
      });

      const data = response.data.message;

      return {
        title: data.title ? data.title[0] : '',
        authors: this.formatCrossRefAuthors(data.author),
        publication_year: data.published?.['date-parts']?.[0]?.[0] || null,
        journal: data['container-title'] ? data['container-title'][0] : '',
        volume: data.volume || '',
        issue: data.issue || '',
        pages: data.page || '',
        doi: data.DOI,
        url: data.URL || `https://doi.org/${data.DOI}`,
        publisher: data.publisher || ''
      };
    } catch (error) {
      console.error('CrossRef API error:', error.message);
      throw error;
    }
  }

  formatCrossRefAuthors(authorArray) {
    if (!authorArray || !Array.isArray(authorArray)) return '';

    return authorArray.map(author => {
      const given = author.given || '';
      const family = author.family || '';
      return `${given} ${family}`.trim();
    }).filter(Boolean).join(', ');
  }

  isAllCaps(text) {
    return text === text.toUpperCase() && /[A-Z]/.test(text);
  }

  looksLikeAuthor(text) {
    const authorPatterns = [
      /^[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*\s+[A-Z][a-z]+$/,
      /^[A-Z][a-z]+,\s+[A-Z]\.?\s*(?:[A-Z]\.?\s*)*$/,
      /^[A-Z]\.\s*(?:[A-Z]\.\s*)*[A-Z][a-z]+$/
    ];

    return authorPatterns.some(pattern => pattern.test(text)) &&
           text.length < 100 &&
           !text.includes('University') &&
           !text.includes('Department');
  }

  isValidAuthorName(name) {
    return name.length >= 3 && 
           name.length <= 50 && 
           /[a-zA-Z]/.test(name) &&
           !name.includes('@') &&
           !name.includes('http');
  }

  looksLikeJournal(text) {
    const journalKeywords = ['journal', 'review', 'letters', 'proceedings', 'transactions', 'magazine', 'quarterly', 'annual'];
    const lower = text.toLowerCase();
    return journalKeywords.some(keyword => lower.includes(keyword)) && 
           text.length > 5 && 
           text.length < 150;
  }

  cleanMetadata(metadata) {
    const cleaned = {
      title: (metadata.title || '').substring(0, 500).trim(),
      authors: (metadata.authors || '').substring(0, 1000).trim(),
      abstract: (metadata.abstract || '').substring(0, 2000).trim(),
      full_text: (metadata.full_text || '').trim(),
      doi: (metadata.doi || '').trim(),
      journal: (metadata.journal || '').substring(0, 200).trim(),
      publication_year: metadata.publication_year || null,
      keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
      volume: metadata.volume || '',
      issue: metadata.issue || '',
      pages: metadata.pages || '',
      publisher: metadata.publisher || '',
      url: metadata.url || '',
      document_type: metadata.document_type || 'article',
      success: metadata.success !== false,
      partial: metadata.partial || false,
      error: metadata.error || null,
      extraction_method: metadata.extraction_method || 'unknown'
    };

    if (!cleaned.title || cleaned.title.trim() === '') {
      cleaned.title = 'Documento sin título - ' + new Date().toLocaleDateString();
      cleaned.partial = true;
    }

    if (!cleaned.authors || cleaned.authors.trim() === '') {
      cleaned.authors = 'Autor no identificado';
      cleaned.partial = true;
    }

    return cleaned;
  }
}

module.exports = new PDFService();