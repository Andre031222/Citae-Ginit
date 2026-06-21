const Collection = require('../models/Collection');
const User       = require('../models/User');

class PublicController {

  async getCollection(req, res, next) {
    try {
      const collection = await Collection.findBySlug(req.params.slug);
      if (!collection) {
        return res.status(404).json({ error: 'Colección no encontrada o no es pública' });
      }
      const papers = await Collection.papersOf(collection.id);
      res.json({
        collection: {
          name:        collection.name,
          description: collection.description,
          color:       collection.color,
          slug:        collection.public_slug,
          created_at:  collection.created_at,
        },
        owner: {
          username:  collection.username,
          full_name: collection.full_name,
          profile:   collection.public_enabled ? collection.username : null,
        },
        papers,
        total: papers.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await User.findByUsername(req.params.username);
      if (!user || !user.public_enabled) {
        return res.status(404).json({ error: 'Perfil no encontrado o no es público' });
      }

      const [collections, stats] = await Promise.all([
        Collection.publicByUser(user.username),
        Collection.profileStats(user.username),
      ]);

      res.json({
        profile: {
          username:  user.username,
          full_name: user.full_name,
          bio:       user.bio || null,
          joined:    user.created_at,
        },
        stats,
        collections,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PublicController();
