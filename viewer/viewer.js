const soundwalk = location.search
  .slice(1)
  .split('&')
  .filter(q => q.includes('soundwalk='))
  .pop()
  .split('=')
  .pop();

const soundwalkURL = `/list-recordings?soundwalk=${soundwalk}`;

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
  const sharawadji = new Sharawadji(sounds, map, { debug: true });
}

loadDemo(document.getElementById('view'));
