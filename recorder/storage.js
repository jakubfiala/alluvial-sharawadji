import {
  createCheckMark,
  createSoundListItem
} from './sound-list.js';

const UPLOAD_BASE_PATH = '/upload-recording';
const getUploadURL = soundwalk => metadata => {
  const timestamp = metadata.timestamp;
  const lat = metadata.lat;
  const lng = metadata.lng;

  return `${UPLOAD_BASE_PATH}?timestamp=${timestamp}&lat=${lat}&lng=${lng}&soundwalk=${soundwalk}`;
};

class SoundStorage {
  constructor(dbName, soundwalk, savedSoundsList, savedSoundsSection) {
    this.database = new Dexie(dbName);
    this.soundwalk = soundwalk;
    this.savedSoundsList = savedSoundsList;
    this.savedSoundsSection = savedSoundsSection;

    this.database
      .version(1)
      .stores({
        sounds: '++id,timestamp,soundwalk,uploaded,sound'
      });

    this.checkPendingUploads();
  }

  saveBlobLocally(blob, metadata) {
    const promiseHandler = (resolve, reject) => {
      const reader = new FileReader();

      reader.onload = e => {
        const sound = e.target.result;

        this.database.sounds
          .put(Object.assign({}, metadata, { sound, soundwalk: this.soundwalk, uploaded: false }))
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
  }

  saveBlobRemotely(soundData) {
    return new Promise((resolve, reject) => {
      const sound = soundData.blob;

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', getUploadURL(this.soundwalk)(soundData), true);

      xhr.addEventListener('error', () => output.innerText = `Upload error: ${xhr.status}`);
      // xhr.addEventListener('progress', e => downloadProgress.value = e.loaded / e.total);

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
  }

  saveBlobAtPosition(blob) {
    return position => {
      // position = { timestamp: Date.now(), coords: { latitude: 0, longitude: 0 }};
      const metadata = {
        timestamp: position.timestamp,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      this.saveBlobLocally(blob, metadata)
        .then(this.checkPendingUploads.bind(this));
    };
  }

  checkPendingUploads() {
    this.database.open()
      .then(() => {
        this.database.sounds
          .where('soundwalk')
          .equals(this.soundwalk)
          .reverse()
          .sortBy('timestamp')
          .then(sounds => this.renderSoundList(sounds))
          .catch(err => console.error('Could not retrieve sounds', err));
      })
  }

  renderSoundList(sounds) {
    this.savedSoundsSection.hidden = !sounds.length;
    while(this.savedSoundsList.firstChild) {
      this.savedSoundsList.removeChild(this.savedSoundsList.lastChild);
    }

    sounds.forEach(s => {
      s.blob = new Blob([ s.sound ], { type: 'audio/mpeg' });

      const listItem = createSoundListItem(s);
      this.savedSoundsList.appendChild(listItem);

      if (s.uploaded) {
        listItem.classList.add('uploaded');
      }

      if (navigator.onLine && !s.uploaded) {
        console.info('trying to upload', s);
        listItem.classList.add('uploading');

        this.saveBlobRemotely(s)
          .then(() => {
            listItem.classList.remove('uploading');
            listItem.classList.add('uploaded');
            s.uploaded = true;

            delete s.blob;
            this.database.sounds.put(s);
          })
          .catch(err => {
            listItem.classList.remove('uploading');
            listItem.classList.add('error');
            console.error('Could not upload sound', s, err);
          });
      }
    });
  }
}

export {
  SoundStorage
}
