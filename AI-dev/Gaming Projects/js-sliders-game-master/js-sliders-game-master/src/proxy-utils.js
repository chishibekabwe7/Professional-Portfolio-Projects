const jwt = require('jsonwebtoken');

const BASE_URL = 'https://js-sliders-game.vercel.app';
const SCORE_FACTOR = 150;

function createGameToken(size) {
  return jwt.sign({ size }, process.env.GAME_SECRET, { expiresIn: '2h' });
}

function verifyGameToken(token) {
  try {
    return jwt.verify(token, process.env.GAME_SECRET);
  } catch {
    return null;
  }
}

// Validates the body of a POST /sliders/add request.
// Returns null on success, or a { status, body } error object.
function validateScoreSubmission(body) {
  const { user_name, score, gameToken } = body || {};
  const validName =
    typeof user_name === 'string' && /^[a-zA-Z0-9@ ]{3,20}$/.test(user_name);
  if (!validName) {
    return { status: 400, body: { error: 'Invalid name' } };
  }
  if (typeof gameToken !== 'string') {
    return { status: 403, body: { error: 'Game token required' } };
  }
  const session = verifyGameToken(gameToken);
  if (!session) {
    return { status: 403, body: { error: 'Invalid or expired game token' } };
  }
  const parsedScore = parseInt(score, 10);
  const maxScore = SCORE_FACTOR * session.size;
  const validScore =
    Number.isInteger(parsedScore) &&
    parsedScore >= 0 &&
    parsedScore <= maxScore;
  if (!validScore) {
    return { status: 400, body: { error: 'Invalid score' } };
  }
  return null;
}

// Proxies a request to the upstream API, injecting auth headers.
// Strips gameToken from POST bodies before forwarding.
async function proxyToUpstream(upstreamUrl, method, body) {
  if (method === 'POST') {
    const { gameToken: _token, ...bodyToForward } = body || {};
    return fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.API_KEY}`,
        Origin: BASE_URL
      },
      body: JSON.stringify(bodyToForward)
    });
  }
  return fetch(upstreamUrl, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.API_KEY}`,
      Origin: BASE_URL
    }
  });
}

module.exports = {
  createGameToken,
  validateScoreSubmission,
  proxyToUpstream
};
