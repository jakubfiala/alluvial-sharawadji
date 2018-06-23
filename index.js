const express = require('express');
const bodyParser = require('body-parser');

const saveRecording = require('./middleware/save-recording.js');

const app = express();

app.use(bodyParser.raw({ type: 'audio/mpeg', limit: '100mb' }));
app.use('/recorder', express.static('recorder'));

app.put('/upload-recording', saveRecording);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.info(`Server running at ${PORT}`));
