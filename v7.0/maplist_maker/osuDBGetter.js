'use strict';

const fs = require("fs");
const OsuDBParser = require("osu-db-parser");

function getOsuDB(path) {
    let osuDBbuffer = Buffer.from(fs.readFileSync(path));
    const osuDB = new OsuDBParser(osuDBbuffer);

    return osuDB.getOsuDBData();
}

module.exports = getOsuDB;