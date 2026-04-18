import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../config/db.js';
import { ENV_VARS } from '../config/envVars.js';

passport.use(new GoogleStrategy({
  clientID: ENV_VARS.OAUTH.GOOGLE_CLIENT_ID,
  clientSecret: ENV_VARS.OAUTH.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;

    // Find existing user or create new one
    let result = await query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [profile.id, email]
    );

    let user = result.rows[0];
    if (!user) {
      // New user — insert without password
      const insert = await query(
        `INSERT INTO users (email, name, google_id, is_verified, is_active)
         VALUES ($1, $2, $3, true, true)
         RETURNING id, email, name, role, is_verified`,
        [email, profile.displayName, profile.id]
      );
      user = insert.rows[0];
    } else if (!user.google_id) {
      // Existing email user — link their Google account
      await query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, user.id]);
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

export default passport;