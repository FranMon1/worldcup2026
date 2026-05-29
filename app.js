// ── STATE ──
const state = {
  matches: [],
  scorers: [],
  teams: [],
  standings: [],
  currentFilter: "ALL",
};

// ── HELPERS ──
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status) {
  const map = {
    FINISHED: "Finalizado",
    IN_PLAY: "En Juego",
    PAUSED: "Entretiempo",
    SCHEDULED: "Programado",
    TIMED: "Programado",
    POSTPONED: "Postergado",
    CANCELLED: "Cancelado",
    SUSPENDED: "Suspendido",
  };
  return map[status] || status;
}

function crestImg(team, size = 32) {
  if (team?.crest) {
    return `<img src="${team.crest}" alt="${team.shortName || team.name}" class="team-crest" width="${size}" height="${size}" onerror="this.style.display='none'">`;
  }
  return `<div class="team-crest-placeholder">${(team?.shortName || "?")[0]}</div>`;
}

function buildEventsHTML(match) {
  const goals = match.goals || [];
  const bookings = match.bookings || [];
  if (!goals.length && !bookings.length) return "";

  const items = [];
  goals.forEach(g => {
    const side = g.team?.id === match.homeTeam?.id ? "🏠" : "✈️";
    items.push(`<span class="event-tag goal">${side} ⚽ ${g.scorer?.name?.split(" ").pop() || "?"} ${g.minute}'</span>`);
  });
  bookings.forEach(b => {
    const type = b.card === "YELLOW_CARD" ? "🟨" : "🟥";
    const cls = b.card === "YELLOW_CARD" ? "yellow-card" : "red-card";
    items.push(`<span class="event-tag ${cls}">${type} ${b.player?.name?.split(" ").pop() || "?"} ${b.minute}'</span>`);
  });
  return `<div class="match-events">${items.join("")}</div>`;
}

// ── NAV ──
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.querySelector(`nav button[data-section="${id}"]`).classList.add("active");
}

// ── SECTION: MATCHES ──
function renderMatches(filter = "ALL") {
  state.currentFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.filter === filter);
  });

  let matches = state.matches;
  if (filter === "FINISHED") matches = matches.filter(m => m.status === "FINISHED");
  else if (filter === "LIVE") matches = matches.filter(m => ["IN_PLAY", "PAUSED"].includes(m.status));
  else if (filter === "UPCOMING") matches = matches.filter(m => ["SCHEDULED", "TIMED"].includes(m.status));

  const container = document.getElementById("matches-list");
  if (!matches.length) {
    container.innerHTML = `<p class="loading">No hay partidos en esta categoría.</p>`;
    return;
  }

  container.innerHTML = matches.map(m => {
    const isLive = ["IN_PLAY", "PAUSED"].includes(m.status);
    const isFinished = m.status === "FINISHED";
    const hScore = isFinished || isLive ? (m.score?.fullTime?.home ?? "–") : "–";
    const aScore = isFinished || isLive ? (m.score?.fullTime?.away ?? "–") : "–";

    return `
    <div class="match-card" onclick="openMatchDetail(${m.id})">
      <div class="match-meta">
        <span>${formatDate(m.utcDate)} · ${m.stage?.replace(/_/g, " ") || ""} ${m.group || ""}</span>
        <span class="match-status status-${m.status.toLowerCase()}">${statusLabel(m.status)}</span>
      </div>
      <div class="match-teams">
        <div class="team home">
          ${crestImg(m.homeTeam)}
          <span class="team-name">${m.homeTeam?.shortName || m.homeTeam?.name || "?"}</span>
        </div>
        <div class="score-box">
          <div class="score">${hScore} – ${aScore}</div>
          ${isLive ? `<div class="score-time">En Vivo</div>` : ""}
        </div>
        <div class="team away">
          ${crestImg(m.awayTeam)}
          <span class="team-name">${m.awayTeam?.shortName || m.awayTeam?.name || "?"}</span>
        </div>
      </div>
      ${buildEventsHTML(m)}
    </div>`;
  }).join("");
}

