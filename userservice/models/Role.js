import supabase from '../config/database.js';

export class Role {
  static async findByName(name) {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getAll() {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) throw error;
    return data;
  }

  static async assignToUser(userId, roleId) {
    const { data, error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role_id: roleId }])
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async removeFromUser(userId, roleId) {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);

    if (error) throw error;
    return true;
  }

  static async getUserRoles(userId) {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map(item => item.roles) || [];
  }

  static async hasRole(userId, roleName) {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data?.some(item => item.roles.name === roleName) || false;
  }
}

export default Role;
