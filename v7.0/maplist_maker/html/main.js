'use strict';

const propertyRetrievers = [
    a => a.artist_name,
    a => a.artist_name_unicode,
    a => a.song_title,
    a => a.song_title_unicode,
    a => a.creator_name,
    a => a.difficulty,
    a => a.song_source,
    a => a.song_tags,
    a => a.artist_name +  "\t" + a.artist_name_unicode + "\t" + a.song_title +  "\t" + a.song_title_unicode +  "\t" + a.creator_name +  "\t" + a.difficulty +  "\t" + a.song_source +  "\t" + a.song_tags,
    a => a.ranked_status,
    a => a.n_hitcircles,
    a => a.n_sliders,
    a => a.n_spinners,
    a => a.n_hitcircles + a.n_sliders + a.n_spinners,
    a => a.timing_points.length > 0 ? 60000 / a.timing_points[0][0] : 0,
    a => a.last_modification_time,
    a => a.approach_rate,
    a => a.circle_size,
    a => a.hp_drain,
    a => a.overall_difficulty,
    a => a.slider_velocity,
    a => a.star_rating_standard[0],
    a => a.star_rating_taiko[0],
    a => a.star_rating_ctb[0],
    a => a.star_rating_mania[0],
    a => a.drain_time,
    a => a.total_time / 1000,
    a => a.beatmap_id,
    a => a.beatmapset_id,
    a => a.mode,
];

const propertyIsText = index => index <= 8;

const propertyComparatorsText = [(a,b) => a.toLowerCase() == b.toLowerCase(), (a,b) => a.toLowerCase().indexOf(b.toLowerCase()) > -1, (a,b) => b.test(a)];
const propertyComparatorsNumber = [(a,b) => a>=b, (a,b) => a<=b, (a,b) => a==b]; // mapprop, match

var fullMapset = [];
var currentMapset = [];

var osuPath = "/var/osu/";

function q(selector) {
    return document.querySelector(selector);
}

function qa(selector) {
    return document.querySelectorAll(selector);
}

function ce(tag) {
    return document.createElement(tag);
}

function writeTable(array, baseQSList, className, actionFunction) {
    baseQSList.forEach(qs => q(qs).innerHTML = "");
    array.forEach((a, index) => {
        a.forEach((el, i) => {
            let grid = ce("div");
            grid.className = className || "";
            grid.textContent = el;
            if(actionFunction) {
                grid.addEventListener("click", actionFunction.bind(null, index));
            }
            q(baseQSList[i]).appendChild(grid);
        });
    });
}

function mapTableActionFunction(index, evt) {
    if(index == 0) {
        return;
    }
    let selectedMap = currentMapset[index-1];
    addToMaplist([selectedMap]);
}

function genMaplistTable(maps) {
    let array = [["Artist", "Title", "Creator", "Difficulty"]];
    array = array.concat(maps.map(m => [m.artist_name, m.song_title, m.creator_name, m.difficulty]))
    writeTable(array.slice(0, 501), [".maplist-col-artist", ".maplist-col-title", ".maplist-col-creator", ".maplist-col-diff"], "td-maplist", mapTableActionFunction);
}

function filterMaps(maps, type, method, value, rev) {
    let methodFunc = propertyIsText(type) ? propertyComparatorsText[method] : propertyComparatorsNumber[method];
    if(!propertyIsText(type)) {
        value = parseFloat(value);
    }
    if(propertyIsText(type) && method == 2) { // regex
        if(rev) {
            return maps.filter(m => !methodFunc(propertyRetrievers[type](m), new RegExp(value, "i")));
        }
        return maps.filter(m => methodFunc(propertyRetrievers[type](m), new RegExp(value, "i")));
    }
    if(rev) {
        return maps.filter(m => !methodFunc(propertyRetrievers[type](m), value));
    }
    return maps.filter(m => methodFunc(propertyRetrievers[type](m), value));
}

function removeDuplicates(array) {
    return Array.from(new Set(array));
}

function updateMapDisplay() {
    genMaplistTable(currentMapset);
    q(".filtered-count").textContent = currentMapset.length + " maps filtered.";
}

function updateMethodType() {
    let prop = q(".select-filter").selectedIndex;
    if(propertyIsText(prop)) {
        q(".text-mode-n").style.display = "none";
        q(".select-mode-n").style.display = "none";
        q(".text-mode-t").style.display = "block";
        q(".select-mode-t").style.display = "block";
    }
    else {
        q(".text-mode-n").style.display = "block";
        q(".select-mode-n").style.display = "block";
        q(".text-mode-t").style.display = "none";
        q(".select-mode-t").style.display = "none";
    }
}

function addToMaplist(list) {
    let originalMaplist = q(".textarea-output").value.trim().split(/\r?\n/);
    let newMaplist = list.map(m => osuPath + "Songs\\" + m.folder_name + "\\" + m.osu_file_name);

    let result = removeDuplicates(originalMaplist.concat(newMaplist)).filter(text => text.length > 0);

    q(".textarea-output").value = result.join("\n");
}

function runFilterAction() {
    let prop = q(".select-filter").selectedIndex;
    let methodT = q(".select-mode-t").selectedIndex;
    let methodN = q(".select-mode-n").selectedIndex;
    let method = propertyIsText(prop) ? methodT : methodN;
    let val = q(".input-val").value;
    let rev = q(".input-reverse").checked;
    currentMapset = filterMaps(currentMapset, prop, method, val, rev);
    updateMapDisplay();
}

function removeSubmode() {
    currentMapset = currentMapset.filter(a => a.mode == 0);
    updateMapDisplay();
}

function randomHalf() {
    currentMapset = currentMapset.sort(_ => Math.random() - 0.5).slice(0, Math.floor(currentMapset.length/2));
    updateMapDisplay();
}

function resetFilters() {
    currentMapset = fullMapset.slice();
    updateMapDisplay();
}

function output(a) {
    q(".middle-output").value += a + "\n";
}

function showStatus(a) {
    q(".filtered-count").textContent = a;
}

async function readMapData() {
    let data = await fetch("/beatmaps").then(d => d.json());
    osuPath = data.path;
    fullMapset = data.maps;
    currentMapset = fullMapset.slice();
    updateMapDisplay();
    updateMethodType();
}

async function saveMaplist(text) {
    let result = await fetch("/save", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: text
        })
    }).then(res => res.text());
    showStatus(result);
}

async function init() {
    await readMapData();
    q(".select-filter").addEventListener("change", evt => updateMethodType());
    q(".button-next-search").addEventListener("click", evt => runFilterAction());
    q(".button-reset-search").addEventListener("click", evt => resetFilters());
    q(".button-remove-submode").addEventListener("click", evt => removeSubmode());
    q(".button-random-half").addEventListener("click", evt => randomHalf());
    q(".button-save-maplist").addEventListener("click", evt => saveMaplist(q(".textarea-output").value));
    q(".button-add-to-maplist").addEventListener("click", evt => addToMaplist(currentMapset));

}

init();