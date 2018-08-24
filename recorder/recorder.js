import { SoundStorage } from './storage.js';
import { createVisualiser } from './visualiser.js';

const DEFAULT_SOUNDWALK = "test";

const soundwalk = location.search
  .slice(1)
  .split('&')
  .filter(q => q.includes('soundwalk='))
  .map(q => q.split('=').pop())
  .pop() || DEFAULT_SOUNDWALK;

const savedSoundsList = document.getElementById('saved-sounds-list');
const savedSoundsSection = document.getElementById('saved-sounds');

const canvas = document.getElementById('waveform');

const storage = new SoundStorage(
  'alluvial-sharawadji',
  soundwalk,
  savedSoundsList,
  savedSoundsSection
);

const soundwalkLabel = document.getElementById('soundwalk-label');
soundwalkLabel.innerText = soundwalk || '';


window.AudioContext = window.AudioContext || window.webkitAudioContext;

const recordButton = document.getElementById('record-button');
const recordSection = document.getElementById('recording-ui');
const downloadProgress = document.getElementById('dl-progress');
const player = document.getElementById('player');
const rmsIndicator = document.getElementById('rms-indicator');
const recordButtonText = document.getElementById('record-button-text');

const saveRecording = (recorder, blob) => {
  navigator.geolocation
    .getCurrentPosition(
      position => SoundStorage.saveBlobAtPosition(position)(blob),
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

const initialiseRecorder = audio => stream => {
  recordSection.hidden = false;

  const source = audio.createMediaStreamSource(stream);
  const analyser = audio.createAnalyser();

  source.connect(analyser);
  const visualiser = createVisualiser(analyser, canvas, 512);

  recorder = new WebAudioRecorder(source, { workerDir: "lib/web-audio-recorder/" });
  recorder.setEncoding('mp3');
  recorder.setOptions({ mp3: { bitRate: 320 } });

  recordButton.addEventListener('click', toggleRecording(recorder, audio, visualiser));
};


const startButton = document.getElementById('start-button');
// this is awful but doing anything else would require like 1000 extra lines of code
var recorder;

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
  }, 0);
})

let currentVisibility = 'visible';

document.addEventListener('visibilitychange', e => {
  if (currentVisibility == 'hidden' && document.visibilityState == 'visible') {
    if (recorder && !recorder.isRecording()) location.reload();
  } else {
    currentVisibility = document.visibilityState == 'visible' ? 'visible' : 'hidden';
  }
});
