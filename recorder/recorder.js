const soundwalk = location.search
  .slice(1)
  .split('&')
  .filter(q => q.includes('soundwalk='))
  .pop()
  .split('=')
  .pop();

window.AudioContext = window.AudioContext || window.webkitAudioContext;

const recordButton = document.getElementById('record-button');
const downloadProgress = document.getElementById('dl-progress');
const player = document.getElementById('player');

const UPLOAD_BASE_PATH = '/upload-recording';

const getUploadURL = ({ timestamp, lat, lng }) => {
  return `${UPLOAD_BASE_PATH}?timestamp=${timestamp}&lat=${lat}&lng=${lng}&soundwalk=${soundwalk}`;
};

const saveBlobAtPosition = blob => position => {
  player.src = URL.createObjectURL(blob);

  const reader = new FileReader()

  reader.addEventListener("loadend", () => {
     const audioData = new Uint8Array(reader.result);
     console.log(audioData);
  });

  reader.readAsArrayBuffer(blob);

  console.log(blob, position);
  position = { timestamp: 0, coords: { latitude: 0, longitude: 0 }};

  const metadata = {
    timestamp: position.timestamp,
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  const xhr = new XMLHttpRequest();
  xhr.open('PUT', getUploadURL(metadata), true);

  xhr.addEventListener('error', () => output.innerText = `Upload error: ${xhr.status}`);
  xhr.addEventListener('progress', e => downloadProgress.value = e.loaded / e.total);

  xhr.addEventListener('load', () => {
    if (xhr.status !== 200) {
      output.innerText = `Upload error: ${xhr.status}`
    } else {
      output.innerText = 'upload successful';
    }
  });

  // xhr.send(blob);
  downloadProgress.hidden = false;

  // fetch(getUploadURL(metadata), { method: 'PUT', body: blob, mode: 'same-origin' })
  //   .then(response => {
  //     if (response.ok) {
  //       output.innerText = 'upload successful';
  //     }
  //   })
  //   .catch(err => {
  //     output.innerText = `Upload error: ${err}`;
  //   });
};

const saveRecording = (recorder, blob) => {
  saveBlobAtPosition(blob)(null);
  // navigator.geolocation
  //   .getCurrentPosition(
  //     saveBlobAtPosition(blob),
  //     err => console.error(err),
  //     { enableHighAccuracy: true });
};

const stopRecording = recorder => {
  return function stopHandler(e) {
    recorder.onComplete = saveRecording;
    recorder.finishRecording();

    const button = e.target;
    button.innerText = 'Start Recording';
    button.removeEventListener('click', stopHandler);
    button.addEventListener('click', startRecording(recorder));
  };
};

const startRecording = (recorder, audio) => {
  return function startHandler(e) {
    audio.resume();
    const button = e.target;
    recorder.startRecording();
    button.innerText = 'Stop Recording';

    button.removeEventListener('click', startHandler);
    button.addEventListener('click', stopRecording(recorder));
  };
};

const initialiseRecorder = audio => stream => {
  recordButton.hidden = false;
  const track = stream.getAudioTracks().pop();
  console.log(track.getSettings());

  const source = audio.createMediaStreamSource(stream);

  const recorder = new WebAudioRecorder(source, { workerDir: "lib/web-audio-recorder/" });
  recorder.setEncoding('mp3');
  recorder.setOptions({ mp3: { bitRate: 160 } });

  recordButton.addEventListener('click', startRecording(recorder, audio));
};


const startButton = document.getElementById('start-button');
startButton.addEventListener('click', e => {
  startButton.hidden = true;
  const audio = new AudioContext();

  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then(initialiseRecorder(audio));
})
