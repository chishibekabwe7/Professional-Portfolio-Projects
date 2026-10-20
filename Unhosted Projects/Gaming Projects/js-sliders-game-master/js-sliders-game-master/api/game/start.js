const { createGameToken } = require('../../src/proxy-utils');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!process.env.GAME_SECRET) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  const size = parseInt(req.body?.size, 10);
  if (!Number.isInteger(size) || size < 2 || size > 6) {
    return res.status(400).json({ error: 'Invalid size' });
  }
  res.json({ gameToken: createGameToken(size) });
};
