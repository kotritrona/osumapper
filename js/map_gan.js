/*
 * @Author: Ar3sgice / @kotri_lv204
 * @Date:   Invalid Date
 */

'use strict';
'use namespace std';

if(typeof tf == 'undefined') {
    console.log("should load tfjs before map_gan.js");
}

if(typeof GANParams == 'undefined') {
    var GANParams = {
        "goodEpoch" : 6,
        "maxEpoch" : 25,
        "noteGroupSize" : 10,
        "gEpochs" : 7,
        "cEpochs" : 1,
        "gBatch" : 50,
        "gInputSize" : 50,
        "cTrueBatch" : 10,
        "cFalseBatch" : 10
    };
}

if(typeof glob == 'undefined') {
    var glob = {};
}

const dcmFeatureLength = 6;

// input the preprocessed maps = flow_dataset["maps"]
// ... I think I should just use a binary file it's easier to read that way
// they are all in (10,6)s anyways
function loadDiscriminatorDataset(jsonData) {
    var dcmDataset = JSON.parse(jsonData);
    return dcmDataset;
}

/*
 * stackoverflow#6274339
 * Shuffles array in place.
 * @param      array        a items An array containing the items.
 * @returns    itself
 */
function shuffleArray(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

/*
 * stackoverflow#6274339
 * Shuffles two array in place at the same time.
 * @param      [array,array]     a items An array containing the items.
 * @returns    itself
 */
function shuffleTwoArrays(w) {
    var j, x, i;
    var [a,b] = w;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
        x = b[i];
        b[i] = b[j];
        b[j] = x;
    }
    return [a,b];
}

/*
 *  Shuffles the discriminator dataset.
 */
function shuffleDiscriminatorDataset(discrimatorDataset) {
    return shuffleArray(discrimatorDataset);
}


/*
 *  Builds up the discriminator model.
 *  @returns    dcmModel       tf.model       discriminator model
 */
function constructDiscriminatorModel() {
    const input = tf.input({shape: [GANParams.noteGroupSize, dcmFeatureLength]});
    // const rnn = tf.layers.conv1d({units: 32, filters: 3, kernelSize: 3}); // problem!!
    const rnn = tf.layers.simpleRNN({units: 32, returnSequences: false}); // problem!!
    //const flat = tf.layers.flatten(); // problem!!
    const denseLayer1 = tf.layers.dense({units: 64, activation: 'relu'});

    // when training the generator model, it will throw "computeMask for RNN is not yet implemented"
    // since I don't know how to implement it either, we workaround with the computeMask of another layer
    rnn.computeMask = denseLayer1.computeMask;

    const finalLayer = tf.layers.dense({units: 1, activation: 'tanh'});

    const output = finalLayer.apply(denseLayer1.apply(rnn.apply(input)));
    const model = tf.model({inputs: input, outputs: output});

    const optimizer = tf.train.adam(0.001);
    model.compile({optimizer: optimizer, loss: 'meanSquaredError'});

    return model;
}

function inblockLoss(vg) { // variable generated
    // var wallVarL = tf.where(tf.less(vg, 0.2), tf.sub(0.3, vg).square(), tf.zerosLike(vg));
    // var wallVarR = tf.where(tf.greater(vg, 0.8), tf.sub(vg, 0.7).square(), tf.zerosLike(vg));

    // somehow tfjs does not support gradients for tf.less and tf.greater
    // so, let us welcome: ReLU!!!
    var wallVarL = tf.sub(0.1, vg).relu();
    var wallVarR = tf.sub(vg, 0.9).relu();

    return tf.mean(tf.mean(wallVarL.add(wallVarR), 2), 1);
}

function inblockTrueness(vg) {
    var wallVarL = tf.where(tf.less(vg, 0), tf.onesLike(vg), tf.zerosLike(vg));
    var wallVarR = tf.where(tf.greater(vg, 1), tf.onesLike(vg), tf.zerosLike(vg));

    return tf.mean(tf.mean(wallVarL.add(wallVarR), 2), 1);
}

function cutMapChunks(c, chunkSize, stepSize) {
    // check if c is tensor!!! if c is tensor this needs to change slice params
    var r = [];
    for (let i=0; i < Math.floor((c.shape[0] - chunkSize) / stepSize); i++) {
        var chunk = c.slice(i * stepSize, i * stepSize + chunkSize);
        r.push(chunk);
    }
    return tf.stack(r);
}

