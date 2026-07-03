const UserApiKey = require('../models/UserApiKey');
const { validateKey } = require('../services/groqClient');

// GET /api/keys — lista las claves del usuario (enmascaradas) + proveedores válidos
exports.list = async (req, res, next) => {
  try {
    const keys = await UserApiKey.listByUser(req.user.id);
    res.json({ providers: UserApiKey.providers(), keys });
  } catch (e) { next(e); }
};

// POST /api/keys — añade y valida una clave nueva
exports.add = async (req, res, next) => {
  try {
    const { provider } = req.body;
    const raw = typeof req.body.key === 'string' ? req.body.key.trim() : '';

    if (!UserApiKey.providers().includes(provider)) {
      return res.status(400).json({ error: 'Proveedor no soportado.' });
    }
    if (raw.length < 12) {
      return res.status(400).json({ error: 'La clave no parece valida.' });
    }
    if (await UserApiKey.countByUser(req.user.id) >= UserApiKey.MAX_PER_USER) {
      return res.status(400).json({ error: `Maximo ${UserApiKey.MAX_PER_USER} claves por usuario.` });
    }

    const check = await validateKey({ provider, key: raw });
    if (!check.ok) {
      return res.status(400).json({ error: `Clave rechazada: ${check.reason}` });
    }

    const id = await UserApiKey.create(req.user.id, provider, raw, 'active');
    const keys = await UserApiKey.listByUser(req.user.id);
    res.status(201).json({ id, keys });
  } catch (e) { next(e); }
};

// POST /api/keys/:id/test — revalida una clave y actualiza su estado
exports.test = async (req, res, next) => {
  try {
    const dec = await UserApiKey.getDecrypted(req.user.id, req.params.id);
    if (!dec) return res.status(404).json({ error: 'Clave no encontrada.' });

    const check = await validateKey({ provider: dec.provider, key: dec.key });
    const status = check.ok ? 'active' : 'invalid';
    await UserApiKey.setStatus(dec.id, status, check.ok ? null : check.reason);
    res.json({ ok: check.ok, status, reason: check.reason || null });
  } catch (e) { next(e); }
};

// DELETE /api/keys/:id — elimina una clave
exports.remove = async (req, res, next) => {
  try {
    const ok = await UserApiKey.remove(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Clave no encontrada.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
};
