const DEFAULT_SOUNDWALK = "test";

const soundwalk = location.search
  .slice(1)
  .split('&')
  .filter(q => q.includes('soundwalk='))
  .map(q => q.split('=').pop())
  .pop() || DEFAULT_SOUNDWALK;

const soundwalkLabel = document.getElementById('soundwalk-label');
soundwalkLabel.innerText = soundwalk || '';

const savedSoundsList = document.getElementById('saved-sounds-list');
const savedSoundsSection = document.getElementById('saved-sounds');

const database = new Dexie("alluvial-sharawadji");
database
  .version(1)
  .stores({
    sounds: '++id,timestamp,soundwalk,uploaded,sound'
  });

const saveBlobLocally = (blob, metadata) => {
  const promiseHandler = (resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      const sound = e.target.result;

      database.sounds
        .put(Object.assign({}, metadata, { sound, soundwalk, uploaded: false }))
        .then(() => {
          console.info('saved sound to local DB', sound);
          console.dir(metadata);
          resolve(metadata);
        })
        .catch(err => {
          console.error('Could not save sound to local DB', sound, err);
          console.dir(metadata);
          reject(err);
        });
    };

    reader.readAsArrayBuffer(blob);
  };

  return new Promise(promiseHandler);
};

const createCheckMark = () => {
  const mark = document.createElement('span');
  mark.innerHTML = '&#9989;';
  return mark;
}

const createSoundListItem = s => {
  const listItem = document.createElement('li');
  const itemPlayer = new Audio();
  const itemDate = new Date(s.timestamp);
  const itemLabel = document.createElement('p');
  const playerContainer = document.createElement('div');

  playerContainer.classList.add('sound-player-container');

  itemPlayer.controls = true;
  itemPlayer.src = URL.createObjectURL(s.blob);
  itemLabel.innerText = `🎙 ${itemDate.toLocaleString()}`;

  playerContainer.appendChild(itemPlayer);
  listItem.appendChild(itemLabel);
  listItem.appendChild(playerContainer);

  return listItem;
}

const checkPendingUploads = () => {
  database.open()
  .then(() => {
    database.sounds
    .where('soundwalk')
    .equals(soundwalk)
    .reverse()
    .sortBy('timestamp')
    .then(sounds => {
      savedSoundsSection.hidden = !sounds.length;
      while(savedSoundsList.firstChild) savedSoundsList.removeChild(savedSoundsList.lastChild);

      sounds.forEach(s => {
        s.blob = new Blob([ s.sound ], { type: 'audio/mpeg' });

        const listItem = createSoundListItem(s);
        savedSoundsList.appendChild(listItem);

        if (s.uploaded) {
          listItem.classList.add('uploaded');
        }

        if (navigator.onLine && !s.uploaded) {
          console.info('trying to upload', s);
          listItem.classList.add('uploading');

          saveBlobRemotely(s)
            .then(() => {
              listItem.classList.remove('uploading');
              listItem.classList.add('uploaded');
              s.uploaded = true;

              delete s.blob;
              database.sounds.put(s);
            })
            .catch(err => {
              listItem.classList.remove('uploading');
              listItem.classList.add('error');
              console.error('Could not upload sound', s, err);
            });
        }
      });
    })
    .catch(err => console.error('Could not retrieve sounds', err));
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

const getUploadURL = metadata => {
  const timestamp = metadata.timestamp;
  const lat = metadata.lat;
  const lng = metadata.lng;

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

const saveBlobRemotely = (soundData) => new Promise((resolve, reject) => {
  const sound = soundData.blob;

  const xhr = new XMLHttpRequest();
  xhr.open('PUT', getUploadURL(soundData), true);

  xhr.addEventListener('error', () => output.innerText = `Upload error: ${xhr.status}`);
  xhr.addEventListener('progress', e => downloadProgress.value = e.loaded / e.total);

  xhr.addEventListener('load', () => {
    if (xhr.status >= 300) {
      console.log(xhr.status, xhr.responseText);
      reject();
    } else {
      resolve();
    }
  });

  console.log('sending', sound);
  xhr.send(sound);
});

const saveBlobAtPosition = blob => position => {
  // position = { timestamp: Date.now(), coords: { latitude: 0, longitude: 0 }};
  const metadata = {
    timestamp: position.timestamp,
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  saveBlobLocally(blob, metadata)
    .then(checkPendingUploads);
};

const saveRecording = (recorder, blob) => {
  navigator.geolocation
    .getCurrentPosition(
      saveBlobAtPosition(blob),
      err => console.error(err),
      { enableHighAccuracy: true });
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
      audio.resume().then(() => {
        setTimeout(() => {
          visualiser.start();
          const button = e.target;
          recorder.startRecording();
          recordButtonText.innerText = 'Stop';
        }, 300);
      });

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
      rmsIndicator.style.height = '0%';
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
  console.log('initialising', stream);
  recordButton.setAttribute('aria-hidden', 'false');

  const source = audio.createMediaStreamSource(stream);
  const analyser = audio.createAnalyser();

  source.connect(analyser);
  const visualiser = createVisualiser(analyser);

  const recorder = new WebAudioRecorder(source, { workerDir: "lib/web-audio-recorder/" });
  recorder.setEncoding('mp3');
  recorder.setOptions({ mp3: { bitRate: 320 } });

  recordButton.addEventListener('click', toggleRecording(recorder, audio, visualiser));
};


const startButton = document.getElementById('start-button');

startButton.addEventListener('click', e => {
  let countdown = 5;
  const audio = new AudioContext();
  window.audio = audio;

  startButton.disabled = true;
  startButton.innerText = 'Starting…';
  setTimeout(() => {
    startButton.setAttribute('aria-hidden', 'true');

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(initialiseRecorder(audio));
  }, 5000);
})

let currentVisibility = 'visible';

document.addEventListener('visibilitychange', e => {
  if (currentVisibility == 'hidden' && document.visibilityState == 'visible') {
    location.reload();
  } else {
    currentVisibility = document.visibilityState == 'visible' ? 'visible' : 'hidden';
  }
});
