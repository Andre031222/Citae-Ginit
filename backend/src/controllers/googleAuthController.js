const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
const CLIENT_URL    = process.env.CLIENT_URL || 'http://localhost:3000';

function makeOAuthClient() {
  return new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

function redirectToGoogle(req, res) {
  if (!CLIENT_ID) {
    return res.status(503).json({ error: 'Google OAuth no configurado' });
  }
  // state firmado con JWT para prevenir CSRF (autoverificable, sin estado en servidor)
  const state = jwt.sign({ nonce: crypto.randomBytes(8).toString('hex') }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const client = makeOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
    state,
  });
  res.redirect(url);
}

async function googleCallback(req, res) {
  const { code, error, state } = req.query;

  if (error || !code) {
    return res.redirect(`${CLIENT_URL}/login?error=google_cancelled`);
  }

  // Validar state anti-CSRF
  if (!state) {
    return res.redirect(`${CLIENT_URL}/login?error=invalid_state`);
  }
  try {
    jwt.verify(state, process.env.JWT_SECRET);
  } catch {
    return res.redirect(`${CLIENT_URL}/login?error=invalid_state`);
  }

  try {
    const client = makeOAuthClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.redirect(`${CLIENT_URL}/login?error=no_email`);
    }

    const user = await User.findOrCreateGoogle({ googleId, email, name, picture });

    if (!user.is_active) {
      return res.redirect(`${CLIENT_URL}/login?error=account_disabled`);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, timestamp: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await User.saveSession(user.id, token, '7d');

    // Redirigir al frontend con token en fragment (#) — no viaja a servidores en Referer/logs
    const userPayload = encodeURIComponent(JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role: user.role || 'user',   // sin esto el botón de Admin no aparece tras login con Google
    }));
    res.redirect(`${CLIENT_URL}/app#token=${token}&user=${userPayload}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    res.redirect(`${CLIENT_URL}/login?error=google_failed`);
  }
}

module.exports = { redirectToGoogle, googleCallback };
