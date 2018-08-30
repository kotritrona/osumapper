/*
 * @Author: Ar3sgice / @kotri_lv204
 * @Date:   Invalid Date
 */
'use strict';
'nope';
'dont use strict';

if(typeof glob == 'undefined') {
  var glob = {};
}

glob.divisor = 4;
glob.distMultiplier = 1.0;
glob.momentumMultiplier = 1.0;
glob.angularMomentumMultiplier = 1.0;

function readRhythmDataJSON(jsonData) {
  if(typeof jsonData == "string") {
    var jsonObj = JSON.parse(jsonData);
  }
  else {
    var jsonObj = jsonData;
  }

  // indices where an object is present.
  var objIndices = jsonObj.objs.map((k,i) => k == 0 ? -1 : i).filter(k => k != -1);
  glob.distMultiplier = jsonObj.distMultiplier;

  return {
    objs: jsonObj.objs,
    objIndices: objIndices,
    predictions: jsonObj.predictions,
    momenta: jsonObj.momenta,
    ticks: jsonObj.ticks,
    timestamps: jsonObj.timestamps,
    sv: jsonObj.sv,
    distMultiplier: jsonObj.distMultiplier
  };
}

// these functions are still not OOP enough
const rhythmDataKeys = ["objs", "predictions", "momenta", "ticks", "timestamps", "sv"];
const rhythmDataKeysExtended = ["objs", "predictions", "momenta", "ticks", "timestamps", "sv",
                                "isSlider", "isSpinner", "isSliding", "isSpinning"];
function filterRhythmDataWithIndices(rhythmData, indices, hasExtraFlags) {
  // this filters every key in rhythmData, since they are arrays, it filters to only objects in indices array
  let rdk = hasExtraFlags ? rhythmDataKeysExtended : rhythmDataKeys;
  return rdk.map(keyName => {
    return [keyName, rhythmData[keyName].filter((d,i) => indices.indexOf(i) != -1)];
  }).reduce((obj, arr) => (obj[arr[0]] = arr[1], obj), {});
}

function populateRhythmDataWithObjectChoice(rhythmData) {
  // we should use integers here instead of bools, since there is always chance for them to become a chosen nn part
  rhythmData.isSlider = rhythmData.predictions.map(k => k[2]);
  rhythmData.isSpinner = rhythmData.predictions.map(k => k[3]);
  rhythmData.isSliding = rhythmData.predictions.map(k => k[4]);
  rhythmData.isSpinning = rhythmData.predictions.map(k => k[5]);
  return rhythmData;
}

function getDebugData() {
 return {
  objs: [0, 0, 0, 1, 1, 1, 0, 1, 1, 0],
  predictions: [[0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0], [1, 0, 1, 0, 1, 0],
                [1, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0], [1, 1, 0, 0, 0, 0], [1, 0, 1, 0, 1, 0], [0, 0, 0, 0, 1, 0]
  ],
  momenta: [[0.3, 0.003], [0.3, 0.003], [0.3, 0.003], [0.3, 0.003], [0.3, 0.003],
            [0.3, 0.003], [0.3, 0.003], [0.3, 0.003], [0.3, 0.003], [0.3, 0.003]
  ],
  ticks: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
  timestamps: [4700, 4825, 4950, 5075, 5200, 5325, 5450, 5575, 5700, 5825],
  sv: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  distMultiplier: 1.0
 };
}

async function debugFlowEvaluator(evaluatedRhythm) {
  // var debugData = readRhythmDataJSON(JSON.stringify(getDebugData()));
  // var debugResult = preprocessRhythmData(JSON.stringify(getDebugData()));
  // window.debugData = debugData;
  // window.debugResult = debugResult;
  // console.log(readRhythmDataJSON(JSON.stringify(debugData)));

  // we have to wait a little longer
  print("begin debugging flowEvaluator");
  var debugData = evaluatedRhythm || await (await fetch("evaluatedRhythm.json")).json();
  // var debugData = await debugRhythmPredictor();
  var debugResult = preprocessRhythmData(debugData);
  print("flowEvaluator done");
  window.flowEvaluatorData = debugData;
  window.flowEvaluatorResult = debugResult;
  return debugResult;
}

// close your eyes
// hana ni wa ame wo, sora ni wa kaze to
// konayuki ga slow motion de
// kimieto ochiru...
// tomadoi ga namida no imi sono subete
// kokokara can you forget...

