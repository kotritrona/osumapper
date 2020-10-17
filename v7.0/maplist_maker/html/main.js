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
    a => a.last_modification_time,
    a => a.approach_rate,
    a => a.circle_size,
    a => a.hp_drain,
    a => a.overall_difficulty,
    a => a.slider_velocity,
    a => a.star_rating_standard,
    a => a.star_rating_taiko,
    a => a.star_rating_ctb,
    a => a.star_rating_mania,
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

function q(selector) {
    return document.querySelector(selector);
}

function qa(selector) {
    return document.querySelectorAll(selector);
}

function ce(tag) {
    return document.createElement(tag);
}

function writeTable(array, baseQS, className) {
    let baseElem = q(baseQS);
    array.forEach(a => {
        let row = ce("tr");
        a.forEach(el => {
            let grid = ce("td");
            grid.className = className || "";
            grid.textContent = el;
            row.appendChild(grid);
        });
        baseElem.appendChild(row);
    });
}

function genMaplistTable(maps) {
    let array = [["Artist", "Title", "Creator", "Difficulty"]];
    array = array.concat(maps.map(m => [m.artist_name_unicode, m.song_title_unicode, m.creator_name, m.difficulty]))
    writeTable(array.slice(0, 501), ".tbody-maplist", "td-maplist");
}

function filterMaps(maps, type, method, value, rev) {
    let methodFunc = propertyIsText(type) ? propertyComparatorsText[method] : propertyComparatorsNumber[method];
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