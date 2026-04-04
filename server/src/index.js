const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/provider', require('./routes/provider'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/biography', require('./routes/biography'));
app.use('/api/citymap', require('./routes/citymap'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve built React client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
