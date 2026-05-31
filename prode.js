// ══════════════════════════════════════════════
//  PRODE — Estado, Auth, Predicciones, Leaderboard
// ══════════════════════════════════════════════

const Prode = {
  user: null,
  profile: null,
  myPredictions: {},       // { matchId: { home_score, away_score } }
  myBonus: null,
  bonusResults: {},
  leaderboardData: [],
  countdownInterval: null,

  // ── INICIALIZACIÓN ──────────────────────────
  async init() {
    if (!initSupabase()) {
      document.querySelectorAll(".supabase-required").forEach(el => {
        el.innerHTML = `<div class="setup-warning">
          ⚙️ Configurá <strong>SUPABASE_URL</strong> y <strong>SUPABASE_ANON_KEY</strong> en <code>config.js</code> para activar el prode.
        </div>`;
      });
      return;
    }

    window.SupaAuth.onAuthChange(async (event, session) => {
      Prode.user = session?.user || null;
      Prode.profile = Prode.user ? await window.SupaAuth.getProfile(Prode.user.id) : null;
      Prode.updateHeaderAuth();
      if (Prode.user) await Prode.loadMyPredictions();
    });

    Prode.user = await window.SupaAuth.getUser();
    if (Prode.user) {
      Prode.profile = await window.SupaAuth.getProfile(Prode.user.id);
      await Prode.loadMyPredictions();
    }

    this.updateHeaderAuth();
    this.startCountdown();
  },

  // ── CUENTA REGRESIVA ────────────────────────
  startCountdown() {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
  },

  updateCountdown() {
    const el = document.getElementById("countdown");
    if (!el) return;

    const now = new Date();
    const diff = CONFIG.WORLD_CUP_START - now;

    if (diff <= 0) {
      el.innerHTML = `<span class="cd-live">🔴 ¡El Mundial ya comenzó!</span>`;
      clearInterval(this.countdownInterval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    el.innerHTML = `
      <span class="cd-label">Comienza en</span>
      <span class="cd-unit"><strong>${days}</strong>d</span>
      <span class="cd-unit"><strong>${hours}</strong>h</span>
      <span class="cd-unit"><strong>${mins}</strong>m</span>
      <span class="cd-unit"><strong>${secs}</strong>s</span>`;
  },

  // ── AUTH UI ─────────────────────────────────
  updateHeaderAuth() {
    const el = document.getElementById("auth-area");
    if (!el) return;

    if (this.user && this.profile) {
      el.innerHTML = `
        <div class="auth-user">
          <span class="auth-username">👤 ${this.profile.username}</span>
          <button class="auth-btn-sm" onclick="Prode.handleLogout()">Salir</button>
        </div>`;
    } else {
      el.innerHTML = `
        <button class="auth-btn" onclick="Prode.showAuthModal('login')">Iniciar sesión</button>
        <button class="auth-btn auth-btn-outline" onclick="Prode.showAuthModal('register')">Registrarse</button>`;
    }
  },

  showAuthModal(tab = "login") {
    const isLogin = tab === "login";
    openModal(`
      <div class="modal-header">
        <div class="auth-tabs">
          <button class="${isLogin ? "auth-tab active" : "auth-tab"}" onclick="Prode.showAuthModal('login')">Iniciar sesión</button>
          <button class="${!isLogin ? "auth-tab active" : "auth-tab"}" onclick="Prode.showAuthModal('register')">Registrarse</button>
        </div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      ${isLogin ? `
        <form id="auth-form" onsubmit="Prode.handleLogin(event)">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="auth-email" placeholder="tu@email.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" id="auth-password" placeholder="••••••••" required>
          </div>
          <div id="auth-error" class="auth-error" style="display:none"></div>
          <button type="submit" class="auth-submit" id="auth-submit-btn">Entrar</button>
        </form>
      ` : `
        <form id="auth-form" onsubmit="Prode.handleRegister(event)">
          <div class="form-group">
            <label>Nombre de usuario <span style="color:var(--text-muted)">(se muestra en el ranking)</span></label>
            <input type="text" id="auth-username" placeholder="ej: Franchu" required maxlength="20">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="auth-email" placeholder="tu@email.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" id="auth-password" placeholder="mínimo 6 caracteres" required minlength="6">
          </div>
          <div class="form-group">
            <label>Código del grupo</label>
            <input type="text" id="auth-code" placeholder="Pedíselo al organizador" required>
          </div>
          <div id="auth-error" class="auth-error" style="display:none"></div>
          <button type="submit" class="auth-submit" id="auth-submit-btn">Unirme al prode</button>
        </form>
      `}
    `);
  },

  async handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById("auth-submit-btn");
    const errEl = document.getElementById("auth-error");
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    btn.textContent = "Entrando...";
    btn.disabled = true;
    errEl.style.display = "none";

    try {
      await window.SupaAuth.login(email, password);

      // Cerrar modal de forma directa
      const overlay = document.getElementById("modal-overlay");
      if (overlay) { overlay.style.display = "none"; }
      document.body.style.overflow = "";

      // Actualizar estado del usuario manualmente
      Prode.user = await window.SupaAuth.getUser();
      if (Prode.user) Prode.profile = await window.SupaAuth.getProfile(Prode.user.id);
      Prode.updateHeaderAuth();
      if (Prode.user) await Prode.loadMyPredictions();

      // Re-renderizar la sección activa si es prode o bonus
      const active = document.querySelector(".section.active");
      if (active?.id === "prode") Prode.renderProdeSection();
      if (active?.id === "bonus") Prode.renderBonusSection();

    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
      btn.textContent = "Entrar";
      btn.disabled = false;
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById("auth-submit-btn");
    const errEl = document.getElementById("auth-error");
    const username = document.getElementById("auth-username").value.trim();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const code = document.getElementById("auth-code").value.trim().toUpperCase();

    if (code !== CONFIG.GROUP_CODE) {
      document.getElementById("auth-error").textContent = "Código de grupo incorrecto";
      document.getElementById("auth-error").style.display = "block";
      return;
    }

    btn.textContent = "Registrando...";
    btn.disabled = true;
    errEl.style.display = "none";

    try {
      await window.SupaAuth.register(email, password, username);
      const overlay = document.getElementById("modal-overlay");
      if (overlay) overlay.style.display = "none";
      document.body.style.overflow = "";
      openModal(`
        <div style="text-align:center;padding:2rem">
          <div style="font-size:3rem;margin-bottom:1rem">🎉</div>
          <h3 style="font-size:1.1rem;margin-bottom:0.5rem">¡Ya estás en el prode!</h3>
          <p style="color:var(--text-muted);font-size:0.85rem">Iniciá sesión con tu email y contraseña.</p>
          <button class="auth-submit" style="margin-top:1.5rem" onclick="Prode.showAuthModal('login')">Iniciar sesión</button>
        </div>`);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = "block";
      btn.textContent = "Unirme al prode";
      btn.disabled = false;
    }
  },

  async handleLogout() {
    await window.SupaAuth.logout();
    Prode.user = null;
    Prode.profile = null;
    Prode.myPredictions = {};
    Prode.myBonus = null;
    Prode.updateHeaderAuth();
    // Re-render sección activa
    const active = document.querySelector(".section.active");
    if (active?.id === "prode") Prode.renderProdeSection();
    if (active?.id === "bonus") Prode.renderBonusSection();
  },

  // ── PREDICCIONES ────────────────────────────
  isLocked(match) {
    return !["SCHEDULED", "TIMED"].includes(match.status);
  },

  isBonusLocked() {
    return new Date() >= CONFIG.WORLD_CUP_START;
  },

  async loadMyPredictions() {
    if (!Prode.user || !window.getSupaClient()) return;
    const sc = window.getSupaClient();

    const { data } = await sc
      .from("predictions")
      .select("*")
      .eq("user_id", Prode.user.id);

    Prode.myPredictions = {};
    (data || []).forEach(p => {
      Prode.myPredictions[p.match_id] = { home: p.home_score, away: p.away_score };
    });

    const { data: bonus } = await sc
      .from("bonus_predictions")
      .select("*")
      .eq("user_id", Prode.user.id)
      .maybeSingle();
    Prode.myBonus = bonus;
  },

  async savePrediction(matchId, homeScore, awayScore, btn) {
    // Si no hay usuario, pedir login
    if (!Prode.user) { Prode.showAuthModal("login"); return; }

    const sc = window.getSupaClient();
    if (!sc) {
      btn.textContent = "Sin conexión DB";
      return;
    }

    const hVal = parseInt(homeScore);
    const aVal = parseInt(awayScore);
    if (isNaN(hVal) || isNaN(aVal)) {
      btn.textContent = "Ingresá un número";
      setTimeout(() => { btn.textContent = btn.dataset.orig || "Guardar"; }, 1500);
      return;
    }

    btn.dataset.orig = btn.textContent;
    btn.textContent = "...";
    btn.disabled = true;

    try {
      const { error } = await sc.from("predictions").upsert({
        user_id: Prode.user.id,
        match_id: Number(matchId),
        home_score: hVal,
        away_score: aVal,
      }, { onConflict: "user_id,match_id" });

      if (error) throw error;

      Prode.myPredictions[matchId] = { home: hVal, away: aVal };
      btn.textContent = "✓ Guardado";
      btn.style.background = "var(--green)";
      setTimeout(() => {
        btn.textContent = "Actualizar";
        btn.style.background = "";
        btn.disabled = false;
      }, 1500);
    } catch (err) {
      btn.textContent = "Error: " + (err.message || "intenta de nuevo");
      btn.style.background = "var(--red)";
      setTimeout(() => {
        btn.textContent = btn.dataset.orig || "Guardar";
        btn.style.background = "";
        btn.disabled = false;
      }, 3000);
    }
  },

  getMatchPoints(matchId) {
    const match = state.matches.find(m => m.id === matchId);
    const pred = this.myPredictions[matchId];
    if (!match || !pred || match.status !== "FINISHED") return null;

    const actualHome = match.score?.fullTime?.home;
    const actualAway = match.score?.fullTime?.away;
    if (actualHome === null || actualHome === undefined) return null;

    return this.calcPoints(pred.home, pred.away, actualHome, actualAway);
  },

  calcPoints(predHome, predAway, actualHome, actualAway) {
    if (predHome === actualHome && predAway === actualAway) return CONFIG.POINTS.EXACT_SCORE;
    const predWinner = predHome > predAway ? "H" : predHome < predAway ? "A" : "D";
    const actualWinner = actualHome > actualAway ? "H" : actualHome < actualAway ? "A" : "D";
    if (predWinner === actualWinner) return CONFIG.POINTS.CORRECT_WINNER;
    return 0;
  },

  renderProdeSection() {
    const container = document.getElementById("prode-matches");
    if (!container) return;

    if (!window.getSupaClient()) {
      container.innerHTML = `<div class="setup-warning">⚙️ Configurá Supabase en <code>config.js</code> para activar el prode.</div>`;
      return;
    }

    if (!this.user) {
      container.innerHTML = `
        <div class="prode-cta">
          <div style="font-size:2.5rem;margin-bottom:0.75rem">🏆</div>
          <h3>¡Participá en el prode!</h3>
          <p>Predecí los resultados de cada partido y competí con tus amigos.</p>
          <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1.25rem;flex-wrap:wrap">
            <button class="auth-btn" onclick="Prode.showAuthModal('login')">Iniciar sesión</button>
            <button class="auth-btn auth-btn-outline" onclick="Prode.showAuthModal('register')">Registrarse</button>
          </div>
        </div>`;
      return;
    }

    if (!state.matches.length) {
      container.innerHTML = `<p class="loading">Cargando partidos...</p>`;
      return;
    }

    // Separar futuros de jugados
    const upcoming = state.matches.filter(m => ["SCHEDULED", "TIMED"].includes(m.status));
    const played = state.matches.filter(m => m.status === "FINISHED");
    const live = state.matches.filter(m => ["IN_PLAY", "PAUSED"].includes(m.status));

    let html = "";

    if (live.length) {
      html += `<div class="prode-group-label">🔴 En Vivo</div>`;
      html += live.map(m => this.renderPredictionRow(m)).join("");
    }

    if (upcoming.length) {
      html += `<div class="prode-group-label">📅 Próximos partidos — podés cambiar tu predicción hasta que arranque</div>`;
      html += upcoming.map(m => this.renderPredictionRow(m)).join("");
    }

    if (played.length) {
      let totalPoints = 0;
      played.forEach(m => { const pts = this.getMatchPoints(m.id); if (pts !== null) totalPoints += pts; });
      html += `<div class="prode-group-label">✅ Finalizados · <span style="color:var(--accent2)">Mis puntos: ${totalPoints} pts</span></div>`;
      html += played.map(m => this.renderPredictionRow(m)).join("");
    }

    container.innerHTML = html;
  },

  renderPredictionRow(match) {
    const locked = this.isLocked(match);
    const pred = this.myPredictions[match.id];
    const pts = match.status === "FINISHED" ? this.getMatchPoints(match.id) : null;
    const actualHome = match.score?.fullTime?.home ?? "–";
    const actualAway = match.score?.fullTime?.away ?? "–";

    const inputsOrResult = locked
      ? `<div class="pred-locked">
          ${pred ? `<span class="pred-score-text">${pred.home} – ${pred.away}</span>` : `<span style="color:var(--text-muted);font-size:0.75rem">Sin predicción</span>`}
          ${pts !== null ? `<span class="pts-badge pts-${pts}">${pts > 0 ? "+" : ""}${pts} pts</span>` : ""}
        </div>`
      : `<div class="pred-inputs">
          <input type="number" class="score-input" min="0" max="20" value="${pred?.home ?? ""}" placeholder="0" id="pred-h-${match.id}">
          <span class="pred-dash">–</span>
          <input type="number" class="score-input" min="0" max="20" value="${pred?.away ?? ""}" placeholder="0" id="pred-a-${match.id}">
          <button class="pred-save-btn" onclick="Prode.savePrediction(${match.id}, document.getElementById('pred-h-${match.id}').value, document.getElementById('pred-a-${match.id}').value, this)">
            ${pred ? "Actualizar" : "Guardar"}
          </button>
        </div>`;

    return `
      <div class="pred-row ${locked ? "pred-locked-row" : ""}">
        <div class="pred-teams">
          <div class="pred-team pred-home">
            ${crestImg(match.homeTeam, 24)}
            <span>${match.homeTeam?.shortName || "?"}</span>
          </div>
          <div class="pred-result-center">
            ${match.status === "FINISHED" ? `<span class="pred-actual">${actualHome}–${actualAway}</span>` : ""}
            ${match.status === "SCHEDULED" || match.status === "TIMED" ? `<span class="pred-date">${formatDate(match.utcDate)}</span>` : ""}
          </div>
          <div class="pred-team pred-away">
            <span>${match.awayTeam?.shortName || "?"}</span>
            ${crestImg(match.awayTeam, 24)}
          </div>
        </div>
        ${inputsOrResult}
      </div>`;
  },

  // ── BONUS ───────────────────────────────────
  async loadBonusResults() {
    if (!window.getSupaClient()) return;
    const { data } = await window.getSupaClient().from("bonus_results").select("*");
    this.bonusResults = {};
    (data || []).forEach(r => { this.bonusResults[r.key] = r.value; });
  },

  async saveBonus() {
    if (!this.user) { this.showAuthModal("login"); return; }
    if (this.isBonusLocked()) return;

    const champion = document.getElementById("bonus-champion")?.value.trim();
    const runnerUp = document.getElementById("bonus-runner_up")?.value.trim();
    const topScorer = document.getElementById("bonus-top_scorer")?.value.trim();
    const bestPlayer = document.getElementById("bonus-best_player")?.value.trim();

    const btn = document.getElementById("bonus-save-btn");
    btn.textContent = "Guardando...";
    btn.disabled = true;

    try {
      const { error } = await window.getSupaClient()
        .from("bonus_predictions")
        .upsert({
          user_id: this.user.id,
          champion,
          runner_up: runnerUp,
          top_scorer: topScorer,
          best_player: bestPlayer,
        }, { onConflict: "user_id" });

      if (error) throw error;
      this.myBonus = { champion, runner_up: runnerUp, top_scorer: topScorer, best_player: bestPlayer };
      btn.textContent = "✓ Guardado";
      btn.style.background = "var(--green)";
      setTimeout(() => {
        btn.textContent = "Guardar bonus";
        btn.style.background = "";
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      btn.textContent = "Error al guardar";
      btn.disabled = false;
    }
  },

  renderBonusSection() {
    const container = document.getElementById("bonus-content");
    if (!container) return;
    const locked = this.isBonusLocked();
    const teamOptions = state.teams.length
      ? state.teams.map(t => `<option value="${t.name}">${t.name}</option>`).join("")
      : "";

    const bonusCards = [
      { key: "champion", icon: "🏆", label: "Campeón del Mundial", field: "champion", pts: CONFIG.POINTS.BONUS_CHAMPION },
      { key: "runner_up", icon: "🥈", label: "Subcampeón", field: "runner_up", pts: CONFIG.POINTS.BONUS_RUNNER_UP },
      { key: "top_scorer", icon: "⚽", label: "Goleador del torneo", field: "top_scorer", pts: CONFIG.POINTS.BONUS_TOP_SCORER },
      { key: "best_player", icon: "⭐", label: "Mejor jugador", field: "best_player", pts: CONFIG.POINTS.BONUS_BEST_PLAYER },
    ];

    if (!this.user) {
      container.innerHTML = `
        <div class="prode-cta">
          <div style="font-size:2.5rem;margin-bottom:0.75rem">🔮</div>
          <h3>Bonus de predicciones</h3>
          <p>Predecí campeón, subcampeón, goleador y mejor jugador. Se cierran cuando arranca el Mundial.</p>
          <div style="display:flex;gap:0.5rem;justify-content:center;margin-top:1.25rem;flex-wrap:wrap">
            <button class="auth-btn" onclick="Prode.showAuthModal('login')">Iniciar sesión</button>
            <button class="auth-btn auth-btn-outline" onclick="Prode.showAuthModal('register')">Registrarse</button>
          </div>
        </div>`;
      return;
    }

    let html = "";

    if (locked) {
      html += `<div class="bonus-locked-banner">🔒 Las predicciones bonus están cerradas — el Mundial ya comenzó</div>`;
    } else {
      html += `<p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:1.5rem">Cada predicción correcta vale <strong style="color:var(--accent2)">5 puntos</strong>. Se bloquean automáticamente cuando empiece el torneo.</p>`;
    }

    html += `<div class="bonus-grid">`;
    bonusCards.forEach(card => {
      const myValue = this.myBonus?.[card.field] || "";
      const result = this.bonusResults?.[card.key] || "";
      const isCorrect = result && myValue && myValue.toLowerCase() === result.toLowerCase();
      const isWrong = result && myValue && myValue.toLowerCase() !== result.toLowerCase();

      html += `
        <div class="bonus-card ${isCorrect ? "bonus-correct" : isWrong ? "bonus-wrong" : ""}">
          <div class="bonus-icon">${card.icon}</div>
          <div class="bonus-label">${card.label}</div>
          <div class="bonus-pts">+${card.pts} pts</div>
          ${locked
            ? `<div class="bonus-value-locked">${myValue || '<span style="color:var(--text-muted)">Sin predicción</span>'}</div>
               ${result ? `<div class="bonus-result">Real: <strong>${result}</strong> ${isCorrect ? "✅" : "❌"}</div>` : ""}`
            : (card.field === "champion" || card.field === "runner_up") && teamOptions
              ? `<select id="bonus-${card.key}" class="bonus-select">
                  <option value="">— Elegí un equipo —</option>
                  ${state.teams.map(t => `<option value="${t.name}" ${myValue === t.name ? "selected" : ""}>${t.shortName || t.name}</option>`).join("")}
                </select>`
              : `<input type="text" id="bonus-${card.key}" class="bonus-input" placeholder="Escribí el nombre..." value="${myValue}">`
          }
        </div>`;
    });
    html += `</div>`;

    if (!locked) {
      html += `<button id="bonus-save-btn" class="auth-submit" style="margin-top:1.5rem;max-width:300px" onclick="Prode.saveBonus()">Guardar bonus</button>`;
    }

    container.innerHTML = html;
  },

  // ── LEADERBOARD ─────────────────────────────
  async loadLeaderboard() {
    const container = document.getElementById("leaderboard-content");
    if (!container) return;
    if (!window.getSupaClient()) {
      container.innerHTML = `<div class="setup-warning">⚙️ Configurá Supabase para ver el ranking.</div>`;
      return;
    }

    container.innerHTML = `<p class="loading">Calculando ranking...</p>`;

    try {
      const [{ data: profiles }, { data: predictions }, { data: bonusPreds }] = await Promise.all([
        window.getSupaClient().from("profiles").select("*"),
        window.getSupaClient().from("predictions").select("*"),
        window.getSupaClient().from("bonus_predictions").select("*"),
      ]);

      await this.loadBonusResults();

      const finishedMatches = state.matches.filter(m => m.status === "FINISHED");

      const ranking = (profiles || []).map(profile => {
        const userPreds = (predictions || []).filter(p => p.user_id === profile.id);
        let matchPoints = 0;
        userPreds.forEach(p => {
          const match = finishedMatches.find(m => Number(m.id) === Number(p.match_id));
          if (match) {
            const ah = match.score?.fullTime?.home;
            const aa = match.score?.fullTime?.away;
            if (ah !== null && ah !== undefined) {
              matchPoints += this.calcPoints(p.home_score, p.away_score, ah, aa);
            }
          }
        });

        const userBonus = (bonusPreds || []).find(b => b.user_id === profile.id);
        let bonusPoints = 0;
        if (userBonus && Object.keys(this.bonusResults).length) {
          const fields = ["champion", "runner_up", "top_scorer", "best_player"];
          const ptKeys = [
            CONFIG.POINTS.BONUS_CHAMPION,
            CONFIG.POINTS.BONUS_RUNNER_UP,
            CONFIG.POINTS.BONUS_TOP_SCORER,
            CONFIG.POINTS.BONUS_BEST_PLAYER,
          ];
          fields.forEach((f, i) => {
            const result = this.bonusResults[f];
            const pred = userBonus[f];
            if (result && pred && result.toLowerCase() === pred.toLowerCase()) {
              bonusPoints += ptKeys[i];
            }
          });
        }

        return {
          username: profile.username,
          userId: profile.id,
          matchPoints,
          bonusPoints,
          total: matchPoints + bonusPoints,
          predictions: userPreds.length,
        };
      }).sort((a, b) => b.total - a.total);

      this.renderLeaderboard(ranking);
    } catch (err) {
      container.innerHTML = `<div class="error-box">Error al cargar el ranking: ${err.message}</div>`;
    }
  },

  renderLeaderboard(ranking) {
    const container = document.getElementById("leaderboard-content");
    if (!ranking.length) {
      container.innerHTML = `<p class="loading">Nadie hizo predicciones todavía.</p>`;
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    container.innerHTML = `
      <table class="scorers-table leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>Partidos</th>
            <th>Bonus</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${ranking.map((r, i) => `
            <tr class="${this.user?.id === r.userId ? "leaderboard-me" : ""}">
              <td class="rank rank-${i + 1}">${medals[i] || i + 1}</td>
              <td>
                <strong>${r.username}</strong>
                ${this.user?.id === r.userId ? ' <span style="color:var(--accent2);font-size:0.7rem">(vos)</span>' : ""}
              </td>
              <td><span class="pts-badge ${r.matchPoints > 0 ? "pts-3" : "pts-0"}">${r.matchPoints}</span></td>
              <td><span class="pts-badge ${r.bonusPoints > 0 ? "pts-5" : "pts-0"}">${r.bonusPoints}</span></td>
              <td class="pts" style="font-size:1rem">${r.total}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      <p style="font-size:0.72rem;color:var(--text-muted);margin-top:1rem;text-align:center">
        Puntos: resultado exacto = ${CONFIG.POINTS.EXACT_SCORE} pts · ganador correcto = ${CONFIG.POINTS.CORRECT_WINNER} pt · bonus = ${CONFIG.POINTS.BONUS_CHAMPION} pts c/u
      </p>`;
  },
};
