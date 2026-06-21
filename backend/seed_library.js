require('dotenv').config();
const db = require('./src/config/database');

const PAPERS = [
  {
    title: 'Attention Is All You Need',
    authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin',
    publication_year: 2017,
    journal: 'Advances in Neural Information Processing Systems (NeurIPS)',
    doi: '10.48550/arXiv.1706.03762',
    url: 'https://arxiv.org/abs/1706.03762',
    publisher: 'Curran Associates',
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments show these models to be superior in quality while being more parallelizable and requiring significantly less time to train.',
    collection: 'IA y Aprendizaje Automático',
    tags: ['transformers', 'atención', 'aprendizaje profundo'],
    favorite: true,
  },
  {
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: 'Jacob Devlin, Ming-Wei Chang, Kenton Lee, Kristina Toutanova',
    publication_year: 2019,
    journal: 'Proceedings of NAACL-HLT',
    doi: '10.48550/arXiv.1810.04805',
    url: 'https://arxiv.org/abs/1810.04805',
    publisher: 'Association for Computational Linguistics',
    abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers. BERT obtains new state-of-the-art results on eleven natural language processing tasks.',
    collection: 'IA y Aprendizaje Automático',
    tags: ['nlp', 'transformers', 'modelos de lenguaje'],
    favorite: true,
  },
  {
    title: 'Deep Residual Learning for Image Recognition',
    authors: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun',
    publication_year: 2016,
    journal: 'IEEE Conference on Computer Vision and Pattern Recognition (CVPR)',
    doi: '10.1109/CVPR.2016.90',
    url: 'https://doi.org/10.1109/CVPR.2016.90',
    publisher: 'IEEE',
    abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs. We evaluate residual nets with a depth of up to 152 layers on the ImageNet dataset.',
    collection: 'IA y Aprendizaje Automático',
    tags: ['visión por computadora', 'aprendizaje profundo', 'redes residuales'],
    favorite: false,
  },
  {
    title: 'The PRISMA 2020 statement: an updated guideline for reporting systematic reviews',
    authors: 'Matthew J. Page, Joanne E. McKenzie, Patrick M. Bossuyt, Isabelle Boutron, et al.',
    publication_year: 2021,
    journal: 'BMJ',
    doi: '10.1136/bmj.n71',
    url: 'https://doi.org/10.1136/bmj.n71',
    publisher: 'BMJ Publishing Group',
    abstract: 'The PRISMA 2020 statement provides updated reporting guidance for systematic reviews reflecting advances in methods to identify, select, appraise, and synthesise studies. The statement comprises a 27-item checklist, an expanded checklist that details reporting recommendations for each item, the PRISMA 2020 abstract checklist, and revised flow diagrams for original and updated reviews.',
    collection: 'Metodología de Investigación',
    tags: ['revisión sistemática', 'metodología', 'prisma'],
    favorite: true,
  },
  {
    title: 'Using thematic analysis in psychology',
    authors: 'Virginia Braun, Victoria Clarke',
    publication_year: 2006,
    journal: 'Qualitative Research in Psychology',
    doi: '10.1191/1478088706qp063oa',
    url: 'https://doi.org/10.1191/1478088706qp063oa',
    publisher: 'Taylor & Francis',
    abstract: 'Thematic analysis is a poorly demarcated yet widely used qualitative analytic method within psychology. In this paper we argue that it offers an accessible and theoretically flexible approach to analysing qualitative data. We outline what thematic analysis is, locating it in relation to other qualitative analytic methods, and discuss its theoretical and methodological underpinnings.',
    collection: 'Metodología de Investigación',
    tags: ['análisis temático', 'investigación cualitativa', 'metodología'],
    favorite: false,
  },
];

async function upsertPaper(p) {
  const existing = await db.execute('SELECT id FROM papers WHERE doi = ?', [p.doi]);
  if (existing[0].length) return existing[0][0].id;
  const [res] = await db.execute(
    `INSERT INTO papers (title, authors, publication_year, journal, doi, url, abstract, publisher)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.title, p.authors, p.publication_year, p.journal, p.doi, p.url, p.abstract, p.publisher]
  );
  return res.insertId;
}

async function ensureCollection(userId, name) {
  const existing = await db.execute('SELECT id FROM collections WHERE user_id = ? AND name = ?', [userId, name]);
  if (existing[0].length) return existing[0][0].id;
  const color = name.includes('IA') ? 'blue' : 'green';
  const [res] = await db.execute(
    'INSERT INTO collections (user_id, name, color) VALUES (?, ?, ?)',
    [userId, name, color]
  );
  return res.insertId;
}

async function ensureTag(userId, name) {
  const existing = await db.execute('SELECT id FROM tags WHERE user_id = ? AND name = ?', [userId, name]);
  if (existing[0].length) return existing[0][0].id;
  const [res] = await db.execute('INSERT INTO tags (user_id, name) VALUES (?, ?)', [userId, name]);
  return res.insertId;
}

(async () => {
  const email = process.argv[2] || 'night.fury.oi.ma@gmail.com';
  const users = await db.execute('SELECT id, email FROM users WHERE email = ?', [email]);
  if (!users[0].length) {
    console.error(`No se encontró el usuario ${email}. Pásalo como argumento: node seed_library.js tu@email.com`);
    process.exit(1);
  }
  const userId = users[0][0].id;
  console.log(`Sembrando biblioteca para userId=${userId} (${email})…`);

  for (const p of PAPERS) {
    const paperId = await upsertPaper(p);

    const collectionId = await ensureCollection(userId, p.collection);
    await db.execute(
      'INSERT INTO collection_papers (collection_id, paper_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
      [collectionId, paperId]
    );

    for (const tagName of p.tags) {
      const tagId = await ensureTag(userId, tagName);
      await db.execute(
        'INSERT INTO paper_tags (tag_id, paper_id, user_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
        [tagId, paperId, userId]
      );
    }

    if (p.favorite) {
      await db.execute(
        'INSERT INTO favorites (user_id, paper_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [userId, paperId]
      );
    }

    console.log(`  ✓ ${p.title.slice(0, 50)}…  [${p.collection}] ${p.favorite ? '★' : ''}`);
  }

  console.log('\nBiblioteca sembrada. Recarga /library para verla.');
  process.exit(0);
})().catch(err => {
  console.error('Error sembrando:', err.message);
  process.exit(1);
});
