import supabase from '../config/database.js';

export class User {
  static async create({ email, passwordHash, firstName, lastName }) {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName
        }
      ])
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async verifyEmail(userId) {
    return await this.update(userId, { is_email_verified: true });
  }

  static async updatePassword(userId, passwordHash) {
    return await this.update(userId, { password_hash: passwordHash });
  }

  static async incrementFailedAttempts(userId) {
    const user = await this.findById(userId);
    if (!user) return null;

    const failedAttempts = (user.failed_login_attempts || 0) + 1;
    const updates = { failed_login_attempts: failedAttempts };

    if (failedAttempts >= 5) {
      const lockDuration = 15 * 60 * 1000;
      updates.locked_until = new Date(Date.now() + lockDuration).toISOString();
    }

    return await this.update(userId, updates);
  }

  static async resetFailedAttempts(userId) {
    return await this.update(userId, {
      failed_login_attempts: 0,
      locked_until: null,
      last_login: new Date().toISOString()
    });
  }

  static async isLocked(userId) {
    const user = await this.findById(userId);
    if (!user || !user.locked_until) return false;

    const lockExpired = new Date(user.locked_until) < new Date();
    if (lockExpired) {
      await this.update(userId, { locked_until: null, failed_login_attempts: 0 });
      return false;
    }

    return true;
  }
}

export default User;
