const express = require('express');
const app = express();
const PORT = 5050;

app.get('/', (req, res) => {
  res.send('Basic test route');
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
