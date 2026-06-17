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

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    let html = response.data;
    html = html.replace(/href=["']\/(?!\/)/g, `href="/proxy?url=${targetUrl.replace(/\/$/, '')}/`);
    html = html.replace(/src=["']\/(?!\/)/g, `src="/proxy?url=${targetUrl.replace(/\/$/, '')}/`);

    res.send(html);
  } catch (error) {
    res.status(500).send('Error fetching content: ' + error.message);
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
        const response = await fetch('/proxy?url=https://www.roblox.com');
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
