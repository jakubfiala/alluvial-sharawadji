const soundwalk = location.search
  .slice(1)
  .split('&')
  .filter(q => q.includes('soundwalk='))
  .pop()
  .split('=')
  .pop();

const savedSoundsList = document.getElementById('saved-sounds-list');
const savedSoundsSection = document.getElementById('saved-sounds');

const database = new Dexie("alluvial-sharawadji");
database
  .version(1)
  .stores({
    sounds: '++id,timestamp,soundwalk,uploaded'
  });

const saveBlobLocally = (sound, metadata) => {
  return database.sounds
    .put(Object.assign({}, metadata, { sound, soundwalk, uploaded: false }))
    .then(() => {
      console.info('saved sound to local DB', sound);
      console.dir(metadata);
    })
    .catch(err => {
      console.error('Could not save sound to local DB', sound);
      console.dir(metadata);
    })
};

const createCheckMark = () => {
  const mark = document.createElement('span');
  mark.innerHTML = '&#9989;';
  return mark;
}

const checkPendingUploads = () => {
  database.open()
    .then(() => {
      database.sounds
        .toArray()
        .then(sounds => {
          savedSoundsSection.hidden = !sounds.length;
          while(savedSoundsList.firstChild) savedSoundsList.removeChild(savedSoundsList.lastChild);

          sounds.forEach(s => {
            const listItem = document.createElement('li');
            const itemPlayer = new Audio();
            itemPlayer.controls = true;
            itemPlayer.src = URL.createObjectURL(s.sound);

            listItem.appendChild(itemPlayer);
            savedSoundsList.appendChild(listItem);

            if (s.uploaded) {
              listItem.classList.add('uploaded');
            }

            if (navigator.onLine && !s.uploaded) {
              console.info('trying to upload', s);

              saveBlobAtPosition(s.sound)(
                {
                  timestamp: s.timestamp,
                  coords: { lat: s.lat, lng: s.lng }
                },
                false,
                () => {
                  listItem.classList.add('uploaded');
                  s.uploaded = true;
                  database.sounds.put(s);
                }
              );
            }
          });
        });
    })
};

checkPendingUploads();


window.AudioContext = window.AudioContext || window.webkitAudioContext;

const recordButton = document.getElementById('record-button');
const downloadProgress = document.getElementById('dl-progress');
const player = document.getElementById('player');
const rmsIndicator = document.getElementById('rms-indicator');
const recordButtonText = document.getElementById('record-button-text');

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

const saveBlobAtPosition = blob => (
  position,
  saveLocally = true,
  success = () => {},
  error = () => {}
) => {
  player.src = URL.createObjectURL(blob);
  player.hidden = false;

  console.log(blob, position);
  position = { timestamp: 0, coords: { latitude: 0, longitude: 0 }};

  const metadata = {
    timestamp: position.timestamp,
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  if (saveLocally) saveBlobLocally(blob, metadata);

  const xhr = new XMLHttpRequest();
  xhr.open('PUT', getUploadURL(metadata), true);

  xhr.addEventListener('error', () => output.innerText = `Upload error: ${xhr.status}`);
  xhr.addEventListener('progress', e => downloadProgress.value = e.loaded / e.total);



  xhr.addEventListener('load', () => {
    if (xhr.status !== 200) {
      output.innerText = `Upload error: ${xhr.status}`
      error();
    } else {
      output.innerText = 'upload successful';
      success();
    }
  });

  xhr.send(blob);
  downloadProgress.hidden = false;

  fetch(getUploadURL(metadata), { method: 'PUT', body: blob, mode: 'same-origin' })
    .then(response => {
      if (response.ok) {
        output.innerText = 'upload successful';
      }
    })
    .catch(err => {
      output.innerText = `Upload error: ${err}`;
    });
};

const saveRecording = (recorder, blob) => {
  // uncomment for local debug
  saveBlobAtPosition(blob)({ timestamp: 0, coords: {lat:0,lng:0} });
  // navigator.geolocation
  //   .getCurrentPosition(
  //     saveBlobAtPosition(blob),
  //     err => console.error(err),
  //     { enableHighAccuracy: true });
};

const toggleRecording = (recorder, audio, visualiser) => {
  return function stopHandler(e) {
    if (recorder.isRecording()) {
      recorder.onComplete = saveRecording;
      recorder.finishRecording();
      visualiser.stop();

      const button = e.target;
      recordButtonText.innerText = 'Record';
    } else {
      audio.resume();
      visualiser.start();
      const button = e.target;
      recorder.startRecording();
      recordButtonText.innerText = 'Stop Recording';
    }
  };
};

const createVisualiser = analyser => {
  const data = new Float32Array(analyser.fftSize);

  let frameRequest;
  const visualiser = {
    start() {
      frameRequest = requestAnimationFrame(render);
    },
    stop() {
      cancelAnimationFrame(frameRequest);
    }
  };

  const render = () => {
    analyser.getFloatTimeDomainData(data);

    const rms = Math.sqrt(
      Array.from(data)
        .map(sample => (sample / 256) ** 2)
        .reduce((sum, sampleSquared) => sum + sampleSquared, 0) / data.length
    );

    rmsIndicator.style.height = `${rms * 10000 * 60}%`;

    frameRequest = requestAnimationFrame(render);
  };

  return visualiser;
};

const initialiseRecorder = audio => stream => {
  console.log('initialising');
  recordButton.setAttribute('aria-hidden', 'false');

  const source = audio.createMediaStreamSource(stream);
  const analyser = audio.createAnalyser();

  source.connect(analyser);
  const visualiser = createVisualiser(analyser);

  const recorder = new WebAudioRecorder(source, { workerDir: "lib/web-audio-recorder/" });
  recorder.setEncoding('mp3');
  recorder.setOptions({ mp3: { bitRate: 160 } });

  recordButton.addEventListener('click', toggleRecording(recorder, audio, visualiser));
};


const startButton = document.getElementById('start-button');

startButton.addEventListener('click', e => {
  let countdown = 5;
  const audio = new AudioContext();

  startButton.disabled = true;
  startButton.innerText = 'Starting…';
  setTimeout(() => {
    startButton.setAttribute('aria-hidden', 'true');

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(initialiseRecorder(audio));
  }, 5000);
})