function constructMap(varTensor, extvar) {
    // var varTensor = tf.toFloat(varTensor);
    var wallL = 0.1, wallR = 0.9, wallT = 0.15, wallB = 0.85, xMax = 512, yMax = 384;
    var out = [];
    var cp = tf.tensor1d([256, 192, 0, 0]);
    var phase = 0;

    // this is totally not half tensor!!!!!
    var halfTensor = Math.floor(varTensor.shape[1]/4);

    // length multiplier
    const lengthMultiplier = extvar.lengthMultiplier || 1;

    // notedists
    const beginOffset = extvar.begin || 0;

    var batchSize = varTensor.shape[0];

    // tf.slice uses SIZE instead of END as second param.
    const sliceAndBatchify = (arr, beginOffset, len) => {
        if(arr instanceof tf.Tensor) {
            var sliceEnd = len;
        }
        else {
            var sliceEnd = beginOffset + len;
        }
        return tf.tile(tf.expandDims(tf.tensor(arr.slice(beginOffset, sliceEnd)), 0), [batchSize, 1]);
    };
    const noteDistancesNow = sliceAndBatchify(extvar.noteDistances, beginOffset, halfTensor).mul(lengthMultiplier);
    const noteAnglesNow = sliceAndBatchify(extvar.noteAngles, beginOffset, halfTensor);
    const isSlider = extvar.isSlider;
    const sliderLengths = extvar.sliderLengths;
    const sliderShapes = extvar.sliderShapes;

    // this is a global const
    const sliderShapeDetails = extvar.sliderShapeDetails;

    // init
    var l = noteDistancesNow, sl = noteDistancesNow.mul(0.7), sr = noteAnglesNow;

    var cosList = varTensor.slice([0, 0], [-1, halfTensor * 2]);
    var sinList = varTensor.slice([0, halfTensor * 2], [-1, halfTensor * 2]);
    var lenList = tf.sqrt(tf.square(cosList).add(tf.square(sinList)));
    cosList = cosList.div(lenList);
    sinList = sinList.div(lenList);

    wallL = tf.add(0.05 * xMax, l.mul(0.5));
    wallR = tf.add(0.05 * xMax, l.mul(-0.5));
    wallT = tf.add(0.05 * yMax, l.mul(0.5));
    wallB = tf.add(0.05 * yMax, l.mul(-0.5));
    var rerand = tf.greater(l, yMax / 2);
    var notRerand = tf.lessEqual(l, yMax / 2);

    // hmm is there a better way?
    var columnAt = (tensor, col) => tensor.slice([0, col], [-1, 1]).squeeze();

    // generate
    var [_px, _py] = extvar.startPos || [256, 192];
    var _pa = 0;
    // this is not important since the first position starts at _ppos + Δpos
    var _x = 256, _y = 192;
    for(let k=0; k < halfTensor; k++) {
        let noteIndex = beginOffset + k;
        // r_max = 192, r = 192 * k, theta = k * 10
        let rerandX = columnAt(varTensor, k).mul(xMax/2).add(xMax/2);
        let rerandY = columnAt(varTensor, k + halfTensor*2).mul(yMax/2).add(yMax/2);

        let deltaValueX = columnAt(l, k).mul(columnAt(cosList, k));
        let deltaValueY = columnAt(l, k).mul(columnAt(sinList, k));

        // It is tensor calculation batched 8~32 each call, so if/else do not work here.
        // let wallValueL = tf.lessEqual(_px, columnAt(wallL, k));
        // let wallValueR = tf.greaterEqual(_px, columnAt(wallR, k));
        // let wallValueXMid = tf.logicalAnd(wallValueL.logicalNot(), wallValueR.logicalNot());
        // let wallValueT = tf.lessEqual(_py, columnAt(wallT, k));
        // let wallValueB = tf.greaterEqual(_py, columnAt(wallB, k));
        // let wallValueYMid = tf.logicalAnd(wallValueT.logicalNot(), wallValueB.logicalNot());

        // cannot support less and greater..
        let xDelta = deltaValueX; //tf.where(wallValueL, deltaValueX.abs(), tf.where(wallValueR, deltaValueX.abs().mul(-1), deltaValueX));
        let yDelta = deltaValueY; //tf.where(wallValueT, deltaValueY.abs(), tf.where(wallValueB, deltaValueY.abs().mul(-1), deltaValueY));

        _x = tf.where(columnAt(rerand, k), rerandX, tf.add(_px, xDelta));
        _y = tf.where(columnAt(rerand, k), rerandY, tf.add(_py, yDelta));

        // todo!
        if(isSlider[noteIndex]) {
            let sln = sliderLengths[noteIndex];
            let sliderShape = sliderShapes[noteIndex];
            let sCos = sliderShapeDetails[sliderShape].cos;
            let sSin = sliderShapeDetails[sliderShape].sin;

            let _a = columnAt(cosList, k + halfTensor);
            let _b = columnAt(sinList, k + halfTensor);

            // cos(a+θ) = cosa cosθ - sina sinθ
            // sin(a+θ) = cosa sinθ + sina cosθ
            let _oa = _a.mul(sCos).sub(_b.mul(sSin));
            let _ob = _a.mul(sSin).add(_b.mul(sCos));

            _px = _a.mul(sln).add(_x);
            _py = _b.mul(sln).add(_y);

            cp = tf.transpose(tf.stack([_x.div(xMax), _y.div(yMax), _oa, _ob, _px.div(xMax), _py.div(yMax)]));
            out.push(cp);
        }
        else {
            let _a = tf.where(columnAt(rerand, k), columnAt(cosList, k + halfTensor), columnAt(cosList, k));
            let _b = tf.where(columnAt(rerand, k), columnAt(sinList, k + halfTensor), columnAt(sinList, k));
            cp = tf.transpose(tf.stack([_x.div(xMax), _y.div(yMax), _a, _b, _x.div(xMax), _y.div(yMax)]));
            out.push(cp);
            _px = _x;
            _py = _y;
        }
        _pa = _pa % 6.283; // I think this line is useless.
    }
    return tf.transpose(tf.stack(out, 0), [1, 0, 2]);
}

