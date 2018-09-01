const DEFAULT_SOUNDWALK = 'eufonic';

const getQuery = () => {
  return location.search
    .slice(1)
    .split('&')
    .reduce((obj, str) => {
      const kv = str.split('=');
      if (kv.includes('')) return obj;

      obj[kv[0]] = kv[1];
      return obj;
    }, {});
};

const setQuery = query => {
  const queryString = Object
    .entries(query)
    .map(e => e.join('='))
    .join('&');

  const newURL = new URL(location.href);
  newURL.search = queryString;
  history.replaceState({ path: newURL.href }, '', newURL.href);
};

/**
 * throttle wrapper which we need for scrolling listeners: http://www.ianlopshire.com/javascript-scroll-events-doing-it-right/
 *
 * @param      {Function}  callback  The function to throttle
 * @param      {Number}    wait      The minimum time that needs to pass between successive function calls
 * @return     {Function}    { the throttled function }
 */
const throttle = (callback, wait) => {
  let go = true;
  return () => {
    if (go) {
      go = false;
      setTimeout(() => {
        go = true;
        callback.call();
      }, wait);
    }
  };
};

const initialQuery = getQuery();
const soundwalk = initialQuery.soundwalk || DEFAULT_SOUNDWALK;

const soundwalkLabel = document.getElementById('soundwalk-label');
soundwalkLabel.innerText = soundwalk || '';

const soundwalkURL = `/list-recordings?soundwalk=${soundwalk}`;

const mobileOverlay = document.getElementById('mobile-overlay');
const startButton = document.getElementById('start-button');
let requireStartButton = false;

if (/Android|iOS|iPhone|iPad/i.test(navigator.userAgent)) {
  mobileOverlay.hidden = false;
  requireStartButton = true;
}

const loadData = async url => {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch(e) {
    throw new Error(`Could not load sound data: ${e}`);
  }
};

const savePosition = panorama => () => {
  const position = panorama.getPosition();
  const pov = panorama.getPov();

  const lat = position.lat();
  const lng = position.lng();
  const heading = pov.heading;
  const pitch = pov.pitch;

  const newQuery = getQuery();
  Object.assign(newQuery, { lat, lng, heading, pitch });

  localStorage.setItem(`sharawadji-${soundwalk}-lat`, lat);
  localStorage.setItem(`sharawadji-${soundwalk}-lng`, lng);
  localStorage.setItem(`sharawadji-${soundwalk}-heading`, heading);
  localStorage.setItem(`sharawadji-${soundwalk}-pitch`, pitch);
  setQuery(newQuery);
};

const loadDemo = async container => {
  const { lat, lng, heading, pitch, sounds } = await loadData(soundwalkURL);

  const storedLat = localStorage.getItem(`sharawadji-${soundwalk}-lat`);
  const storedLng = localStorage.getItem(`sharawadji-${soundwalk}-lng`);
  const storedHeading = localStorage.getItem(`sharawadji-${soundwalk}-heading`);
  const storedPitch = localStorage.getItem(`sharawadji-${soundwalk}-pitch`);

  const startPosition = new google.maps.LatLng(
    initialQuery.lat || storedLat || lat,
    initialQuery.lng || storedLng || lng);

  const map = new google.maps.Map(container, {
    center: startPosition,
    streetViewControl: true,
    zoom: 12
  });

  const panorama = map.getStreetView();
  panorama.setPosition(startPosition);
  panorama.setPov({
    heading: parseFloat(initialQuery.heading || storedHeading || heading),
    pitch: parseFloat(initialQuery.pitch || storedPitch || pitch) });
  if (!('debug' in initialQuery)) {
    panorama.setVisible(true);
  } else {
    sounds.forEach(sound => {
      const marker = new google.maps.Marker({
        title: `${this.data.name} – ${(new Date(data.timestamp)).toLocaleString()}`,
        position: new google.maps.LatLng(sound.lat, sound.lng),
        map
      });
    });
  }

  google.maps.event.addListener(panorama, 'pano_changed', throttle(savePosition(panorama), 500));
  google.maps.event.addListener(panorama, 'position_changed', throttle(savePosition(panorama), 500));
  google.maps.event.addListener(panorama, 'pov_changed', throttle(savePosition(panorama), 500));

  if (requireStartButton) {
    startButton.addEventListener('click', e => {
      startButton.disabled = true;
      startButton.innerText = 'Loading';
      mobileOverlay.hidden = true;

      const sharawadji = new Sharawadji(sounds, panorama, { debug: ('debug' in initialQuery), compressor: true });
    })
  } else {
    const sharawadji = new Sharawadji(sounds, panorama, { debug: ('debug' in initialQuery), compressor: true });
  }

  const minMovement = 0.2;
  const xOffset =  0; // 0.051000000000000004;
  const yOffset =  0; // -0.045;
  const accelVelocity = 0.00001;
  const turnVelocity = 2.0;

  const roundFloat = function(x, y) {
    return Math.round (x / y) * y;
  };


  const controlLoop = function() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
    if (!gamepads) {
      return;
    }

    var gp = gamepads[0];
    const x = roundFloat(gp.axes[0] + xOffset, minMovement);
    const y = roundFloat(gp.axes[1] + yOffset, minMovement);
    if (x != 0 ) {
      const pov= panorama.pov;
      pov["heading"] = (pov.heading + x * turnVelocity) % 360;
      panorama.setPov(pov);
    }

    if (y != 0) {
      const heading = panorama.getPov().heading;
      const position = panorama.getPosition();
      const newPosition = {};
      newPosition.lat = position.lat() - accelVelocity * y * Math.cos(heading/180*Math.PI);
      newPosition.lng = position.lng() - accelVelocity * y * Math.sin(heading/180*Math.PI);
      panorama.setPosition(new google.maps.LatLng(newPosition.lat, newPosition.lng));
    }

    window.requestAnimationFrame(controlLoop);
  };


  window.addEventListener("gamepadconnected", function(e) {
    var gp = navigator.getGamepads()[e.gamepad.index];
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
                gp.index, gp.id,
                gp.buttons.length, gp.axes.length);
    window.requestAnimationFrame(controlLoop);
  });

}

loadDemo(document.getElementById('view'));
