importScripts("numjs.min.js");

/*
 * array data interpolator
 */
function interpolateArray(arr, n) {
  if(n%1 == 0) {
    return arr[n];
  }
  else if(n < 0) {
    return arr[0];
  }
  else if(n >= arr.length-1) {
    return arr[arr.length-1];
  }
  else {
    var k = n%1;
    return arr[Math.floor(n)] * (1-k) + k * arr[Math.ceil(n)];
  }
}

/*
 *  http://left-pad.io
 *  @param    arr           array
 *  @param    size          size
 *  (it will always pad 0 at right)
 */
function padArray(arr, size) {
  if(arr.length < size) {
    return arr.concat(new Array(size - arr.length).fill(0));
  }
  else if(arr.length > size) {
    return arr.slice(0, size);
  }
  return arr;
}

/*
 *  Samplerate converters for FFT data
 *  because webaudio somehow reads 48000 sampleRate data from 44100 files
 */
function freqs48kTo44_1k(arr) {
  return new Array(arr.length).fill(0).map((_, i) => interpolateArray(arr, i * 44100 / 48000));
}

function freqs44_1kTo48k(arr) {
  return new Array(arr.length).fill(0).map((_, i) => i * 48000 / 44100 > arr.length ? 0 : interpolateArray(arr, i * 48000 / 44100));
}

/*
 *  Does a nice FFT at given timepoint
 *  @param    sig           sliced signal
 *  @param    fftSize       signal length
 *  @returns  {
 *              amp         amplitude, array of shape [fftSize]
 *              phase       phase, array of shape [fftSize]
 *            }
 */
function getFreqs(sig, fftSize) {
  // I still think [].slice.call is cooooooler
  var sigA = padArray(Array.from(sig), fftSize);
  // add imaginary part
  var dimzeros = nj.zeros(sigA.length);
  var stacked = nj.stack([sigA, dimzeros]).transpose();
  var fftResult = nj.fft(stacked).tolist();
  return {
    amp: fftResult.map(a => (a[0]**2 + a[1]**2) **0.5),
    phase: fftResult.map(a => Math.atan2(a[1], a[0]))
  };
}

/*
 *  Slices wave for a fft size at given point
 *  @param    ms            millisecs
 *  @param    sig           single-channel audio signal
 *  @param    sampleRate    sample rate
 *  @param    size          slice length
 *  @returns  sigSlice      sliced signal
 */
function sliceWaveAt(ms, sig, sampleRate, size) {
  var ind = Math.floor(ms/1000 * sampleRate);
  var min = Math.max(0, Math.floor(ind - size/2));
  return sig.slice(min, min + size);
}

/*
 *  Mixes ChannelData[0] and ChannelData[1]
 */
function LRMix(sigL, sigR) {
  return Array.from(sigL).map((d,i) => (d + sigR[i]) / 2);
}

/*
 *  Reads wave data at certain timestamps
 *  @param    ms            millisec
 *  @param    sig           single-channel audio signal
 *  @param    sampleRate    always 48000 because webaudio somehow upsamples 44100 audio
 *  @param    fftSize       fft_size length of fft audio cut
 *  @param    options {
 *              freqLow     frequency lower limit
 *              freqHigh    frequency upper limit
 *            }
 *  @returns  fftResult {
 *              amp         amplitude array
 *              phase       phase array
 *            }
 */
function getWaveDataAt(ms, sig, sampleRate, fftSize, options) {
  options = options || {};
  var freqHigh = options.freqHigh || Math.floor(sampleRate/2);
  var freqLow = options.freqLow || 0;

  // we must use single sig here!!! not both channels.
  var wavSlice = sliceWaveAt(ms, sig, sampleRate, fftSize);

  var fftResult = getFreqs(wavSlice, fftSize);
  fftResult.amp = fftResult.amp.slice(Math.floor(fftSize * freqLow/sampleRate), Math.floor(fftSize * freqHigh/sampleRate));
  fftResult.phase = fftResult.phase.slice(Math.floor(fftSize * freqLow/sampleRate), Math.floor(fftSize * freqHigh/sampleRate));

  return fftResult;
}

/*
 *  Reads wave data at certain timestamps
 *  @param    timestamps    array of integers of time value in ms
 *  @param    sig           single-channel audio signal
 *  @param    samplerate    always 48000 because webaudio somehow upsamples 44100 audio
 *  @param    fftSize       length of a short audio slice used in fft
 *  @param    snapInterval  array of decimals like [-0.1, 0, 0.1] to include some data around every timestamp
 *  @returns  data          array of shape [timestamps.length, snapInterval.length, 32, 2], normalized
 */
function readWavData(timestamps, sig, sampleRate, fftSize, snapInterval) {
  fftSize = fftSize || 128;
  sampleRate = sampleRate || 48000;
  snapInterval = snapInterval || [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];

  var sigMax = nj.max(sig);
  var normalizedSig = sig.map(a => a / sigMax);

  // Modify the phase variance
  const phaseStd = Math.PI / Math.sqrt(3);

  var timestampInterval = timestamps.slice(1).map((d,k) => d - timestamps[k]);
  timestampInterval = timestampInterval.concat(timestampInterval[timestampInterval.length-1]);

  var data = [];
  for(let sz of snapInterval) {
    let currentAmps = [];
    var dataR = timestamps.map((coord, i) => {
      var fftResult = getWaveDataAt(Math.max(0, Math.min(sig.length - fftSize, coord + timestampInterval[i] * sz)), sig, sampleRate, fftSize, {
        freqHigh: Math.floor(sampleRate/4)
      });
      currentAmps.push(fftResult.amp);
      return fftResult;
    });
    var mean = nj.mean(currentAmps);
    var std = nj.std(currentAmps);
    data.push(dataR.map(d => [d.amp.map(amp => (amp - mean) / std), d.phase.map(phase => phase / phaseStd)]));
  }

  return nj.array(data).transpose([1,0,3,2]).tolist();
}

function message() {
	postMessage("hello world");
}

/*
 *  Event function
 *  @input    hmm           hmm
 *  @output   hmm           hmm
 */
self.addEventListener("message", function(evt) {
	var values = evt.data;
	var retValue = readWavData(values.timestamps, values.sig, values.sampleRate, values.fftSize, values.snapInterval);
	postMessage(retValue); // output: array of {b: input, v: calcWeight(input) }
});