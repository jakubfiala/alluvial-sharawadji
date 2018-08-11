const express = require('express');
const bodyParser = require('body-parser');

const saveRecording = require('./middleware/save-recording.js');
const listRecordings = require('./middleware/list-recordings.js');

const app = express();

app.use(bodyParser.raw({ type: 'audio/mpeg', limit: '100mb' }));
app.use('/recorder', express.static('recorder'));
app.use('/viewer', express.static('viewer'));

app.put('/upload-recording', saveRecording);
app.get("/list-recordings", listRecordings);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.info(`Server running at ${PORT}`));