function polygonLoss() {
  // nope
}

function constructMapAndCalculateLoss(varTensor, extvar) {
    var dcmModel = extvar.dcmModel;
    var out = constructMap(varTensor, extvar);
    var cm = dcmModel.apply(out);
    var predmean = tf.mean(cm, 1).mul(-1).add(1);
    // regulator = tf.mean(tf.mean(- 0.1 * tf.square(out[:, :, 1:2] - 0.5), axis=2), axis=1); # * tf.square(out[:, :, 1:2] - 2)
    var boxLoss = inblockLoss(out.slice([0, 0, 0], [-1, -1, 2])); //[:, :, 0:2]);
    var boxLossSliderEnds = inblockLoss(out.slice([0, 0, 4], [-1, -1, 2]));
    // polygon = polygonLoss(out);
    // shape is (X, 10, 6)
    return predmean.add(boxLoss).add(boxLossSliderEnds);
}

function constructGeneratorModel(inParams, outParams, lossFunc) {
    const input = tf.input({shape: [inParams]});
    const denseLayer1 = tf.layers.dense({units: 128, activation: 'relu'});
    const denseLayer2 = tf.layers.dense({units: 128, activation: 'relu'});
    const finalLayer = tf.layers.dense({units: outParams, activation: 'tanh'});

    const output = finalLayer.apply(denseLayer2.apply(denseLayer1.apply(input)));
    const model = tf.model({inputs: input, outputs: output});

    const optimizer = tf.train.adam(0.002);
    model.compile({optimizer: optimizer, loss: lossFunc});

    return model;
}

// needs dcmDataset!!!!!
function getSpecialTrainBatch(size, dcmDataset) {
    var out = [];
    for(let i=0; i<size; i++) {
        let rn = Math.floor(Math.random() * dcmDataset.length);
        out.push(dcmDataset[rn]);
    }
    return tf.tensor(out);
}

/*
 *  Generates a group of notes.
 *  @param   groupId           number       group # in mapData.objs
 *  @param   startPos          number[2]    coordinate of the last object end position
 *  @param   genvars {
 *             mapData         object       the mapData object generated by flowEvaluator
 *             dcmDataset      array        discriminator dataset
 *             distMultiplier  number       distance multiplier
 *           }
 *  @returns groupOfNotes      tensor2d     map of shape [noteGroupSize, 6]
 */
