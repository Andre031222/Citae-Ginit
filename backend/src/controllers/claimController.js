const {
  searchCrossRefMulti,
  searchSemanticScholarMulti,
  searchOpenAlex,
  searchArxiv,
} = require('../services/searchSources');
const { dedupeAndMerge }                    = require('../services/candidateMatcher');
const { classifyEvidence, comparePapers: comparePapersAI } = require('../services/aiComparator');
const Paper                                 = require('../models/Paper');

class ClaimController {

  async radar(req, res, next) {
    try {
      const { claim } = req.body;
      if (!claim || !String(claim).trim()) {
        return res.status(400).json({ error: 'La afirmación es requerida' });
      }

      const q = String(claim).trim().slice(0, 300);

      const settled = await Promise.allSettled([
        searchCrossRefMulti(q),
        searchSemanticScholarMulti(q),
        searchOpenAlex(q),
        searchArxiv(q),
      ]);

      const raw    = settled.flatMap(r => r.status === 'fulfilled' ? (r.value || []) : []);
      const papers = dedupeAndMerge(raw).slice(0, 12);

      if (!papers.length) {
        return res.json({ claim: q, papers: [], stats: { apoya: 0, contradice: 0, mixto: 0, neutro: 0 }, available: true });
      }

      const classification = await classifyEvidence(q, papers);

      if (!classification.available) {
        const tagged = papers.map(p => ({ ...p, verdict: 'NEUTRO', evidence: '' }));
        return res.json({ claim: q, papers: tagged, stats: { apoya: 0, contradice: 0, mixto: 0, neutro: tagged.length }, available: false });
      }

      const verdictMap = {};
      for (const v of classification.verdicts) {
        verdictMap[v.idx] = { verdict: v.verdict, evidence: v.evidence };
      }

      const tagged = papers.map((p, i) => ({
        ...p,
        verdict:  verdictMap[i]?.verdict  || 'NEUTRO',
        evidence: verdictMap[i]?.evidence || '',
      }));

      const stats = { apoya: 0, contradice: 0, mixto: 0, neutro: 0 };
      tagged.forEach(p => {
        const key = p.verdict.toLowerCase();
        if (key in stats) stats[key]++;
        else stats.neutro++;
      });

      res.json({ claim: q, papers: tagged, stats, available: true });
    } catch (error) {
      next(error);
    }
  }

  async compare(req, res, next) {
    try {
      const { paperIds } = req.body;
      if (!Array.isArray(paperIds) || paperIds.length < 2 || paperIds.length > 4) {
        return res.status(400).json({ error: 'Se necesitan entre 2 y 4 papers para comparar' });
      }

      const found = (await Promise.all(paperIds.map(id => Paper.findById(id)))).filter(Boolean);

      if (found.length < 2) {
        return res.status(404).json({ error: 'No se encontraron suficientes papers' });
      }

      const result = await comparePapersAI(found);

      if (!result.available) {
        return res.json({ available: false, papers: found, dimensions: [] });
      }

      res.json({ available: true, papers: found, dimensions: result.dimensions });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ClaimController();
