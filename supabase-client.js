// Cliente de Supabase — inicializado después de que config.js cargue
let supabase = null;

function initSupabase() {
  if (CONFIG.SUPABASE_URL === "TU_SUPABASE_URL") return false;
  supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return true;
}

const SupaAuth = {
  async getUser() {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data;
  },

  async register(email, password, username) {
    // Verificar username único
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (existing) throw new Error("Ese nombre de usuario ya está en uso");

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({ id: data.user.id, username });
    if (profileError) throw new Error(profileError.message);

    return data;
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("Email o contraseña incorrectos");
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  onAuthChange(callback) {
    if (!supabase) return;
    supabase.auth.onAuthStateChange(callback);
  },
};