async function loadMatches() {
  const container = document.getElementById("matches-list");
  container.innerHTML = `<p class="loading">Cargando partidos...</p>`;
  try {
    const data = await API.getMatches();
    state.matches = data.matches || [];
    renderMatches(state.currentFilter);
  } catch (e) {
    container.innerHTML = `<div class="error-box">Error al cargar partidos: ${e.message}</div>`;
  }
}

// ── MATCH DETAIL ──
async function openMatchDetail(matchId) {
  const match = state.matches.find(m => m.id === matchId);
  if (!match) return;

  const isPlayed = ["FINISHED", "IN_PLAY", "PAUSED"].includes(match.status);
  const hScore = isPlayed ? (match.score?.fullTime?.home ?? "–") : "–";
  const aScore = isPlayed ? (match.score?.fullTime?.away ?? "–") : "–";

  let detailHTML = `
    <div class="modal-header">
      <div class="modal-title">Detalle del Partido</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="text-align:center;margin-bottom:1.25rem">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.75rem">
        ${formatDate(match.utcDate)} · ${match.stage?.replace(/_/g, " ") || ""} ${match.group || ""}
      </div>
      <div class="match-teams" style="max-width:400px;margin:0 auto">
        <div class="team home" style="justify-content:flex-end">
          ${crestImg(match.homeTeam, 48)}
          <span class="team-name">${match.homeTeam?.name || "?"}</span>
        </div>
        <div class="score-box">
          <div class="score" style="font-size:2rem">${hScore} – ${aScore}</div>
          <span class="match-status status-${match.status.toLowerCase()}" style="display:inline-block;margin-top:4px">${statusLabel(match.status)}</span>
        </div>
        <div class="team away">
          ${crestImg(match.awayTeam, 48)}
          <span class="team-name">${match.awayTeam?.name || "?"}</span>
        </div>
      </div>
    </div>`;

  // Goals
  const goals = match.goals || [];
  if (goals.length) {
    const homeGoals = goals.filter(g => g.team?.id === match.homeTeam?.id);
    const awayGoals = goals.filter(g => g.team?.id === match.awayTeam?.id);
    detailHTML += `
      <div style="margin-bottom:1rem">
        <div class="squad-position">⚽ Goles</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.82rem">
          <div>${homeGoals.map(g => `<div style="padding:0.3rem 0;border-bottom:1px solid var(--border)">${g.scorer?.name || "?"} <span style="color:var(--text-muted)">${g.minute}'</span></div>`).join("") || "<span style='color:var(--text-muted)'>-</span>"}</div>
          <div style="text-align:right">${awayGoals.map(g => `<div style="padding:0.3rem 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted)">${g.minute}'</span> ${g.scorer?.name || "?"}</div>`).join("") || "<span style='color:var(--text-muted)'>-</span>"}</div>
        </div>
      </div>`;
  }

  // Bookings
  const bookings = match.bookings || [];
  if (bookings.length) {
    detailHTML += `<div class="squad-position">🟨 Tarjetas</div>`;
    detailHTML += bookings.map(b => {
      const icon = b.card === "YELLOW_CARD" ? "🟨" : "🟥";
      return `<div style="font-size:0.82rem;padding:0.3rem 0;border-bottom:1px solid var(--border)">${icon} ${b.player?.name || "?"} <span style="color:var(--text-muted)">(${b.team?.shortName || "?"}) ${b.minute}'</span></div>`;
    }).join("");
  }

  // Score half time
  if (match.score?.halfTime?.home !== null && match.score?.halfTime?.home !== undefined) {
    detailHTML += `<div style="margin-top:1rem;font-size:0.8rem;color:var(--text-muted);text-align:center">Primer tiempo: ${match.score.halfTime.home} – ${match.score.halfTime.away}</div>`;
  }

  detailHTML += `</div>`;
  openModal(detailHTML);
}

// ── SECTION: SCORERS ──
async function loadScorers() {
  const container = document.getElementById("scorers-content");
  container.innerHTML = `<p class="loading">Cargando goleadores...</p>`;
  try {
    const data = await API.getScorers();
    state.scorers = data.scorers || [];
    renderScorers();
  } catch (e) {
    container.innerHTML = `<div class="error-box">Error: ${e.message}</div>`;
  }
}

