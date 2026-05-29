export default async function handler(req, res) {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint parameter" });
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const url = `https://api.football-data.org/v4${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
    });

    const data = await response.json();

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
