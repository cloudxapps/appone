// Uses Node's built-in fetch (Node 18+) — no dependencies needed

async function request(method, url, body = null, extraHeaders = {}) {
  const options = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders, // allows overriding Content-Type (e.g. form-urlencoded) and adding Authorization
    },
  };

  // Only attach a body if it is not a GET or HEAD request
  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    // If body is already a string (e.g. form-urlencoded for OAuth), send as-is.
    // Otherwise treat it as a JSON-serializable object.
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch (e) {
      // ignore
    }
    throw new Error('HTTP error! Status: ${response.status} - ${details}');
  }

  // Some Genesys endpoints (e.g. certain PATCH calls) return 202/204 with no body
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

module.exports = request;
