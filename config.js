const CONFIG = {
  // ── API Football (datos del torneo) ──
  COMPETITION_ID: 2000,

  // ── Supabase (prode) ──
  // Reemplazá con tus valores de supabase.com → Project Settings → API
  SUPABASE_URL: "https://ghrjchfslrvsbqynpeiv.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_5L_a2c-AfGfvTo3EYiAX3w_L6DtbS3h",

  // ── Código del grupo ──
  // Compartilo con tus amigos para que puedan registrarse
  GROUP_CODE: "MUNDIAL2026",

  // ── Fecha de inicio del Mundial ──
  // Los bonus y predicciones se cierran automáticamente en esta fecha
  WORLD_CUP_START: new Date("2026-06-11T23:00:00Z"), // 11 jun 19:00 EST

  // ── Sistema de puntos ──
  POINTS: {
    CORRECT_WINNER: 1,    // Acertaste ganador (o empate)
    EXACT_SCORE: 3,       // Acertaste el marcador exacto
    BONUS_CHAMPION: 5,    // Campeón correcto
    BONUS_RUNNER_UP: 5,   // Subcampeón correcto
    BONUS_TOP_SCORER: 5,  // Goleador correcto
    BONUS_BEST_PLAYER: 5, // Mejor jugador correcto
  },
};
