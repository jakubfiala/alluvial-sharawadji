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
const rmsIndicator = document.getElementById('rms-indicator');

const UPLOAD_BASE_PATH = '/upload-recording';

const getUploadURL = ({ timestamp, lat, lng }) => {
  return `${UPLOAD_BASE_PATH}?timestamp=${timestamp}&lat=${lat}&lng=${lng}&soundwalk=${soundwalk}`;
};

if (!('getFloatTimeDomainData' in AnalyserNode.prototype)) {
  AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
      const uint8 = new Uint8Array(array.length);
      this.getByteTimeDomainData(uint8);
      for (var i = 0, imax = array.length; i < imax; i++) {
        array[i] = (uint8[i] - 128) * 0.0078125;
      }
  };
}

const saveBlobAtPosition = blob => position => {
  player.src = URL.createObjectURL(blob);

  const reader = new FileReader();

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
  saveBlobAtPosition(blob)({ timestamp: 0, coords: {lat:0,lng:0} });
  // navigator.geolocation
  //   .getCurrentPosition(
  //     saveBlobAtPosition(blob),
  //     err => console.error(err),
  //     { enableHighAccuracy: true });
};

const toggleRecording = (recorder, audio) => {
  return function stopHandler(e) {
    if (recorder.isRecording()) {
      recorder.onComplete = saveRecording;
      recorder.finishRecording();

      const button = e.target;
      button.innerText = 'Record';
    } else {
      audio.resume();
      const button = e.target;
      recorder.startRecording();
      button.innerText = 'Stop Recording';
    }
  };
};

const visualiser = analyser => {
  const data = new Float32Array(analyser.fftSize);

  const render = () => {
    analyser.getFloatTimeDomainData(data);

    const rms = Math.sqrt(
      Array.from(data)
        .map(sample => (sample / 256) ** 2)
        .reduce((sum, sampleSquared) => sum + sampleSquared, 0) / data.length
    );

    rmsIndicator.style.height = `${rms * 10000 * 60}%`;

    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
};

const initialiseRecorder = audio => stream => {
  recordButton.hidden = false;
  const source = audio.createMediaStreamSource(stream);
  const analyser = audio.createAnalyser();

  source.connect(analyser);
  visualiser(analyser);

  const recorder = new WebAudioRecorder(source, { workerDir: "lib/web-audio-recorder/" });
  recorder.setEncoding('mp3');
  recorder.setOptions({ mp3: { bitRate: 160 } });

  recordButton.addEventListener('click', toggleRecording(recorder, audio));
};


const startButton = document.getElementById('start-button');

startButton.addEventListener('click', e => {
  let countdown = 5;
  const audio = new AudioContext();

  const countdownFn = () => {
    if (countdown) {
      startButton.innerText = countdown;
      countdown -= 1;
      setTimeout(countdownFn, 1000);
    } else {
      startButton.hidden = true;

      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(initialiseRecorder(audio));
    }
  };

  countdownFn();
})
