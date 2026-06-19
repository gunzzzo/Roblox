const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.static('public'));

app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;

    if (!targetUrl) {
      return res.status(400).send('URL parameter required');
    }

    // Validate URL
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (e) {
      return res.status(400).send('Invalid URL');
    }

    const response = await axios.get(parsed.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      responseType: 'text'
    });

    let html = response.data;
    const base = parsed.href.replace(/\/$/, '');

    // Rewrite root-relative href/src to proxy full URLs. Preserve other attributes.
    html = html.replace(/(href|src)=["']\/(?!\/)([^"'<>\s]*)["']/g, (m, attr, p) => {
      // encode the full target so the proxy receives a valid absolute URL
      return `${attr}="/proxy?url=${encodeURIComponent(base + '/' + p)}"`;
    });

    // Also handle srcset (basic handling for comma-separated list of urls)
    html = html.replace(/srcset=["']([^"']+)["']/g, (m, grp) => {
      const parts = grp.split(',').map(part => {
        const trimmed = part.trim();
        // if it starts with / (root-relative) rewrite, otherwise leave as-is
        if (trimmed.startsWith('/')) {
          const [urlPart, descriptor] = trimmed.split(/\s+/, 2);
          const newUrl = `/proxy?url=${encodeURIComponent(base + urlPart)}`;
          return descriptor ? `${newUrl} ${descriptor}` : newUrl;
        }
        return trimmed;
      });
      return `srcset="${parts.join(', ')}"`;
    });

    res.send(html);
  } catch (error) {
    console.error('Proxy error:', error && error.message);
    res.status(500).send('Error fetching content: ' + (error && error.message));
  }
});

// Serve HTML from string
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>hello</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: black;
    }
    #proxyContainer {
      width: 100%;
      height: 100vh;
      overflow: auto;
    }
  </style>
</head>
<body>
  <div id="proxyContainer"></div>
  <script>
    const container = document.getElementById("proxyContainer");

    async function loadProxiedContent() {
      try {
        const response = await fetch('/proxy?url=' + encodeURIComponent('https://www.roblox.com'));
        const html = await response.text();
        container.innerHTML = html;
      } catch (error) {
        console.error('Error loading proxied content:', error);
        container.innerHTML = '<p>Error loading content</p>';
      }
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "F11") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    });

    loadProxiedContent();
  </script>
</body>
</html>
  `);
});

app.listen(3000, () => {
  console.log('Proxy server running on http://localhost:3000');
});
