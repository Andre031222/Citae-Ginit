const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

class ScraperService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async extractFromDOI(doi) {
    try {
      const response = await axios.get(`https://api.crossref.org/works/${doi}`);
      const data = response.data.message;

      return {
        title: data.title ? data.title[0] : '',
        authors: this.formatAuthors(data.author),
        publication_year: data.published?.['date-parts']?.[0]?.[0] || null,
        journal: data['container-title'] ? data['container-title'][0] : '',
        volume: data.volume || '',
        issue: data.issue || '',
        pages: data.page || '',
        doi: data.DOI,
        url: data.URL || '',
        publisher: data.publisher || '',
        abstract: data.abstract || ''
      };
    } catch (error) {
      throw new Error(`Failed to fetch DOI data: ${error.message}`);
    }
  }

  async extractFromGoogleScholar(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      const content = await page.content();
      const $ = cheerio.load(content);

      const title = $('.gsc_oci_title').text() || $('.gs_rt').first().text();
      const authors = $('.gsc_oci_value').first().text() || $('.gs_a').first().text().split('-')[0];
      const journal = $('.gsc_oci_value').eq(1).text() || '';
      const year = this.extractYear($('.gsc_oci_value').eq(2).text() || $('.gs_a').first().text());
      
      return {
        title: title.trim(),
        authors: authors.trim(),
        publication_year: year,
        journal: journal.trim(),
        url: url
      };
    } catch (error) {
      throw new Error(`Failed to scrape Google Scholar: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async extractFromPubMed(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const title = $('.heading-title').text().trim();
      const authors = [];
      $('.authors-list .authors-list-item').each((i, el) => {
        authors.push($(el).text().trim());
      });

      const journal = $('.journal-title').text().trim();
      const year = $('.cit').text().match(/\d{4}/)?.[0];
      const doi = $('a.id-link').filter((i, el) => $(el).text().includes('doi')).attr('href');
      
      return {
        title,
        authors: authors.join(', '),
        publication_year: parseInt(year) || null,
        journal,
        doi: doi ? doi.replace('https://doi.org/', '') : '',
        url
      };
    } catch (error) {
      throw new Error(`Failed to scrape PubMed: ${error.message}`);
    }
  }

  async extractFromGenericPage(url) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      const content = await page.content();
      const $ = cheerio.load(content);

      const title = $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="citation_title"]').attr('content') ||
                   $('h1').first().text().trim();

      const authors = $('meta[name="citation_author"]').map((i, el) => $(el).attr('content')).get().join(', ') ||
                     $('meta[name="author"]').attr('content') || '';

      const year = $('meta[name="citation_publication_date"]').attr('content')?.split('/')[0] ||
                  $('meta[name="citation_year"]').attr('content');

      const journal = $('meta[name="citation_journal_title"]').attr('content') || '';
      const doi = $('meta[name="citation_doi"]').attr('content') || '';
      
      return {
        title: title || 'Título no encontrado',
        authors: authors || 'Autor desconocido',
        publication_year: year ? parseInt(year) : null,
        journal,
        doi,
        url
      };
    } catch (error) {
      throw new Error(`Failed to scrape generic page: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  formatAuthors(authorArray) {
    if (!authorArray || !Array.isArray(authorArray)) return '';
    return authorArray.map(author => {
      const given = author.given || '';
      const family = author.family || '';
      return `${given} ${family}`.trim();
    }).join(', ');
  }

  extractYear(text) {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : null;
  }

  async extract(input) {
    try {
      if (input.includes('10.') && (input.includes('/') || input.includes('%2F'))) {
        const doi = input.match(/10\.\S+/)?.[0];
        if (doi) {
          return await this.extractFromDOI(doi);
        }
      }

      if (input.startsWith('http')) {
        if (input.includes('scholar.google')) {
          return await this.extractFromGoogleScholar(input);
        } else if (input.includes('pubmed.ncbi')) {
          return await this.extractFromPubMed(input);
        } else {
          return await this.extractFromGenericPage(input);
        }
      }

      throw new Error('Por favor proporciona un DOI o URL válidos');
    } catch (error) {
      console.error('Extraction error:', error);
      throw error;
    }
  }
}

module.exports = new ScraperService();