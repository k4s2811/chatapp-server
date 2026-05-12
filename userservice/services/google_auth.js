import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ENV_VARS } from "../config/envVars.js";


passport.use(
  new GoogleStrategy(
    {
      clientID: ENV_VARS.OAUTH.GOOGLE_CLIENT_ID,
      clientSecret: ENV_VARS.OAUTH.GOOGLE_CLIENT_SECRET,
      callbackURL: '/chat/user/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        done(null, profile);
      } catch (err) {
        done(err, null);
      }
    }
  )
);
