/*
* @Author: Ar3sgice
* @Date:   2018/8/31
*/

'use strict';

async function testWABD() {
    print("read file for wabd start...");
    var fp = $I("audio_input").files[0];

    var fr = new FileReader();
    fr.readAsArrayBuffer(fp);
    var musicArrayBuffer = await new Promise(res => fr.onload = () => res(fr.result));

    print("decode audioBuffer for wabd start...");
    var auc = new AudioContext();
    var r = await auc.decodeAudioData(musicArrayBuffer).catch(e => console.log(e));
    return await guessBPM(r);
}

async function debugConnected() {
    print("debug start...");
    var fp = $I("audio_input").files[0];
    glob.musicFilename = $I("audio_input").files[0].name;

    print("wabd detect...");
    var wabdResult = await testWABD();
    print(`wabdResult = ${wabdResult.bpm}, ${wabdResult.offset}`);

    print("read audio...");
    var fr = new FileReader();
    fr.readAsArrayBuffer(fp);
    var musicArrayBuffer = await new Promise(res => fr.onload = () => res(fr.result));

    print("read audio done, read osu...");
    var fp = $I("osu_input").files[0];
    var fr = new FileReader();
    fr.readAsText(fp);
    var baseMapData = await new Promise(res => fr.onload = () => res(fr.result));
    glob.baseMap = load_map(baseMapData);

    print("predict rhythm start...");
    var evaluatedRhythm = await debugRhythmPredictor(musicArrayBuffer);

    print("populate rhythm/flow start...");
    var mapData = await debugFlowEvaluator(evaluatedRhythm);

    print("flow gan start...");
    var map = await debugMapGAN(mapData);

    print("back convert start...");
    var convertedOsuText = buildOsuFile(map);
    $I("result").value = convertedOsuText;
    print("debugging done!!!");
}