async function generateSet(groupId, startPos, genvars) {

    var extvar = {};

    extvar.startPos = startPos;
    extvar.lengthMultiplier = genvars.lengthMultiplier || (genvars.mapData && genvars.mapData.lengthMultiplier) || 1;

    extvar.noteDistances = genvars.mapData.noteDistances;
    extvar.noteAngles =    genvars.mapData.noteAngles;
    extvar.isSlider =      genvars.mapData.isSlider;
    extvar.sliderLengths = genvars.mapData.sliderLengths;
    extvar.sliderShapes =  genvars.mapData.sliderShapes;
    extvar.sliderShapeDetails = genvars.sliderShapeDetails || (typeof sliderShapeDetails == 'object' && sliderShapeDetails) || [];

    var dcmModel = constructDiscriminatorModel();
    extvar.dcmModel = dcmModel;


    // ctrl+c+v!!! hhhh
    const noteGroupSize = GANParams["noteGroupSize"];
    const maxEpoch = GANParams["maxEpoch"];
    const goodEpoch = GANParams["goodEpoch"] - 1;
    const gEpochs = GANParams["gEpochs"];
    const cEpochs = GANParams["cEpochs"]; // is *multiplier
    const gBatch = GANParams["gBatch"];
    const gInputSize = GANParams["gInputSize"];
    const cTrueBatch = GANParams["cTrueBatch"]
    const cFalseBatch = GANParams["cFalseBatch"]

    extvar.begin = groupId * noteGroupSize;

    const plotNoise = tf.randomNormal([2, gInputSize]);

    var genModelLossFunc = (yTrue, yPred) => constructMapAndCalculateLoss(yPred, extvar);
    var gModel = constructGeneratorModel(gInputSize, noteGroupSize * 4, genModelLossFunc);

    var currentMap = null;

    for(let i=0; i<maxEpoch; i++) {
        let gNoise = tf.randomNormal([gBatch, gInputSize]);
        let gLabel = tf.ones([gBatch, noteGroupSize * 4]);

        dcmModel.trainable = false;
        var hist1 = await gModel.fit(gNoise, gLabel, {
            epochs: gEpochs,
            validationSplit: 0.2 // like dropout here, not real validation

        });

        var predictedMapsData = gModel.predict(tf.randomNormal([cFalseBatch, gInputSize]));
        var newFalseMaps = constructMap(predictedMapsData, extvar);
        var newFalseLabels = tf.zeros([cFalseBatch]);

        var specialTrainBatch = getSpecialTrainBatch(cTrueBatch, genvars.dcmDataset);
        var specialTrainLabelBatch = tf.ones([cTrueBatch]);

        var actualTrainData = tf.concat([newFalseMaps, specialTrainBatch], 0);
        var actualTrainLabels = tf.concat([newFalseLabels, specialTrainLabelBatch], 0)

        dcmModel.trainable = true;
        var hist2 = await dcmModel.fit(actualTrainData, actualTrainLabels, {
            epochs: cEpochs,
            validationSplit: 0.2
        });

        var genLoss = tf.mean(hist1.history['loss']).dataSync()[0];
        var dcmLoss = tf.mean(hist2.history['loss']).dataSync()[0];

        print(`Group ${groupId}, Epoch ${1+i}: G loss: ${genLoss} vs. D loss: ${dcmLoss}`);

        var res = gModel.predict(plotNoise);
        if(i >= goodEpoch) {
            currentMap = constructMap(res, extvar);

            if(inblockTrueness(currentMap.slice([0, 0, 0], [-1, -1, 2])).dataSync()[0] == 0
            && inblockTrueness(currentMap.slice([0, 0, 4], [-1, -1, 2])).dataSync()[0] == 0) {
                break;
            }
        }
    }

    window.cm1 = currentMap;
    return currentMap.slice([0, 0, 0], [1, -1, -1]).squeeze([0]);
}

/*
 *  Generates a all group of notes in a map.
 *  @param    mapData           object       the mapData object generated by flowEvaluator
 *  @param    dcmDataset        array        discriminator dataset
 *  @param    generateLimit     number       max. groups to generate (optional)
 *  @returns  mapset            array        map as 2d array of shape [any, 6]
 */
async function generateMap(mapData, dcmDataset, generateLimit) {
    var o = [];
    var timestamps = mapData.timestamps;
    const noteGroupSize = GANParams["noteGroupSize"];
    var generateLimit = generateLimit || Math.floor(timestamps.length / noteGroupSize);
    var genvars = {
        mapData: mapData,
        dcmDataset: dcmDataset,
        lengthMultiplier: mapData.distMultiplier
    };

    var pos = [Math.floor(Math.random() * 312 + 100), Math.floor(Math.random() * 304 + 80)];
    for(let i=0; i<generateLimit; i++) {
        let z = (await generateSet(i, pos, genvars)).mul(tf.tensor1d([512, 384, 1, 1, 512, 384]));
        pos = Array.from(z.slice([z.shape[0] - 1, 0], [1, 2]).dataSync()).map(f => Math.floor(f));
        o.push(z);
    }
    window.o = o;
    return reshapeMapData(await tf.concat(o).data());
}


