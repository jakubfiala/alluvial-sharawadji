const DEFAULT_SOUNDWALK = "test";

const soundwalk = location.search
      .slice(1)
      .split('&')
      .filter(q => q.includes('soundwalk='))
      .map(q => q.split('=').pop())
      .pop() || DEFAULT_SOUNDWALK;

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

const loadDemo = async container => {
  const { lat, lng, heading, pitch, sounds } = await loadData(soundwalkURL);

  console.log(sounds);

  const mapOptions = {
    position: new google.maps.LatLng(lat, lng),
    pov: { heading: parseFloat(heading), pitch: parseFloat(pitch) }
  };

  const map = new google.maps.StreetViewPanorama(container, mapOptions);

  if (requireStartButton) {
    startButton.addEventListener('click', e => {
      startButton.disabled = true;
      startButton.innerText = 'Loading';
      mobileOverlay.hidden = true;

      const sharawadji = new Sharawadji(sounds, map, { debug: true, compressor: true });
    })
  } else {
    const sharawadji = new Sharawadji(sounds, map, { debug: true, compressor: true });
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
      const pov= map.pov;
      pov["heading"] = (pov.heading + x * turnVelocity) % 360;
      map.setPov(pov);
    }

    if (y != 0) {
      const heading = map.pov.heading;
      const position = map.position;
      const newPosition = {};
      newPosition.lat = position.lat() - accelVelocity * y * Math.cos(heading/180*Math.PI);
      newPosition.lng = position.lng() - accelVelocity * y * Math.sin(heading/180*Math.PI);
      map.setPosition(newPosition);
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
