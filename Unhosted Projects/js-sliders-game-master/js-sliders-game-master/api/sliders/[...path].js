const {
  validateScoreSubmission,
  proxyToUpstream
} = require('../../src/proxy-utils');

const API_BASE_URL = process.env.API_BASE_URL;

module.exports = async (req, res) => {
  // In Vercel, req.url is the full request path e.g. /api/sliders/view?page=1&...
  // Strip /api/sliders to get the relative path and reconstruct the upstream URL.
  const relPath = req.url.replace(/^\/api\/sliders/, '');
  const subPath = relPath.split('?')[0].replace(/^\//, '');
  const upstreamUrl = `${API_BASE_URL}/api/sliders${relPath}`;

  if (req.method === 'POST' && subPath === 'add') {
    const err = validateScoreSubmission(req.body);
    if (err) return res.status(err.status).json(err.body);
  }

  try {
    const response = await proxyToUpstream(upstreamUrl, req.method, req.body);
    const data = await response.text();
    if (!response.ok) {
      console.error(
        `Upstream error ${response.status} for /api/sliders/${subPath}:`,
        data
      );
    }
    res.status(response.status);
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    res.send(data);
  } catch (err) {
    console.error('Proxy error:', err.message, '| URL:', upstreamUrl);
    res.status(502).json({ error: 'Proxy error', detail: err.message });
  }
};
