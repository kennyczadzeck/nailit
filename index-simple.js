const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ 
    message: 'NailIt App is running on App Runner!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'nailit' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`NailIt test server running on port ${port}`);
}); 