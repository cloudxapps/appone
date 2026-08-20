

async function request(method, url, body = null) {
  const options = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Only attach a body if it is not a GET or HEAD request
  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch (e) {
      // ignore
    }
    throw new Error(`HTTP error! Status: ${response.status} - ${details}`);
  }

  return response.json(); // Automatically parses JSON and returns a Promise
}

module.exports = request;