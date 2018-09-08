async function g(r) {
    var cdata = r.getChannelData(0);
    return await guessBPM(r)
    .then(({ bpm, offset }) => {
        print("BPM/Offset_wabd: " + bpm + ", " + offset);
        return [bpm, offset];
    })
    .catch((err) => {
        console.log(err);
    });
}

async function fetchOsuFile(fp) {
    print("fetch osu start...");
    var osuText = await (await fetch(fp)).text();
    var mapData = load_map(osuText);
    print("BPM/Offset_osu: " + uninheritedSections[0].bpm + ", " + uninheritedSections[0].beginTime);
    return [mapData.general.AudioFilename, uninheritedSections[0].bpm, uninheritedSections[0].beginTime];
}

async function fetchAndGuessFile(fp) {
    var res;
    print("fetch start...");
    await fetch(fp, {
        responseType: "arrayBuffer"
    }).then(z => z.arrayBuffer()).then(z => {
        var auc = new AudioContext();
        print("fetch OK, decode start...");
        return auc.decodeAudioData(z).then(g).then(b => {
            res = b;
        });
    }).catch(e => console.log(e));
    return res;
}

async function processMap(fp) {
    var [audioFn, b1, o1] = await fetchOsuFile(fp);
    var audioFp = fp.replace(/\/[^\/]*$/, "") + "/" + audioFn;
    try {
        var num = parseInt(fp.match(/maps\/([0-9]+)/)[1]) || 0;
    }
    catch(e) {
        var num = 0;
    }
    var [b2, o2] = await fetchAndGuessFile(audioFp);
    $I("result").value += num+","+b1+","+o1+","+b2+","+o2+"\n";
}

async function main() {
    var paths = {};
    var maplist = await (await fetch("maps.json")).json();

    for(let i in maplist) {
        var k = maplist[i];
        var name = k.artist + "::" + k.title;
        if(paths[name]) {
            continue;
        }
        else if(i < 308) {
            continue;
        }
        else {
            try {
                paths[name] = true;
                var fp = k.path.replace(/\\/g, "/").replace("D:/osu!/Songs", "maps");
                await processMap(fp);
            }
            catch(e) {

            }
        }
    }

}