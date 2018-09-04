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

/*
 * Use a worker to process FFT.
 */
function createFFTWorker() {
  var worker = new Worker('fft_worker.js');
  worker.workerCallback = function(){};
  worker.onmessage = function(evt) {
    worker.workerCallback(evt.data);
  };
  worker.workFFT = function(timestamps, sig, sampleRate, fftSize, snapInterval) {
    worker.postMessage({
      timestamps: timestamps,
      sig: sig,
      sampleRate: sampleRate,
      fftSize: fftSize,
      snapInterval: snapInterval
    });
    return new Promise((res, rej) => {
      worker.workerCallback = res;
    })
  };
  return worker;
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
  var wavData = await glob.fftWorker.workFFT(timestamps, Array.from(channelData), sampleRate, fftSize, [0]);
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

  var predictorParams = [tf.tensor4d(input1), tf.tensor3d(input2)];

  var prediction = model.predict(predictorParams);

  var result = nj.reshape(Array.from(prediction.dataSync()), [divData.length, resultLength]);
  var result2 = await predictMomenta(predictorParams, divData.length, options);

  return [result.tolist(), result2.tolist()];
}

async function predictMomenta(predictorParams, dataLength, options) {
  options = options || {};
  var modelPath = options.modelPathMomentum || 'lesser-model/model_momentum.json';
  const resultLength = 2;

  if(glob.momentumModel) {
    var model = glob.momentumModel;
  }
  else {
    var model = glob.momentumModel = await tf.loadModel(modelPath);
  }

  var prediction = model.predict(predictorParams);
  return nj.reshape(Array.from(prediction.dataSync()), [dataLength, resultLength]);
}

/*
 *  Convert raw prediction to first-step actual prediction
 *  @param     predsAndMomenta    array[tickCount][6] & ..[2]   raw predictions and momenta
 *  @param     divData            array[tickCount][divisor+3]   divData
 *  @param     options {
 *               distMultiplier   number
 *               noteDensity      number
 *               sliderFavor      number
 *               divisorFavor     number[divisor]
 *               timestamps       timestamps
 *               ticks            ticks
 *               momentumMinMax   momentumMinMax
 *             }
 */
function predictNoteDetails(predsAndMomenta, divData, options) {
  // predictedValues: isNote, isCircle, isSlider, isSpinner, isSliding, isSpinning, momentum, angularMomentum
  options = options || {};
  const distMultiplier = options.distMultiplier || 1;
  const noteDensity = options.noteDensity || 0.4;
  const sliderFavor = options.sliderFavor || 0;
  const divisorFavor = options.divisorFavor || [0, 0, 0, 0];
  const momentumMinMax = options.momentumMinMax;

  var [preds, momenta] = predsAndMomenta;

  preds = preds.map((d,i) => {
    d[0] += divisorFavor.reduce((t, a, j) => t + a * divData[i][j], 0);
    d[2] += sliderFavor;
    return d;
  })

  // Predict is_obj using note_density
  var objPreds = preds.map(d => d[0]);
  var targetCount = Math.round(noteDensity * objPreds.length);
  var borderline = objPreds.slice().sort((a,b) => a - b)[objPreds.length - targetCount];
  var isObjPred = objPreds.map(d => d > borderline ? 1 : 0);

  // don't predict spinner here for now
  preds = preds.map((d,i) => {
    d[0] = isObjPred[i];
    d[1] = d[0] * (d[1] > d[2] ? 1 : 0);
    d[2] = d[0] * (1 - d[1]);
    d[3] = 0;
    d[4] = d[4] > 0 ? 1 : 0;
    d[5] = d[5] > 0 ? 1 : 0;
    return d;
  })

  var sv = divData.map(d => (d[6] + 1) * 150);

  window.mmta = momenta;
  window.mmm = momentumMinMax;

  // apply momentum minmax
  // ????? how does it even got negative!!! must research this later!!!
  // todo!!!
  momenta = momenta.map(d => {
    d[0] = Math.abs((d[0] + 1) / 2 / 0.8 * (momentumMinMax.max[0] - momentumMinMax.min[0]) + momentumMinMax.min[0]);
    d[1] = (d[1] + 1) / 2 / 0.8 * (momentumMinMax.max[1] - momentumMinMax.min[1]) + momentumMinMax.min[1];
    return d;
  })

  window.mmta2 = momenta;

  return {
    objs: isObjPred,
    predictions: preds,
    timestamps: options.timestamps,
    ticks: options.ticks,
    momenta: momenta,
    sv: sv,
    distMultiplier: distMultiplier
  };
}

async function debugRhythmFromAudioBuffer(r) { // set glob.baseOsuFile
  var cdata = r.getChannelData(0);

  if(!glob.baseMap) {
    var mapData = await fetch(glob.baseOsuFile || "phronesis.osu");
    var mapText = await mapData.text();
    print("map fetched");
    glob.baseMap = load_map(mapText);
  }

  print("loadmap end, resarray start...");
  await new Promise(res => setTimeout(res, 100));
  var timeLimit = Math.floor(cdata.length / r.sampleRate * 1000 - 3000);
  var resultArray = window.resultArray = getAllDivData(timeLimit);

  // must make it a multiple of 16.
  cutTTD(resultArray, 16);
  var {timestamps, ticks, divData} = resultArray;

  print("resarray end, fetch minmax start...");

  var minmax = await (await fetch("lesser-model/momentum_minmax.json")).json();

  print("fetch minmax end, predict start...");

  var noteDetails = await predictNotes(timestamps, cdata, divData).then(result => {
      var pred = window.pred = result;
      print("predict end, pred detail start");
      return window.noteDetails = predictNoteDetails(pred, divData, {
          timestamps: timestamps,
          ticks: ticks,
          momentumMinMax: minmax,
          distMultiplier: 0.7,
          sliderFavor: 0,
          divisorFavor: [0, 0, 0, 0],
          noteDensity: 0.4
      });
  }).catch(e => console.log(e));
  print("pred detail end");
  return noteDetails;
}

async function debugRhythmPredictor(musicArrayBuffer) {
  if(!musicArrayBuffer) {
    var filename = glob.musicFilename = "phronesis.mp3";
    glob.baseOsuFile = "phronesis.osu";

    print("fetch music start...");
    var r = await fetch("Rakuen PROJECT.ogg", {
        responseType: "arrayBuffer"
    }).then(z => z.arrayBuffer()).then(z => {
        print("fetch OK, decode audioBuffer start...");
        var auc = new AudioContext();
        return auc.decodeAudioData(z);
    }).catch(e => console.log(e));
  }
  else {
    print("decode audioBuffer start...");
    var auc = new AudioContext();
    var r = await auc.decodeAudioData(musicArrayBuffer).catch(e => console.log(e));
  }

  print("loaded audioBuffer, loadmap start...");
  var rhythmData = await debugRhythmFromAudioBuffer(r);
  return rhythmData;
}

glob.fftWorker = createFFTWorker();