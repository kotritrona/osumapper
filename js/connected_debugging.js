/*
* @Author: Ar3sgice
* @Date:   2018/8/31
*/

'use strict';

async function getAudioFpFromOsuFile(fp) {
    var osuText = await (await fetch(fp)).text();
    var mapData = load_map(osuText);
    var audioFn = mapData.general.AudioFilename;
    var audioFp = fp.replace(/\/[^\/]*$/, "") + "/" + audioFn;
    return audioFp;
}

async function getWebAudioWavData(fp, k) {
    var audioFp = await getAudioFpFromOsuFile(fp);
    var timestamps = await (await fetch("timestamps/" + k + "_ts.json")).json();
    var result = await getWavDataFromFileAndTimestamps(timestamps, audioFp, [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], 128);
    print("result len " + result.length);
    return result;
}

async function debugMaplist(start_i) {
    start_i = start_i || 0;
    var maplistRaw = await (await fetch("maplist.txt")).text();
    print("start!!");
    var maplist = maplistRaw.split(/\r?\n/);
    for(let i in maplist) {
        if(i < start_i) {
            continue;
        }
        let map = maplist[i];
        let wavData = await getWebAudioWavData(map, i);
        print("processed " + i);
        let postedJSON = JSON.stringify({"fn" : "wavData_" + i, "c": wavData});
        print("postedJSON len " + postedJSON.length);
        window._postedJSON = postedJSON;
        let result = await fetch("write_json/a.php", {method: "POST", body: postedJSON});
        window._result = result;
        print("saved " + i);
    }
    print("done!!");
}

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

async function debugWA() {
    var fp = $I("audio_input").files[0];
    var fr = new FileReader();
    fr.readAsArrayBuffer(fp);
    var musicArrayBuffer = window.ab = await new Promise(res => fr.onload = () => res(fr.result));
    var auc = new AudioContext();
    var r = window.r = await auc.decodeAudioData(musicArrayBuffer).catch(e => console.log(e));

    var cd = window.cd = r.getChannelData(0).slice(1202);

    var c = new OfflineAudioContext(1, 1500, 44100);
    var b = c.createBuffer(1, 1500, 48000);
    b.copyToChannel(cd, 0);
    var s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start();
    var result = window.result = await c.startRendering();

    $I("result").value = Array.from(result.getChannelData(0).slice(0, 1000)).join("\n");

    console.log(Array.from ( window.rz = result.getChannelData(0).slice(0, 1000) ) );
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
    var evaluatedRhythm = await debugRhythmPredictor(musicArrayBuffer, {
        noteDensity: parseFloat($I("noteDensity").value),
        distMultiplier: parseFloat($I("distMultiplier").value)
    });

    print("populate rhythm/flow start...");
    var mapData = await debugFlowEvaluator(evaluatedRhythm);

    print("flow gan start...");
    var map = await debugMapGAN(mapData);

    print("back convert start...");
    var convertedOsuText = buildOsuFile(map);
    $I("result").value = convertedOsuText;
    print("debugging done!!!");
}