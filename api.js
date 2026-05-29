const API = {
  async fetch(endpoint) {
    const url = `/api/football?endpoint=${encodeURIComponent(endpoint)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    return res.json();
  },

  getMatches() {
    return this.fetch(`/competitions/${CONFIG.COMPETITION_ID}/matches`);
  },

  getStandings() {
    return this.fetch(`/competitions/${CONFIG.COMPETITION_ID}/standings`);
  },

  getScorers() {
    return this.fetch(`/competitions/${CONFIG.COMPETITION_ID}/scorers?limit=20`);
  },

  getTeams() {
    return this.fetch(`/competitions/${CONFIG.COMPETITION_ID}/teams`);
  },

  getTeamPlayers(teamId) {
    return this.fetch(`/teams/${teamId}`);
  },

  getMatch(matchId) {
    return this.fetch(`/matches/${matchId}`);
  },
};