/*
 *  Reshapes generated mapData to [noteCount, dcmFeatureLength = 6]
 *  @param    data              mapData generated by tf.Tensor#data()
 *  @returns  data              array[*][dcmFeatureLength]
 */
function reshapeMapData(data) {
    var a = Array.from(data), out = [];
    for(let i=0; i<a.length; i+=dcmFeatureLength) {
        out.push(a.slice(i, i + dcmFeatureLength));
    }
    return out;
}

/*
 *  Unused because I made map_gan not to use global-scope map data
 */
function loadToGlobalScope(mapData) {
    const keyArray = ["objs","predictions","momenta","ticks","timestamps","sv","isSlider","isSpinner","isSliding","isSpinning","sliderTicks","sliderShapes","sliderLengthBase","sliderLengths","timestampsPlus1","timestampsAfter","timestampsBefore","noteDistances","noteAngles"];
    keyArray.forEach(key => glob[key] = mapData[key]);
}

async function debugMapGAN(mapData) {
    print("Debug start!!");
    var dcmDataset = loadDiscriminatorDataset(await (await fetch("dcm_dataset_full.json")).text());
    print("Discriminator dataset loaded!!");
    var mapData = mapData || await debugFlowEvaluator();
    print("MapData loaded!!");

    // var extvar = {begin: 30, startPos: [111, 222], lengthMultiplier: 1}

    // var genModelLossFunc = (yTrue, yPred) => constructMapAndCalculateLoss(yPred, extvar);
    // var gModel = constructGeneratorModel(50, 40, genModelLossFunc);
    // var predictedMapsData = gModel.predict(tf.randomNormal([2, 50]));
    // print(window.pmd = predictedMapsData);

    // var randMap = tf.randomNormal([2, 40]);
    // var mapped = constructMap(randMap, extvar);
    // window.mpd = mapped;
    // print(mapped);

    var cm = window.cm = await generateMap(mapData, dcmDataset);
    print("Map Generated!!");

    await new Promise(res => setTimeout(res, 100));
    var dm = window.dm = convertToHitObjectArray(cm, mapData);
    print("Map Converted!!");

    await new Promise(res => setTimeout(res, 100));
    var baseMapObj = glob.baseMap;
    var mapified = window.mapified = mapify(dm, "Various Artists", glob.musicFilename, baseMapObj);
    print("Mapified!!");
    return mapified;
}

/*
 *  Generate a group of debugging notes and plot them
 */
function generateTest() {
    // TODO
}

/*
 *  convert mapData returned by generateMap to hitObjectArray
 */
function convertToHitObjectArray(objArray, mapData) {
    const convToCircle = (arr, i) => ({
        "x": Math.round(arr[0]),
        "y": Math.round(arr[1]),
        "type": 1,
        "time": Math.round(mapData.timestamps[i]),
        "hitsounds": 0,
        "extHitsounds": "0:0:0",
        "index": i
    });
    const convToSlider = (arr, i) => ({
        "x": Math.round(arr[0]),
        "y": Math.round(arr[1]),
        "type": 2,
        "time": Math.round(mapData.timestamps[i]),
        "hitsounds": 0,
        "extHitsounds": "0:0:0",
        "sliderGenerator": {
            "type": parseInt(mapData.sliderShapes[i]),
            "dOut": [arr[2], arr[3]],
            "len": mapData.sliderLengthBase[i] * mapData.sliderTicks[i],
            "ticks": mapData.sliderTicks[i],
            "endpoint": [Math.round(arr[4]), Math.round(arr[5])]
        },
        "index": i
    });
    var output = objArray.map((arr, i) => mapData.isSlider[i] ? convToSlider(arr, i) : convToCircle(arr, i));
    return output;
}

function mapify(hitObjectArray, artist, title, baseMapObj) {
    baseMapObj.obj = hitObjectArray;
    globalizeMap(baseMapObj);

    generateSliders(baseMapObj);
    hitObjectArray = streamRegularizer(hitObjectArray);
    hitObjectArray = newComboEvery2Metronome(hitObjectArray, baseMapObj.timing.uts);

    hitObjectArray = makeClaps(11, hitObjectArray);
    hitObjectArray = makeClaps(1, hitObjectArray);

    baseMapObj.meta.artist = baseMapObj.meta.artist2 = artist;
    baseMapObj.meta.title = baseMapObj.meta.title2 = title;
    baseMapObj.meta.creator = "osumapper";

    return baseMapObj;
}