import supabase from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class RefreshToken {
  static async create(userId, token, expiresAt) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data, error } = await supabase
      .from('refresh_tokens')
      .insert([
        {
          user_id: userId,
          token: tokenHash,
          expires_at: expiresAt
        }
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findByToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', tokenHash)
      .is('revoked_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async revoke(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { error } = await supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token', tokenHash);

    if (error) throw error;
    return true;
  }

  static async revokeAllForUser(userId) {
    const { error } = await supabase
      .from('refresh_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (error) throw error;
    return true;
  }

  static async deleteExpired() {
    const { error } = await supabase
      .from('refresh_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    return true;
  }
}

export class EmailVerificationToken {
  static async create(userId, expiresInHours = 24) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('email_verification_tokens')
      .insert([
        {
          user_id: userId,
          token,
          expires_at: expiresAt.toISOString()
        }
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    return { ...data, token };
  }

  static async findByToken(token) {
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async deleteByUserId(userId) {
    const { error } = await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  static async deleteExpired() {
    const { error } = await supabase
      .from('email_verification_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    return true;
  }
}

export class PasswordResetToken {
  static async create(userId, expiresInHours = 1) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('password_reset_tokens')
      .insert([
        {
          user_id: userId,
          token,
          expires_at: expiresAt.toISOString()
        }
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    return { ...data, token };
  }

  static async findByToken(token) {
    const { data, error } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async markAsUsed(token) {
    const { error } = await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (error) throw error;
    return true;
  }

  static async deleteByUserId(userId) {
    const { error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  static async deleteExpired() {
    const { error } = await supabase
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    return true;
  }
}

export default { RefreshToken, EmailVerificationToken, PasswordResetToken };
