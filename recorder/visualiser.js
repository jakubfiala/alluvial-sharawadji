if (!('getFloatTimeDomainData' in AnalyserNode.prototype)) {
  AnalyserNode.prototype.getFloatTimeDomainData = function(array) {
      const uint8 = new Uint8Array(array.length);
      this.getByteTimeDomainData(uint8);
      for (var i = 0, imax = array.length; i < imax; i++) {
        array[i] = (uint8[i] - 127.5) * 0.078125;
      }
  };
}

const createVisualiser = (analyser, canvas, bufferSize) => {
  const data = new Float32Array(analyser.fftSize);
  const buffer = (new Array(bufferSize)).map(x => 0);

  canvas.width = bufferSize * 2;
  canvas.height = 100;
  const context = canvas.getContext('2d');
  context.fillStyle = '#3c6a4733';
  context.fillRect(0, 50, canvas.width, 1);
  context.fillRect(bufferSize, 0, 1, 100);

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

    const avg =
      Array.from(data)
        .reduce((sum, sample) => sum + sample, 0) / data.length;

    if (buffer.push(avg) > bufferSize) buffer.shift();

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#3c6a4733';
    context.fillRect(0, 50, canvas.width, 1);
    context.fillRect(bufferSize, 0, 1, 100);
    context.fillStyle = '#3c6a47';
    context.globalAlpha = 0;

    for (let index in buffer) {
      context.globalAlpha = index / bufferSize;
      const value = buffer[index] * 100;
      context.fillRect(index, canvas.height/2 - value * canvas.height/2, 3, value * canvas.height/2);
    }

    frameRequest = requestAnimationFrame(render);
  };

  return visualiser;
};

export { createVisualiser };