function renderScorers() {
  const container = document.getElementById("scorers-content");
  if (!state.scorers.length) {
    container.innerHTML = `<p class="loading">No hay datos de goleadores aún.</p>`;
    return;
  }
  container.innerHTML = `
    <table class="scorers-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Jugador</th>
          <th class="hide-mobile">País</th>
          <th>⚽ Goles</th>
          <th class="hide-mobile">🅰️ Asist.</th>
          <th class="hide-mobile">🟨 Amar.</th>
          <th class="hide-mobile">🟥 Rojas</th>
        </tr>
      </thead>
      <tbody>
        ${state.scorers.map((s, i) => `
          <tr>
            <td class="rank rank-${i + 1}">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
            <td>
              <div class="player-name">${s.player?.name || "?"}</div>
              <div class="player-country hide-mobile">${s.team?.shortName || ""}</div>
            </td>
            <td class="hide-mobile">${s.team?.area?.name || s.team?.shortName || "?"}</td>
            <td><span class="goals-badge">⚽ ${s.goals ?? 0}</span></td>
            <td class="hide-mobile">${s.assists ?? 0}</td>
            <td class="hide-mobile">${s.yellowCards ?? 0}</td>
            <td class="hide-mobile">${s.redCards ?? 0}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

// ── SECTION: TEAMS ──
async function loadTeams() {
  const container = document.getElementById("teams-grid");
  container.innerHTML = `<p class="loading">Cargando equipos...</p>`;
  try {
    const data = await API.getTeams();
    state.teams = data.teams || [];
    renderTeams();
  } catch (e) {
    container.innerHTML = `<div class="error-box">Error: ${e.message}</div>`;
  }
}

function renderTeams() {
  const container = document.getElementById("teams-grid");
  if (!state.teams.length) {
    container.innerHTML = `<p class="loading">No hay equipos disponibles aún.</p>`;
    return;
  }
  container.innerHTML = state.teams.map(t => `
    <div class="team-card" onclick="loadSquad(${t.id}, '${(t.name || "").replace(/'/g, "\\'")}', '${t.crest || ""}')">
      <img src="${t.crest || ""}" alt="${t.name}" onerror="this.style.display='none'" width="56" height="56">
      <div class="team-card-name">${t.shortName || t.name}</div>
      <div class="team-card-group">${t.area?.name || ""}</div>
    </div>`).join("");
}

async function loadSquad(teamId, teamName, crest) {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">
        ${crest ? `<img src="${crest}" width="28" height="28" style="object-fit:contain">` : ""}
        ${teamName}
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <p class="loading">Cargando plantel...</p>
  `);
  try {
    const data = await API.getTeamPlayers(teamId);
    const squad = data.squad || [];
    const byPos = {};
    squad.forEach(p => {
      const pos = p.position || "Sin posición";
      if (!byPos[pos]) byPos[pos] = [];
      byPos[pos].push(p);
    });

    const posOrder = ["Goalkeeper", "Defence", "Midfield", "Offence", "Sin posición"];
    const posLabels = {
      Goalkeeper: "🧤 Arqueros",
      Defence: "🛡️ Defensas",
      Midfield: "⚙️ Mediocampistas",
      Offence: "⚡ Delanteros",
      "Sin posición": "Otros",
    };

    let html = `
      <div class="modal-header">
        <div class="modal-title">
          ${crest ? `<img src="${crest}" width="28" height="28" style="object-fit:contain">` : ""}
          ${teamName}
        </div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>`;

    if (!squad.length) {
      html += `<p style="color:var(--text-muted);font-size:0.85rem">Plantel no disponible aún.</p>`;
    } else {
      posOrder.forEach(pos => {
        if (!byPos[pos]) return;
        html += `<div class="squad-position">${posLabels[pos] || pos}</div>`;
        byPos[pos].forEach(p => {
          const age = p.dateOfBirth ? new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear() : "?";
          html += `
            <div class="squad-player">
              <div class="player-number">${p.shirtNumber || "–"}</div>
              <div>
                <div style="font-weight:700;font-size:0.85rem">${p.name || "?"}</div>
                <div style="font-size:0.72rem;color:var(--text-muted)">${p.nationality || ""} · ${age} años</div>
              </div>
            </div>`;
        });
      });
    }
    html += `</div>`;
    document.querySelector(".modal").innerHTML = html;
  } catch (e) {
    document.querySelector(".modal").innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${teamName}</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="error-box">Error al cargar plantel: ${e.message}</div>`;
  }
}

