window.AudioContext = window.AudioContext || window.webkitAudioContext;

const recordButton = document.getElementById('record-button');
const UPLOAD_BASE_PATH = '/upload-recording';

const getUploadURL = ({ timestamp, lat, lng }) => {
  return `${UPLOAD_BASE_PATH}?timestamp=${timestamp}&lat=${lat}&lng=${lng}`;
};

const saveBlobAtPosition = blob => position => {
  console.log(blob, position);

  const metadata = {
    timestamp: position.timestamp,
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  fetch(getUploadURL(metadata), { method: 'PUT', body: blob, mode: 'same-origin' })
    .then(response => response.ok && console.log('upload successful'))
    .catch(err => console.error(`Upload error: ${err}`));
};

const saveRecording = audio => (recorder, blob) => {
  audio.close();

  navigator.geolocation
    .getCurrentPosition(
      saveBlobAtPosition(blob),
      err => console.error(err),
      { enableHighAccuracy: true });
};

const stopRecording = (recorder, audio) => {
  return function stopHandler(e) {
    recorder.onComplete = saveRecording(audio);
    recorder.finishRecording();

    const button = e.target;
    button.innerText = 'Start Recording';
    button.removeEventListener('click', stopHandler);
    button.addEventListener('click', startRecording(recorder));
  };
};

const startRecording = stream => {
  return function startHandler(e) {
    const audio = new AudioContext();
    const source = audio.createMediaStreamSource(stream);

    const recorder = new WebAudioRecorder(source, { workerDir: "lib/web-audio-recorder/" });
    recorder.setEncoding('mp3');

    const button = e.target;
    recorder.startRecording();
    button.innerText = 'Stop Recording';

    button.removeEventListener('click', startHandler);
    button.addEventListener('click', stopRecording(recorder, audio));
  };
};

const initialiseRecorder = stream => {
  recordButton.hidden = false;

  recordButton.addEventListener('click', startRecording(stream));
};

navigator.mediaDevices
  .getUserMedia({ audio: true, video: false })
  .then(initialiseRecorder);