function getSliderShape(rhythmData, i) {
  return Math.floor(Math.random() * 5);
}

// this should be imported from a common json to be shared between lmjs and here
const sliderShapeDetails = [{
  rotation: 0,
  length: 1
}, {
  rotation: -0.40703540572409336,
  length: 0.97
}, {
  rotation: 0.40703540572409336,
  length: 0.97
}, {
  rotation: -0.20131710837464062,
  length: 0.97
}, {
  rotation: 0.20131710837464062,
  length: 0.97
}].map(shape => {
  shape.cos = Math.cos(shape.rotation);
  shape.sin = Math.sin(shape.rotation);
  return shape;
});

function getSliderSkipCount() {
  return 1;
}

// this is only algorithm1!!!
const maxSliderLength = 4;
function convertSliderInRhythmData(rhythmData) {
  var skipThis = 0;
  var newObjIndices = [], sliderTicks = [], sliderShapes = [];

  var objCount = rhythmData.objs.length;

  for(let i=0; i<objCount; i++) {
    if(skipThis >= 1) {
      skipThis--;
      rhythmData.isSlider[i] = 0; // why???
      continue;
    }
    if(rhythmData.isSlider[i]) { // this one is a slider!
      if(i == objCount-1) { // Last Note.
        newObjIndices.push(i);
        sliderTicks.push(maxSliderLength);
        sliderShapes.push(getSliderShape(rhythmData, i));
        continue;
      }
      if(rhythmData.ticks[i+1] > rhythmData.ticks[i] + maxSliderLength) {
        newObjIndices.push(i);
        sliderTicks.push(maxSliderLength);
        sliderShapes.push(getSliderShape(rhythmData, i));
      }
      else {
        let shape = getSliderShape(rhythmData, i);
        skipThis = getSliderSkipCount(shape);
        newObjIndices.push(i);
        sliderTicks.push(Math.max(1, rhythmData.ticks[i+1] - rhythmData.ticks[i]));
        sliderShapes.push(shape);
      }
    }
    else { // not a slider!
      newObjIndices.push(i);
      sliderTicks.push(0);
      sliderShapes.push(0);
    }
  }
  rhythmData = filterRhythmDataWithIndices(rhythmData, newObjIndices, true);

  rhythmData.sliderTicks = sliderTicks;
  rhythmData.sliderShapes = sliderShapes;
  rhythmData.sliderLengthBase = rhythmData.sv.map(v => Math.floor(v / glob.divisor));
  rhythmData.sliderLengths = rhythmData.sliderLengthBase.map((lb, i) => lb * sliderTicks[i] * sliderShapeDetails[sliderShapes[i]].length);

  return rhythmData;
}

function populateRhythmDataWithDifferences(rhythmData) {
  var timestampsPlus1 = rhythmData.timestamps.slice(1);
  if(timestampsPlus1.length >= 2) {
    timestampsPlus1 = timestampsPlus1.concat(2*timestampsPlus1[timestampsPlus1.length-1] - timestampsPlus1[timestampsPlus1.length-2]);
  }
  else {
    timestampsPlus1 = timestampsPlus1.concat(rhythmData.timestamps[rhythmData.timestamps.length-1]);
  }
  var timestampsAfter = timestampsPlus1.map((d, i) => d - rhythmData.timestamps[i]);
  var timestampsBefore = [4772].concat(timestampsAfter.slice(0, timestampsAfter.length-1)); // why 4772?????

  rhythmData.timestampsPlus1 = timestampsPlus1;
  rhythmData.timestampsAfter = timestampsAfter;
  rhythmData.timestampsBefore = timestampsBefore;
  rhythmData.noteDistances = timestampsBefore.map((d, i) => rhythmData.momenta[i][0] * d * glob.momentumMultiplier);
  rhythmData.noteAngles = timestampsBefore.map((d, i) => rhythmData.momenta[i][1] * d * glob.angularMomentumMultiplier);

  return rhythmData;
}

function preprocessRhythmData(jsonData) {
  var rhythmData = readRhythmDataJSON(jsonData);
  glob.distMultiplier = rhythmData.distMultiplier;

  // "VLIW DSP"
  rhythmData = filterRhythmDataWithIndices(rhythmData, rhythmData.objIndices);
  rhythmData = populateRhythmDataWithObjectChoice(rhythmData);
  rhythmData = convertSliderInRhythmData(rhythmData);
  rhythmData = populateRhythmDataWithDifferences(rhythmData);

  return rhythmData;
}