// ── SECTION: STANDINGS ──
async function loadStandings() {
  const container = document.getElementById("standings-content");
  container.innerHTML = `<p class="loading">Cargando tabla de posiciones...</p>`;
  try {
    const data = await API.getStandings();
    state.standings = data.standings || [];
    renderStandings();
  } catch (e) {
    container.innerHTML = `<div class="error-box">Error: ${e.message}</div>`;
  }
}

function renderStandings() {
  const container = document.getElementById("standings-content");
  if (!state.standings.length) {
    container.innerHTML = `<p class="loading">Posiciones no disponibles aún.</p>`;
    return;
  }

  container.innerHTML = state.standings.map(group => `
    <div class="group-block">
      <div class="group-label">${group.group ? `Grupo ${group.group.replace("GROUP_", "")}` : group.stage}</div>
      <table class="standings-table">
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          ${(group.table || []).map((row, i) => `
            <tr class="${i < 2 ? 'qualified' : ''}">
              <td>${row.position}</td>
              <td>
                <div class="standing-team">
                  <img src="${row.team?.crest || ''}" alt="${row.team?.shortName || ''}" onerror="this.style.display='none'">
                  ${row.team?.shortName || row.team?.name || "?"}
                </div>
              </td>
              <td>${row.playedGames}</td>
              <td>${row.won}</td>
              <td>${row.draw}</td>
              <td>${row.lost}</td>
              <td>${row.goalsFor}</td>
              <td>${row.goalsAgainst}</td>
              <td>${row.goalDifference > 0 ? "+" : ""}${row.goalDifference}</td>
              <td class="pts">${row.points}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`).join("");
}

// ── SECTION: STATS ──
function renderStats() {
  const container = document.getElementById("stats-content");
  const matches = state.matches.filter(m => m.status === "FINISHED");
  const totalGoals = matches.reduce((acc, m) => acc + (m.score?.fullTime?.home ?? 0) + (m.score?.fullTime?.away ?? 0), 0);
  const avgGoals = matches.length ? (totalGoals / matches.length).toFixed(1) : 0;

  let totalYellow = 0, totalRed = 0;
  matches.forEach(m => {
    (m.bookings || []).forEach(b => {
      if (b.card === "YELLOW_CARD") totalYellow++;
      else if (b.card === "RED_CARD") totalRed++;
    });
  });

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${matches.length}</div>
        <div class="stat-label">Partidos jugados</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalGoals}</div>
        <div class="stat-label">Goles totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${avgGoals}</div>
        <div class="stat-label">Promedio goles/partido</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalYellow}</div>
        <div class="stat-label">🟨 Tarjetas amarillas</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalRed}</div>
        <div class="stat-label">🟥 Tarjetas rojas</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${state.scorers[0]?.goals ?? "–"}</div>
        <div class="stat-label">⚽ Máximo goleador</div>
      </div>
    </div>
    ${state.scorers[0] ? `<p style="font-size:0.85rem;color:var(--text-muted);text-align:center">Goleador líder: <strong style="color:var(--text)">${state.scorers[0].player?.name}</strong> (${state.scorers[0].team?.shortName || ""})</p>` : ""}`;
}

// ── MODAL ──
function openModal(html) {
  let overlay = document.getElementById("modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal"></div>`;
    overlay.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
  }
  overlay.querySelector(".modal").innerHTML = html;
  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) overlay.style.display = "none";
  document.body.style.overflow = "";
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  // Nav
  document.querySelectorAll("nav button[data-section]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.section;
      showSection(id);
      if (id === "matches" && !state.matches.length) loadMatches();
      if (id === "scorers" && !state.scorers.length) loadScorers();
      if (id === "teams" && !state.teams.length) loadTeams();
      if (id === "standings" && !state.standings.length) loadStandings();
      if (id === "stats") {
        if (!state.matches.length) loadMatches().then(renderStats);
        if (!state.scorers.length) loadScorers().then(renderStats);
        renderStats();
      }
    });
  });

  // Filters
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => renderMatches(btn.dataset.filter));
  });

  // Load initial section
  loadMatches();

});
