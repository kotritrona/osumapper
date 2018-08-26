/*
* @Author: Ar3sgice
* @Date:   Invalid Date
*/

'use strict';

// global vars

var glob = {};

function processAudioData(arrayBuffer) {
  var auc = new AudioContext();
  return auc.decodeAudioData(z).then(getWaveData);
}
function getWaveData(audioData) {
  var cdata = audioData.getChannelData(0);
  var sliced_cdata = Array.from(cdata.slice(48000 * 30, 48000 * 30 + 64));
  var dimed_cdata = nj.zeros(sliced_cdata.length);
  var stacked = nj.stack([sliced_cdata, dimed_cdata]).transpose();
  var a = nj.fft(stacked);
  var a1 = a.tolist().map(a => (a[0]**2 + a[1]**2) **0.5);
  var a2 = new Array(32).fill(0).map((_, i) => i * 44100 / 48000 > 32 ? 0 : interpolateArray(a1, i * 44100 / 48000));
}

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

function padArray(arr, size) {
  if(arr.length < size) {
    return arr.concat(new Array(size - arr.length).fill(0));
  }
  else if(arr.length > size) {
    return arr.slice(0, size);
  }
  return arr;
}

function freqs48kTo44_1k(arr) {
  return new Array(arr.length).fill(0).map((_, i) => interpolateArray(arr, i * 44100 / 48000));
}

function freqs44_1kTo48k(arr) {
  return new Array(arr.length).fill(0).map((_, i) => i * 48000 / 44100 > arr.length ? 0 : interpolateArray(arr, i * 48000 / 44100));
}

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

function sliceWaveAt(ms, sig, sampleRate, size) {
  var ind = Math.floor(ms/1000 * sampleRate);
  var min = Math.max(0, Math.floor(ind - size/2));
  return sig.slice(min, min + size);
}

function LRMix(sigL, sigR) {
  return sigL.map((d,i) => (d + sigR[i]) / 2);
}

/*
 *  Reads wave data at certain timestamps
 *  @param    ms            millisec
 *  @param    sig           single-channel audio signal
 *  @param    samplerate    always 48000 because webaudio somehow upsamples 44100 audio
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
    window.dataR = dataR;
    data.push(dataR.map(d => [d.amp.map(amp => (amp - mean) / std), d.phase.map(phase => phase / phaseStd)]));
  }

  return nj.array(data).transpose([1,0,3,2]).tolist();
}

async function predictNotes(timestamps, channelData, divDataSource, options) {
  options = options || {};
  var fftSize = options.fftSize || 128;
  var fftCuttedSize = options.fftSize / 4 || 32;
  var timeInterval = options.timeInterval || 16;
  var sampleRate = options.sampleRate || 48000;
  var modelPath = options.modelPath || 'lesser-model/model.json';
  var resultLength = options.resultLength || 6;

  var divLength = divDataSource[0] ? divDataSource[0].length : 7;
  var wavData = readWavData(timestamps, Array.from(channelData), sampleRate, fftSize, [0]);
  wavData = wavData.slice(0, wavData.length - wavData.length % timeInterval);
  var divData = divDataSource.slice(0, divDataSource.length - divDataSource.length % timeInterval);

  if(glob.model) {
    var model = glob.model;
  }
  else {
    var model = glob.model = await tf.loadModel(modelPath);
  }

  var input1 = nj.reshape(wavData, [wavData.length / timeInterval, timeInterval, fftCuttedSize, 2]).tolist();
  var input2 = nj.reshape(divData, [divData.length / timeInterval, timeInterval, divLength]).tolist();

  var prediction = model.predict([tf.tensor4d(input1), tf.tensor3d(input2)]);
  var result = nj.reshape(Array.from(prediction.dataSync()), [divData.length, resultLength]);

  return result;
}