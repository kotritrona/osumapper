/*
    Node.js version of osu! map file loader




 */

// load node_modules
const fs = require("fs");
const Polynomial = require("polynomial");


/* init global data chunks */
/*
var generalData = "";
var editorData = "";
var metaData = "";
var diffData = "";
var timingSectionData = "";
var colorsData = "";
var eventsData = "";
var objectsData = "";
var hitObjs = [];
var hitObjectArray = [];
var sliderMultiplier = 3.6;
var diffSettings = {};*/
var _source = "";
var _tags = "";
var _titleUnicode = "";
var _artistUnicode = "";
var is_map_loaded = 0;

/* functions */

var diffSettings = {};
var slider_baselength = 100;
var timingSections = [];
var uninheritedSections = [];
var cho = 0;

// emm

function parseGeneral(generalLines) {
    var o = {};
    const intSet = ["AudioLeadIn", "PreviewTime", "Countdown", "Mode",
    "LetterboxInBreaks", "WidescreenStoryboard", "StoryFireInFront", "SpecialStyle",
    "EpilepsyWarning", "UseSkinSprites"], floatSet = ["StackLeniency"];
    for(let line of generalLines) {
        var a = line.split(":");
        var key = a[0].trim(), value = (a[1] || "").trim();
        if(intSet.indexOf(key) != -1) {
            o[key] = parseInt(value, 10);
        }
        else if(floatSet.indexOf(key) != -1) {
            o[key] = parseFloat(value);
        }
        else {
            o[key] = value;
        }
    }
    return o;
}

function reparseGeneral(obj) {
    var o = "";
    for(let key in obj) {
        var value = obj[key];
        o += key + ": " + value + "\r\n";
    }
    return o.trim();
}

function parseDiffdata(diffData)
{
	var AR_Correspondence = [1800,1700,1600,1450,1325,1200,1050,900,750,600,450];
	var CS_Correspondence = [128/128,118/128,108/128,98/128,88/128,78/128,68/128,56/128,46/128,36/128,26/128];
    diffSettings = {};
	diffSettings.HD = Math.min(parseFloat(diffData.match(/HPDrainRate:([0-9\.]+)/i)[1]),10);
	diffSettings.CS = parseFloat(diffData.match(/CircleSize:([0-9\.]+)/i)[1]);
	diffSettings.OD = parseFloat(diffData.match(/OverallDifficulty:([0-9\.]+)/i)[1]);
	diffSettings.SV = parseFloat(diffData.match(/SliderMultiplier:([0-9\.]+)/i)[1]);
	diffSettings.STR = Math.min(parseInt(diffData.match(/SliderTickRate:([0-9]+)/i)[1]),8);
	var AR = diffData.match(/ApproachRate:([0-9\.]+)/i);
	if(AR != null)
	{
		AR = parseFloat(AR[1]);
	}
	else
	{
		AR = diffSettings.OD;
	}
	diffSettings.AR = AR;
	var AR_BaseTime = AR>5 ? 1950 - 150*AR : 1800 - 1200*AR;
	diffSettings.APC_ScaleTime = AR_BaseTime;
	diffSettings.HC_StandingTime = AR_BaseTime;
	diffSettings.APC_FadeInTime = Math.round(AR_BaseTime / 3);
	diffSettings.HC_FadeInTime = Math.round(AR_BaseTime / 3);
	diffSettings.HC_FadeIn2Time = Math.round(AR_BaseTime / 3);
	diffSettings.HC_FadeIn2Dur = Math.round(AR_BaseTime / 15);
	//HC_ExplosionTime = Math.round(AR_BaseTime / 8);
	//HC_FadeOutTime = Math.round(AR_BaseTime / 4);
	diffSettings.circleScaling = (128 - 10 * diffSettings.CS) / 128 * (0.85);
    return diffSettings;
}

function reparseDiffdata(ds)
{
	var o = "";
	o += "HPDrainRate:" + ds.HD;
	o += "\r\nCircleSize:" + ds.CS;
	o += "\r\nOverallDifficulty:" + ds.OD;
	o += "\r\nApproachRate:" + ds.AR;
	o += "\r\nSliderMultiplier:" + ds.SV;
	o += "\r\nSliderTickRate:" + ds.STR;
	return o;
}

function parseHitObjects(hitObjs, gameMode)
{
    gameMode = gameMode || 0;
    var hitObjectArray = [];
	for(var i=0;i<hitObjs.length;i++)
	{
		var j = hitObjs[i].split(",");
		var v = {};
		v.x = parseInt(j[0]);
		v.y = parseInt(j[1]);
		v.time = parseInt(j[2]);
		v.type = parseInt(j[3]);
		v.hitsounds = parseInt(j[4]);
		if(v.type & 2) // cannot decide with v.sliderPoints
		{
            var _sliderPoints = j[5];
			var _rawSliderPoints = _sliderPoints.split("|");
            v.sliderReverses = parseInt(j[6]);
            v.sliderLength = parseFloat(j[7]);
            var _sliderSingleHitsounds = j[8];
            if(_sliderSingleHitsounds)
            {
                v.sliderSingleHitsounds = _sliderSingleHitsounds.split("|");
            }
            else {
                v.sliderSingleHitsounds = [];
            }
			var _sliderExtHitsounds = j[9];
			if(_sliderExtHitsounds)
			{
				v.sliderExtHitsounds = _sliderExtHitsounds.split("|");
			}
            else {
                v.sliderExtHitsounds = [];
            }
			v.extHitsounds = j[10];

            // extra facts about sliders
            v.sliderData = analyzeSlider({
                x: v.x,
                y: v.y,
                type: v.type,
                time: v.time,
                sliderPoints: _rawSliderPoints,
                sliderLength: v.sliderLength,
                sliderReverses: v.sliderReverses
            });
		}
        else if(v.type & 8)
        {
            v.spinnerEndTime = parseInt(j[5], 10);
            v.extHitsounds = j[6];
        }
        else if(gameMode == 3 && v.type & 128)
        {
            let maniaHoldData = j[5].split(":");
            v.holdEndTime = parseInt(maniaHoldData[0], 10);
            v.extHitsounds = maniaHoldData.slice(1).join(":");
        }
		else
		{
			v.extHitsounds = j[5];
		}
		v.index = i;
		hitObjectArray.push(v);
	}
    return hitObjectArray;
}

function stringifySliderPoints(st, points) {
    var o = [];
    for(var p of points) {
        if(p.type == "start") {
            continue;
        }
        o.push(p.c);
        if(p.type == "node" && st == "B") {
            o.push(p.c);
        }
    }
    return o.map(a => a.join(":")).join("|");
}

function reparseHitObjects(hitObjectArray)
{
	var o = "";
	for(var i=0;i<hitObjectArray.length;i++)
	{
		var v = hitObjectArray[i];
		var j = "";
		j += v.x + "," + v.y + "," + v.time + "," + v.type + "," + v.hitsounds;
		if(v.type & 2)
		{
            // if sliderData exist, use it instead of sliderPoints
            if(v.sliderData) {
                var st = v.sliderData.type;
                var sp = stringifySliderPoints(st, v.sliderData.points);
                j += "," + st + "|" + sp;
            }
            else {
                j += "," + v.sliderPoints.join("|");
            }
			j += "," + v.sliderReverses;
			j += "," + v.sliderLength;
			if(v.sliderSingleHitsounds && v.sliderSingleHitsounds.length)
			{
				j += "," + v.sliderSingleHitsounds.join("|");
			}
			else if(v.sliderExtHitsounds && v.sliderExtHitsounds.length)
			{
				j += "," + "0";
				for(var s=0;s<v.sliderReverses;s++)
				{
					j += "|0";
				}
			}
			if(v.sliderExtHitsounds && v.sliderExtHitsounds.length)
			{
				j += "," + v.sliderExtHitsounds.join("|");
				if(v.extHitsounds)
				{
					j += "," + v.extHitsounds;
				}
			}
		}
        else if(v.type & 8)
        {
            j += "," + v.spinnerEndTime;
            if(v.extHitsounds)
            {
                j += "," + v.extHitsounds;
            }
        }
        else if(v.type & 128)
        {
            if(v.extHitsounds)
            {
                if(v.holdEndTime)
                {
                    j += "," + v.holdEndTime + ":" + v.extHitsounds;
                }
                else
                {
                    j += "," + v.extHitsounds;
                }
            }
        }
		else
		{
			if(v.extHitsounds)
			{
				j += "," + v.extHitsounds;
			}
		}
		o += j;
		if(i != hitObjectArray.length - 1)
		{
			o += "\r\n";
		}
	}
	return o;
}

function reparseTimeSections(timingSections, diffSettings) {
    var o = "";
    var tsa = timingSections.ts;
    var sliderBaseLength = 100;
    for(var i=0; i<tsa.length; i++) {
        var ts = tsa[i];
        if(ts.isInherited) {
            var tl = -sliderBaseLength * diffSettings.SV * (100/ts.sliderLength);
        }
        else {
            var tl = ts.tickLength;
        }
        var sp = ts.sampleSet == "normal" ? 1 : (ts.sampleSet == "drum" ? 3 : 2);
        o += ts.beginTime + "," + tl + "," + ts.whiteLines + "," + sp + "," + ts.customSet
             + "," + ts.volume + "," + (+!ts.isInherited) + "," + (+ts.isKiai) + "\n";
    }
    return o.trim();
}

function parseTimeSections(timeData)
{
	var curTL = 1;
	var curMP = 1;
	var a = timeData.replace(/\t/ig,",").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"").split(/\r?\n/i);
	for(var i=0;i<a.length;i++)
	{
		var ts = {};
		var j = a[i].split(",");
		var tl = parseFloat(j[1]);
		ts.beginTime = Math.round(parseFloat(j[0]));
		ts.whiteLines = parseInt(j[2]);
		ts.sampleSet = j[3]==1?"normal":(j[3]==3?"drum":"soft");
		ts.customSet = parseInt(j[4]);
		ts.volume = parseInt(j[5]);
        ts.isKiai = (j[7] == "1");
		if(tl < 0 && curTL > 0)
		{
            ts.isInherited = true;
			ts.tickLength = curTL;
			ts.sliderLength = slider_baselength * diffSettings.SV * (100/(-tl)) / 1;
			curMP = 100/(-tl);
		}
		else
		{
            ts.isInherited = false;
			curTL = tl;
			ts.tickLength = tl;
			ts.sliderLength = slider_baselength * diffSettings.SV * 1 / 1;
			curMP = 1;
		}
        ts.bpm = Math.max(12,60000 / ts.tickLength);
		timingSections.push(ts);
		if(tl > 0)
		{
			uninheritedSections.push(ts);
		}
	}
    return {
        ts: timingSections,
        uts: uninheritedSections
    };
}

function getSliderLen(t)
{
	var n = 0;
	for(var k=0;k<timingSections.length;k++)
	{
		if(t >= timingSections[k].beginTime)
		{
			n = k;
		}
		else
		{
			return timingSections[n].sliderLength;
		}
	}
	return timingSections[n].sliderLength;
}

function getTickLen(t)
{
	var n = 0;
	for(var k=0;k<timingSections.length;k++)
	{
		if(t >= timingSections[k].beginTime)
		{
			n = k;
		}
		else
		{
			return timingSections[n].tickLength;
		}
	}
	return timingSections[n].tickLength;
}

function parseMeta(metaData)
{
	var artist = "";
	var title = "";
	var _artist = metaData.match(/(^|\n)Artist:([^\r\n]*)(\r?\n|$)/i) || "";
	if(_artist.length)
	{
		artist=_artist[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
	var artist2 = metaData.match(/(^|\n)ArtistUnicode:([^\r\n]*)(\r?\n|$)/i) || _artist;
	if(artist2.length)
	{
		artist2=artist2[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
	var creator = metaData.match(/(^|\n)Creator:([^\r\n]*)(\r?\n|$)/i) || "";
	if(creator.length)
	{
		creator=creator[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
	var _title = metaData.match(/(^|\n)Title:([^\r\n]*)(\r?\n|$)/i) || "";
	if(_title.length)
	{
		title=_title[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
	var title2 = metaData.match(/(^|\n)TitleUnicode:([^\r\n]*)(\r?\n|$)/i) || _title;
	if(title2.length)
	{
		title2=title2[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
	var diffname = metaData.match(/(^|\n)Version:([^\r\n]*)(\r?\n|$)/i) || "";
	if(diffname.length)
	{
		diffname=diffname[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
	var source = metaData.match(/(^|\n)Source:([^\r\n]*)(\r?\n|$)/i) || "";
	if(source.length)
	{
		source=source[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
	var tags = metaData.match(/(^|\n)Tags:([^\r\n]*)(\r?\n|$)/i) || "";
	if(tags.length)
	{
		tags=tags[2].replace(/^[ \t]+/ig,"").replace(/[ \t]+$/ig,"");
	}
    return {
        artist: artist,
        artist2: artist2,
        diffname: diffname,
        creator: creator,
        title: title,
        title2: title2,
        source: source,
        tags: tags
    };
}

function getFilename(o)
{
	var artist = o.artist;
	var title = o.title;
	var creator = o.creator;
	var diffname = o.diffname;
	var outname = (artist?artist+" - ":"") + title + " (" + creator + ") [" + diffname + "].osu";
	outname = outname.replace(/[^a-z0-9\(\)\[\] \.\,\!\~\`\{\}\-\_\=\+\&\^\@\#\$\%\;\']/ig,"");
	return outname;
}

function reparseMeta(w)
{
	var o = "";
	o += "Title:" + w.title + "\r\n";
	if((w.title2 || "").length)
	{
		o += "TitleUnicode:" + w.title2 + "\r\n";
	}
	o += "Artist:" + w.artist + "\r\n";
	if((w.artist2 || "").length)
	{
		o += "ArtistUnicode:" + w.artist2 + "\r\n";
	}
	o += "Creator:" + w.creator + "\r\n";
	o += "Version:" + w.diffname + "\r\n";
	o += "Source:" + w.source + "\r\n";
	o += "Tags:" + w.tags;
	return o;
}

function isWhiteLine(t,err,ext)
{
	var err = err || 3;
	var ext = ext || 0;
	var us = uninheritedSections;
	if(!us.length)
	{
		return false;
	}
	if(t < us[0].beginTime)
	{
		return false;
	}
	for(var i=0;i<us.length;i++)
	{
		if(t > us[i].beginTime && ((i == us.length - 1) || t < us[1+i].beginTime))
		{
			t -= ext * us[i].tickLength;
			if(Math.abs((t - us[i].beginTime) % us[i].tickLength) <= err)
			{
				return 1 + (Math.round(Math.abs(t - us[i].beginTime) / us[i].tickLength) % us[i].whiteLines);
			}
			else if(Math.abs((t - us[i].beginTime) % us[i].tickLength - us[i].tickLength) <= err)
			{
				return 1 + (Math.round(Math.abs(t - us[i].beginTime) / us[i].tickLength) % us[i].whiteLines);
			}
			else
			{
				return false;
			}
		}
	}
}

function isWhiteLine2(t,divisor,err,ext)
{
	var err = err || 3;
	var ext = ext || 0;
	var us = uninheritedSections;
	if(!us.length)
	{
		return false;
	}
	if(t < us[0].beginTime)
	{
		return false;
	}
	for(var i=0;i<us.length;i++)
	{
		if(t > us[i].beginTime && ((i == us.length - 1) || t < us[1+i].beginTime))
		{
			var tkl = us[i].tickLength / divisor;
			t -= ext * tkl;
			if(Math.abs((t - us[i].beginTime) % tkl) <= err)
			{
				return 1 + (Math.round(Math.abs(t - us[i].beginTime) / tkl));
			}
			else if(Math.abs((t - us[i].beginTime) % tkl - tkl) <= err)
			{
				return 1 + (Math.round(Math.abs(t - us[i].beginTime) / tkl));
			}
			else
			{
				return false;
			}
		}
	}
}

function output(str)
{
	console.log(str);
}

function load_map(txt)
{
	if(txt)
	{
		var inputdata = txt;
	}
	else
	{
		output("No map data or cannot load file!");
		return;
	}

	var generalData = [];
	var editorData = [];
	var metaData = [];
	var diffData = [];
	var timingSectionData = [];
	var colorsData = [];
	var eventsData = [];
	var objectsData = [];
	var hitObjs = [];
	var hitObjectArray = [];
	var sliderMultiplier = 3.6;
	var diffSettings = {};
	var _source = "";
	var _tags = "";
	timingSections = [];
	uninheritedSections = [];

	var linesepar = inputdata.split(/\r?\n/i);

    var firstLine = linesepar[0];
    if(!/osu file format v[0-9]+/i.test(firstLine)) {
        throw "away the pain";
        return;
    }
    else {
        var fileVersion = firstLine.match(/osu file format v([0-9]+)/i)[1];
    }

	for(var i=0;i<linesepar.length;i++)
	{
		if(linesepar[i].indexOf("[General]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				generalData.push(linesepar[i]);
			}
			continue;
		}
		else if(linesepar[i].indexOf("[Editor]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				editorData.push(linesepar[i]);
			}
			continue;
		}
		else if(linesepar[i].indexOf("[Metadata]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				metaData.push(linesepar[i]);
			}
			continue;
		}
		else if(linesepar[i].indexOf("[Difficulty]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				diffData.push(linesepar[i]);
			}
			continue;
		}
		else if(linesepar[i].indexOf("[TimingPoints]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				timingSectionData.push(linesepar[i]);
			}
			continue;
		}
		else if(linesepar[i].indexOf("[Colours]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				colorsData.push(linesepar[i]);
			}
			continue;
		}
		else if(linesepar[i].indexOf("[Events]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				eventsData.push(linesepar[i]);
			}
			continue;
		}
		else if(linesepar[i].indexOf("[HitObjects]") == 0)
		{
			while(linesepar[i+1] && !linesepar[i+1].match(/^\[[a-z]+\]/i))
			{
				i++;
				objectsData.push(linesepar[i]);
			}
			continue;
		}
	}

    var generalLines = generalData;
	generalData = generalLines.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");
	editorData = editorData.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");
	metaData = metaData.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");
	diffData = diffData.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");
	timingSectionData = timingSectionData.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");
	colorsData = colorsData.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");
	eventsData = eventsData.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");
	objectsData = objectsData.join("\r\n").replace(/^(\r?\n)+/ig,"").replace(/(\r?\n)+$/ig,"");

	hitObjs = objectsData.replace(/(\r?\n)+$/,"").split(/\r?\n/i);

    let generalParsed = parseGeneral(generalLines)
    let gameMode = generalParsed["Mode"] || 0;

    var mapObj = {
        fileVersion: fileVersion,
        general: generalParsed,
        editor: editorData,
        meta: parseMeta(metaData),
        diff: parseDiffdata(diffData),
        evt: eventsData,
        timing: parseTimeSections(timingSectionData),
        color: colorsData,
        obj: parseHitObjects(hitObjs, gameMode)
    };
	return mapObj;
}

function pDist(a,b) {
    return Math.sqrt((a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]));
}

function cDist(a,b)
{
	var c01 = (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y);
	var c02 = Math.abs(b.time-a.time) / Math.abs(getTickLen(a.time));
	return Math.sqrt(c01) / c02;
}

function cDist2(a,b)
{
	var c01 = (a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y);
	var c02 = Math.abs(b.time-a.time) / Math.abs(getTickLen(a.time));
	return (c01 / (c02 * c02));
}

// calculates circle center
// stackoverflow#32861804, edited
function calculateCircleCenter(A,B,C)
{
    var yDelta_a = B[1] - A[1];
    var xDelta_a = B[0] - A[0];
    var yDelta_b = C[1] - B[1];
    var xDelta_b = C[0] - B[0];

    // somehow this has a bug where denominator gets to 0
    if(xDelta_a == 0) {
        return vecMulNum(vecAdd(
            calculateCircleCenter([A[0]+0.0001, A[1]], B, C),
            calculateCircleCenter([A[0]-0.0001, A[1]], B, C)
            ), 0.5);
    }
    if(xDelta_b == 0) {
        return vecMulNum(vecAdd(
            calculateCircleCenter(A, [B[0]+0.0001, B[1]], C),
            calculateCircleCenter(A, [B[0]-0.0001, B[1]], C)
            ), 0.5);
    }
    if(yDelta_a == 0) {
        return vecMulNum(vecAdd(
            calculateCircleCenter([A[0], A[1]+0.0001], B, C),
            calculateCircleCenter([A[0], A[1]-0.0001], B, C)
            ), 0.5);
    }
    if(yDelta_b == 0) {
        return vecMulNum(vecAdd(
            calculateCircleCenter(A, [B[0], B[1]+0.0001], C),
            calculateCircleCenter(A, [B[0], B[1]-0.0001], C)
            ), 0.5);
    }
    center = [];

    var aSlope = yDelta_a / xDelta_a;
    var bSlope = yDelta_b / xDelta_b;

    center[0] = (aSlope*bSlope*(A[1] - C[1]) + bSlope*(A[0] + B[0]) - aSlope*(B[0]+C[0]) )/(2* (bSlope-aSlope) );
    center[1] = -1*(center[0] - (A[0]+B[0])/2)/aSlope +  (A[1]+B[1])/2;
    return center;
}

function buildOsuFile(obj)
{
	var filedata = "";
	filedata += "osu file format v14\r\n\r\n[General]\r\n" + reparseGeneral(obj.general) + "\r\n\r\n[Editor]\r\n" + obj.editor;
	filedata += "\r\n\r\n[Metadata]\r\n" + reparseMeta(obj.meta) + "\r\n\r\n";
	filedata += "[Difficulty]\r\n" + reparseDiffdata(obj.diff) + "\r\n\r\n[TimingPoints]\r\n" + reparseTimeSections(obj.timing, obj.diff) + "\r\n\r\n";
	filedata += "[Colours]\r\n" + obj.color + "\r\n\r\n";
	filedata += "[Events]\r\n" + obj.evt + "\r\n\r\n";
	filedata +=  "[HitObjects]\r\n" + reparseHitObjects(obj.obj) + "\r\n";
	return filedata;
}

// polynomial utils
function polyCurveIntegration(polys, l, h, dt) {
    // sqrt((dx/dt)^2 + (dy/dt)^2)
    var polyX = polys[0], polyY = polys[1];
    var dt = dt || 0.001;
    var dx_dt = polyX.derive();
    var dy_dt = polyY.derive();
    var basePoly = dx_dt.mul(dx_dt).add(dy_dt.mul(dy_dt));
    var t = 0;
    for(var k=l; k<h; k+=dt) {
        t += (Math.sqrt(basePoly.eval(k)) + Math.sqrt(basePoly.eval(k+dt))) * dt/2;
    }
    return t;
}
function polyLineLengthTable(polyX, polyY, dt) {
    var dt = dt || 0.001;
    var dx_dt = polyX.derive();
    var dy_dt = polyY.derive();
    var basePoly = dx_dt.mul(dx_dt).add(dy_dt.mul(dy_dt));
    var t = [];
    for(var k=0; k<1; k+=dt) {
        t.push((Math.sqrt(basePoly.eval(k)) + Math.sqrt(basePoly.eval(k+dt))) * dt/2);
    }
    return t;
}
// @param points [[x1, y1], [x2, y2], ..., [xi, yi]]
function getBezierPoly(points) {
    var p0 = new Polynomial(1);

    // coeffs
    for(var i=0; i<points.length-1; i++) {
        p0 = p0.mul(new Polynomial([1, 1]));
    }
    p0.coeff.length = points.length;
    var coeff = [].slice.call(p0.coeff);

    // x, 1-x; create every polynomial and add up
    const _p = new Polynomial([0, 1]), _q = new Polynomial([1, -1]);
    var px = new Polynomial([0]), py = new Polynomial([0]);
    for(var i=0; i<points.length; i++) {
        var ptimes = i, qtimes = points.length-i-1, co = coeff[i];
        var pCur = new Polynomial([co]);
        for(var k = 0; k < ptimes; k++) {
            pCur = pCur.mul(_p);
        }
        for(var k = 0; k < qtimes; k++) {
            pCur = pCur.mul(_q);
        }
        px = px.add(pCur.mul(points[i][0]));
        py = py.add(pCur.mul(points[i][1]));
    }
    return [px, py];
}

function getPolyTangent(polys, t) {
    var polyX = polys[0], polyY = polys[1];
    var dx_dt = polyX.derive();
    var dy_dt = polyY.derive();
    return [dx_dt.eval(t), dy_dt.eval(t)];
}

// cut a bezier to length k, return {
//     t: t-value
//     c: coords
//     l: integration
// }
// prec is t-value precision not length precision
// you can simply omit it
function cutBezier(polys, target, prec) {
    prec = prec || 0.001;
    var table = polyLineLengthTable(polys[0], polys[1], prec);
    if(target > table.reduce((t,a) => t+a, 0) + 0.5) {
        return null;
    }
    var tot = 0;
    for(var i=0; i<table.length; i++) {
        if(tot == target) {
            var s = i * prec;
            return {t: s, c: [polys[0].eval(s), polys[1].eval(s)], l: tot};
        }
        else if(tot + table[i] > target) {
            var s = Math.min(1, (i + 1/2) * prec);
            return {t: s, c: [polys[0].eval(s), polys[1].eval(s)], l: tot + table[i]/2};
        }
        tot += table[i];
    }
    return {t: 1, c: [polys[0].eval(1), polys[1].eval(1)], l: target};
}

// some simple vector functions
const vecAdd = (c1, c2) => [c1[0]+c2[0], c1[1]+c2[1]];
const vecSub = (c1, c2) => [c1[0]-c2[0], c1[1]-c2[1]];
const vecMulNum = (c1, n) => [c1[0]*n, c1[1]*n];
const vecRound = (c1) => [Math.round(c1[0]), Math.round(c1[1])];
const vecLen = (c1) => Math.sqrt(c1[0]*c1[0] + c1[1]*c1[1]);
const vecRotate = (c, a) => [c[0] * Math.cos(a) - c[1] * Math.sin(a), c[0] * Math.sin(a) + c[1] * Math.cos(a)];

function calculateBezierData(beziers, totalLen) {
    var curves = [], remlen = totalLen, lastTangent = [];
    var firstTangent = vecSub(beziers[0][1], beziers[0][0]);
    for(var bezier of beziers) {
        if(bezier.length == 2) { // line
            var partLen = pDist(bezier[0], bezier[1]);
            if(remlen > partLen - 0.5) {
                curves.push({
                    type: "line",
                    from: bezier[0],
                    to: bezier[1],
                    points: bezier,
                    len: partLen
                });
                lastTangent = vecSub(bezier[1], bezier[0]);
                remlen -= partLen;
            }
            else {
                var endPoint = vecRound(vecAdd(bezier[0], vecMulNum(vecSub(bezier[1], bezier[0]), remlen / partLen)));
                curves.push({
                    type: "line",
                    from: bezier[0],
                    to: endPoint,
                    points: bezier,
                    len: remlen
                });
                lastTangent = vecSub(bezier[1], bezier[0]);
                remlen = -99;
                break;
            }
        }
        else { // bezier
            var bezierPoly = getBezierPoly(bezier);
            var partLen = polyCurveIntegration(bezierPoly, 0, 1);
            if(remlen > partLen - 0.5) {
                curves.push({
                    type: "bezier",
                    from: bezier[0],
                    to: bezier[bezier.length-1],
                    points: bezier,
                    len: partLen
                });
                remlen -= partLen;
                if(remlen < 0.5) {
                    lastTangent = getPolyTangent(bezierPoly, 1);
                }
            }
            else {
                var cutted = cutBezier(bezierPoly, remlen, 0.001);
                curves.push({
                    type: "bezier",
                    from: bezier[0],
                    to: vecRound(cutted.c),
                    points: bezier,
                    len: remlen
                });
                if(partLen > 0) {
                    lastTangent = getPolyTangent(bezierPoly, remlen / partLen);
                }
                else {
                    lastTangent = getPolyTangent(bezierPoly, 1);
                }
                remlen = -99;
                break;
            }
        }
    }
    firstTangent = vecMulNum(firstTangent, 1/vecLen(firstTangent));
    lastTangent = vecMulNum(lastTangent, 1/vecLen(lastTangent));
    return {
        curves: curves,
        firstTangent: firstTangent,
        lastTangent: lastTangent
    };
}

/*
 * @param note: single slider note
 *
 * returns {
 *     c: coords
 *     type: type
 *     and stuff like that
 * }
 */
function analyzeSlider(note) {
    if((note.type & 2) == 0) {
        output("Error in analyzeSlider at " + note.time + ": Not a slider");
        return {};
    }
    var beginPoint = [note.x, note.y];
    var pts = note.sliderPoints;
    var len = note.sliderLength;
    var remlen = len; // Remaining Length
    var prevPoint = beginPoint;
    var sliderType = pts[0];
    var outPoints = [];
    var outCurves = [];
    var outEndPoint = null;
    var outFirstTangent = null;
    var outEndTime = Math.floor(note.time + note.sliderReverses * len / getSliderLen(note.time) * getTickLen(note.time));

    if(pts.length == 2) {
        sliderType = "L"; // Fix bug in 66929
    }

    switch(sliderType) {
        case "L": // linear
        case "C": // parse it as if it were linear; no one uses it anyways
        outPoints.push({c: beginPoint, type: "start"});
        for(let i=1; i<pts.length; i++) {
            var c0 = pts[i].split(":");
            var c = [+c0[0], +c0[1]];
            outPoints.push({c: c, type: (i == pts.length-1) ? "end" : "node"});

            if(remlen > -0.5) {
                var partLen = pDist(prevPoint, c);
                if(partLen <= remlen + 0.5) {
                    outCurves.push({
                        type: "line",
                        from: prevPoint,
                        to: c,
                        points: [prevPoint, c],
                        len: partLen
                    });
                    remlen -= partLen;
                }
                else {
                    var endPoint = vecRound(vecAdd(prevPoint, vecMulNum(vecSub(c, prevPoint), remlen / partLen)));
                    outCurves.push({
                        type: "line",
                        from: prevPoint,
                        to: endPoint,
                        points: [prevPoint, endPoint],
                        len: remlen
                    });
                    remlen = -99;
                }
            }
            prevPoint = c;
        }
        var firstLine = outCurves[0], lastLine = outCurves[outCurves.length-1];
        outEndPoint = lastLine.to;
        outFirstTangent = vecSub(firstLine.to, firstLine.from);
        outLastTangent = vecSub(lastLine.to, lastLine.from);
        outFirstTangent = vecMulNum(outFirstTangent, 1/vecLen(outFirstTangent));
        outLastTangent = vecMulNum(outLastTangent, 1/vecLen(outLastTangent));

        break;

        case "P": // circular 3pt
        var c0 = beginPoint;
        var d1 = pts[1].split(":");
        var c1 = [+d1[0], +d1[1]];
        var d2 = pts[2].split(":");
        var c2 = [+d2[0], +d2[1]];
        outPoints.push({c: beginPoint, type: "start"});
        outPoints.push({c: c1, type: "curl"});
        outPoints.push({c: c2, type: "end"});
        var center = calculateCircleCenter(c0, c1, c2);

        // fix degenerate circle bug
        if(!isFinite(center[0]) || !isFinite(center[1])) {
            // skip the middle point and change type to linear!
            note.sliderPoints = ["L", note.sliderPoints[2]];
            return analyzeSlider(note);
        }
        var radius = pDist(center, c0);

        // calculate the angles to get to where the slider actually ends
        var reqAngle = remlen / radius;
        var dirAngle = Math.atan2.apply(null, vecSub(c1, c0).reverse());
        dirAngle /= -(Math.abs(dirAngle) || 1);

        var startAngle = Math.atan2.apply(null, vecSub(c0, center).reverse());
        var endAngle = startAngle + dirAngle * reqAngle;
        var endCoord = vecAdd(center, [Math.cos(endAngle) * radius, Math.sin(endAngle) * radius]);

        outEndPoint = vecRound(endCoord);
        outFirstTangent = [Math.cos(startAngle + dirAngle * Math.PI/2), Math.sin(startAngle + dirAngle * Math.PI/2)];
        outLastTangent = [Math.cos(endAngle + dirAngle * Math.PI/2), Math.sin(endAngle + dirAngle * Math.PI/2)];

        outCurves.push({
            type: "arc",
            from: beginPoint,
            to: outEndPoint,
            center: center,
            radius: radius,
            len: remlen
        });
        remlen = 0;
        break;

        case "B": // bezier
        outPoints.push({c: beginPoint, type: "start"});
        var beziers = [], bez = [beginPoint];
        for(let i=1; i<pts.length; i++) {
            var c0 = pts[i].split(":");
            var c = [+c0[0], +c0[1]];
            if(i == pts.length-1) { // last point
                bez.push(c);
                beziers.push(bez);
                bez = [];
                outPoints.push({c: c, type: "end"});
                break;
            }
            else {
                // find next point and check if equal
                var nc0 = pts[i+1].split(":");
                var nc = [+nc0[0], +nc0[1]];
                if(nc[0] == c[0] && nc[1] == c[1]) { // is node (red)
                    // open a new bez
                    bez.push(c);
                    beziers.push(bez);
                    bez = [c];
                    outPoints.push({c: c, type: "node"});

                    // skip "nc"
                    i++;
                }
                else { // is not node (white)
                    bez.push(c);
                    outPoints.push({c: c, type: "curl"});
                }
            }
            prevPoint = c;
        }

        var bezierData = calculateBezierData(beziers, remlen);
        remlen = 0;
        outCurves = bezierData.curves;
        outFirstTangent = bezierData.firstTangent;
        outLastTangent = bezierData.lastTangent;
        outEndPoint = outCurves[outCurves.length-1].to;
        break;
    }

    if(note.sliderReverses % 2 == 0) {
        outLastTangent = vecMulNum(outFirstTangent, -1);
        var outFinalPoint = beginPoint;
    }
    else {
        var outFinalPoint = outEndPoint;
    }

    // changed name to make it a little smaller

    return {
        type: sliderType,
        points: outPoints,
        curves: outCurves,
        dIn: outFirstTangent,
        dOut: outLastTangent,
        endpoint: outEndPoint,
        to: outFinalPoint,
        endTime: outEndTime
    };
}

/*
 * This needs to be consistent with the definition in (#7).
 * Name is irrelevant, just to give a hint what it is.
 * There are a few more shapes in RND5, but I doubt if that's anywhere useful.
 */
function getAllSliderTypes() {
    return [{
        index: 0,
        name: "linear",
        type: "L",
        vecLength: 1,
        repeats: 1,
        angle: 0,
        points: [[1, 0]]
    }, {
        index: 1,
        name: "arc-ccw",
        type: "P",
        vecLength: 0.97,
        repeats: 1,
        angle: -0.40703540572409336,
        points: [[0.5, 0.1], [0.97, 0]]
    }, {
        index: 2,
        name: "arc-cw",
        type: "P",
        vecLength: 0.97,
        repeats: 1,
        angle: 0.40703540572409336,
        points: [[0.5, -0.1], [0.97, 0] ]
    }, {
        index: 3,
        name: "angle-ccw",
        type: "B",
        vecLength: 0.97,
        repeats: 1,
        angle: -0.20131710837464062,
        points: [[0.48, 0.1], [0.48, 0.1], [0.97, 0]]
    }, {
        index: 4,
        name: "angle-cw",
        type: "B",
        vecLength: 0.97,
        repeats: 1,
        angle: 0.20131710837464062,
        points: [[0.48, -0.1], [0.48, -0.1], [0.97, 0]]
    }, {
        index: 5,
        name: "wave-cw",
        type: "B",
        vecLength: 0.97,
        repeats: 1,
        angle: -0.46457807316944644,
        points: [[0.38, -0.2], [0.58, 0.2], [0.97, 0]]
    }, {
        index: 6,
        name: "wave-ccw",
        type: "B",
        vecLength: 0.97,
        repeats: 1,
        angle: 0.46457807316944644,
        points: [[0.38, 0.2], [0.58, -0.2], [0.97, 0]]
    }, {
        index: 7,
        name: "halfcircle-cw",
        type: "P",
        vecLength: 0.64,
        repeats: 1,
        angle: 1.5542036732051032,
        points: [[0.32, -0.32], [0.64, 0]]
    }, {
        index: 8,
        name: "halfcircle-ccw",
        type: "P",
        vecLength: 0.64,
        repeats: 1,
        angle: -1.5542036732051032,
        points: [[0.32, 0.32], [0.64, 0]]
    }, {
        index: 9,
        name: "haneru-cw",
        type: "B",
        vecLength: 0.94,
        repeats: 1,
        angle: 0,
        points: [[0.24, -0.08], [0.44, -0.04], [0.64, 0.1], [0.64, 0.1], [0.76, 0], [0.94, 0]]
    }, {
        index: 10,
        name: "haneru-ccw",
        type: "B",
        vecLength: 0.94,
        repeats: 1,
        angle: 0,
        points: [[0.24, 0.08], [0.44, 0.04], [0.64, -0.1], [0.64, -0.1], [0.76, 0], [0.94, 0]]
    }, {
        index: 11,
        name: "elbow-cw",
        type: "B",
        vecLength: 0.94,
        repeats: 1,
        angle: 0.23783592745745077,
        points: [[0.28, -0.16], [0.28, -0.16], [0.94, 0]]
    }, {
        index: 12,
        name: "elbow-ccw",
        type: "B",
        vecLength: 0.94,
        repeats: 1,
        angle: -0.23783592745745077,
        points: [[0.28, 0.16], [0.28, 0.16], [0.94, 0]]
    }, {
        index: 13,
        name: "ankle-cw",
        type: "B",
        vecLength: 0.94,
        repeats: 1,
        angle: 0.5191461142465229,
        points: [[0.66, -0.16], [0.66, -0.16], [0.94, 0]]
    }, {
        index: 14,
        name: "ankle-ccw",
        type: "B",
        vecLength: 0.94,
        repeats: 1,
        angle: -0.5191461142465229,
        points: [[0.66, 0.16], [0.66, 0.16], [0.94, 0.0]]
    }, {
        index: 15,
        name: "bolt-cw",
        type: "B",
        vecLength: 0.96,
        repeats: 1,
        angle: -0.16514867741462683,
        points: [[0.34, -0.06], [0.34, -0.06], [0.6, 0.06], [0.6, 0.06], [0.96, 0.0]]
    }, {
        index: 16,
        name: "bolt-ccw",
        type: "B",
        vecLength: 0.96,
        repeats: 1,
        angle: 0.16514867741462683,
        points: [[0.34, 0.06], [0.34, 0.06], [0.6, -0.06], [0.6, -0.06], [0.96, 0.0]]
    }, {
        index: 17,
        name: "linear-reverse",
        type: "L",
        vecLength: 0,
        repeats: 2,
        angle: 3.141592653589793,
        points: [[0.0, 0.0], [0.5, 0.0]]
    }];
}

function globalizeMap(map) {
    is_map_loaded = 1;
    diffSettings = map.diff;
    timingSections = map.timing.ts;
    uninheritedSections = map.timing.uts;
}

function generateSlider(slider) {

    const sliderTypes = getAllSliderTypes();

    if(!slider.sliderGenerator) {
        return slider;
    }

    var g = slider.sliderGenerator;
    var st = sliderTypes[g.type];

    g.len /= st.repeats;

    var dOutAngle = Math.atan2(g.dOut[1], g.dOut[0]);
    var targetAngle = dOutAngle - st.angle;
    var points = [];
    for(let k=0; k<st.points.length; k++) {
        let p = vecMulNum(st.points[k], g.len);

        /* cos(x+a) = cosx cosa - sinx sina
         * sin(x+a) = cosx sina + sinx cosa
         */
        let rotP = [p[0] * Math.cos(targetAngle) - p[1] * Math.sin(targetAngle), p[0] * Math.sin(targetAngle) + p[1] * Math.cos(targetAngle)];
        points.push(vecAdd(rotP, [slider.x, slider.y]).map(n => Math.round(n)));
    }
    _rsp = [st.type].concat(points.map(a => a.join(":")));

    slider.sliderReverses = st.repeats;
    slider.sliderLength = g.len;
    slider.sliderSingleHitsounds = [];
    slider.sliderExtHitsounds = [];
    slider.sliderData = analyzeSlider({
        x: slider.x,
        y: slider.y,
        type: slider.type,
        time: slider.time,
        sliderPoints: _rsp,
        sliderLength: Math.round(g.len),
        sliderReverses: st.repeats
    });
    slider.sliderPoints = _rsp;

    // delete the generator
    delete slider.sliderGenerator;

    return slider;
}

function generateSliders(map) {
    var objArray = map.obj;
    for(let i=0; i<objArray.length; i++) {
        var obj = objArray[i];
        if(obj.type & 2) { // is slider
            objArray[i] = generateSlider(obj);
        }
    }
    map.obj = objArray;
}

function newComboEvery2Metronome(hsa, uts) {
    const comboEngine = require("./newcombo.js");
    comboEngine.setHitObjectsAndUTS(hsa, uts);
    comboEngine.setComboWL(8);
    comboEngine.getHitObjects(hsa);
    return hsa;
}

/*
 * Regularizing streams by putting 1/4 (blue-line) notes in middle of adjacent 1/2 notes, with a random rotation.
 * Because sometimes it maps streams really weirdly, this will make the map much more playable.
 * More precisely, it puts the middle note half closer to the note before than the one after, nearly all the time.
 * Perhaps because of the Sota dataset? those split streams? lol
 */
function streamRegularizer(hoa) {
    for(let i=0; i<hoa.length; i++) {
        // find streams where 3 notes close to each other
        if((hoa[i].type & 1) && hoa[i+2] && hoa[i+2].time - hoa[i].time <= getTickLen(hoa[i].time) * 0.53
            && (hoa[i+1].type & 1) && isWhiteLine2(hoa[i].time, 2)) {
            var vec = vecMulNum(vecSub([hoa[i+2].x, hoa[i+2].y], [hoa[i].x, hoa[i].y]), 0.5);
            var vecRotated = vecRotate(vec, Math.random() - 0.5);
            var vecFinal = vecAdd([hoa[i].x, hoa[i].y], vecRotated).map(Math.floor);
            hoa[i+1].x = vecFinal[0];
            hoa[i+1].y = vecFinal[1];
        }
    }
    return hoa;
}

/*
 * I compressed this code because it was too spaghetti...
 * The param is like
 * 1 - 24clap, 2 - 13clap, 3 - redline clap, 4 - 23clap, 5 - 24whistle, 6 - owoc, 7 - ocow, 8 - remove all
 * 9 - taiko reverse, 10 - metronome finish, 11 - random whistle, 12 - o c occ, 13 - 1clap, 14 - 2clap, 15 - 3 clap, 16 - 4 clap
 * really amazing code I wrote that time (#grassland)
 *
 */
function makeClaps(param, hoa, dts, dte)
{
    var dTimeStart = dts || 0;
    var dTimeEnd = dte || 19911123;
    var w = 0;
    var w2 = 0;
    for(var i in hoa)if(!(hoa[i].time<dTimeStart||hoa[i].time>dTimeEnd))if(1&hoa[i].type)switch(param){case 1:w=isWhiteLine(hoa[i].time),2==w||4==w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 2:w=isWhiteLine(hoa[i].time),1==w||3==w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 3:w=isWhiteLine(hoa[i].time,3,.5),w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 4:w=isWhiteLine(hoa[i].time),2==w||3==w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 5:w=isWhiteLine(hoa[i].time),2==w||4==w?hoa[i].hitsounds|=2:hoa[i].hitsounds&=29;break;case 6:w=isWhiteLine(hoa[i].time),2==w?(hoa[i].hitsounds|=2,hoa[i].hitsounds&=23):4==w?(hoa[i].hitsounds|=8,hoa[i].hitsounds&=29):hoa[i].hitsounds&=21;break;case 7:w=isWhiteLine(hoa[i].time),4==w?(hoa[i].hitsounds|=2,hoa[i].hitsounds&=23):2==w?(hoa[i].hitsounds|=8,hoa[i].hitsounds&=29):hoa[i].hitsounds&=21;break;case 8:hoa[i].hitsounds=0,hoa[i].extHitsounds="0:0:0";break;case 9:8&hoa[i].hitsounds||2&hoa[i].hitsounds?hoa[i].hitsounds&=21:hoa[i].hitsounds|=2;break;case 10:w=isWhiteLine(hoa[i].time),1==w?hoa[i].hitsounds|=4:hoa[i].hitsounds&=27;break;case 11:Math.random()>.5?hoa[i].hitsounds&=21:hoa[i].hitsounds|=2;break;case 12:w=isWhiteLine(hoa[i].time),w2=isWhiteLine(hoa[i].time,3,.5),2==w||4==w||3==w2?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 13:w=isWhiteLine(hoa[i].time),1==w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 14:w=isWhiteLine(hoa[i].time),2==w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 15:w=isWhiteLine(hoa[i].time),3==w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23;break;case 16:w=isWhiteLine(hoa[i].time),4==w?hoa[i].hitsounds|=8:hoa[i].hitsounds&=23}else if(2&hoa[i].type){var ticks=hoa[i].sliderLength/getSliderLen(hoa[i].time),tickLength=getTickLen(hoa[i].time);if(!hoa[i].sliderSingleHitsounds||hoa[i].sliderSingleHitsounds.length==0){hoa[i].sliderSingleHitsounds=[];for(var j=0;j<=hoa[i].sliderReverses;j++)hoa[i].sliderSingleHitsounds.push(0)}if(!hoa[i].sliderExtHitsounds){hoa[i].sliderExtHitsounds=[];for(j=0;j<=hoa[i].sliderReverses;j++)hoa[i].sliderExtHitsounds.push("0:0");hoa[i].extHitsounds="0:0:0"}for(j=0;j<=hoa[i].sliderReverses;j++){var c_tick=Math.round(hoa[i].time+j*ticks*tickLength);switch(param){case 1:w=isWhiteLine(c_tick),2==w||4==w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 2:w=isWhiteLine(c_tick),1==w||3==w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 3:w=isWhiteLine(c_tick,3,.5),w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 4:w=isWhiteLine(c_tick),2==w||3==w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 5:w=isWhiteLine(c_tick),2==w||4==w?hoa[i].sliderSingleHitsounds[j]|=2:hoa[i].sliderSingleHitsounds[j]&=29;break;case 6:w=isWhiteLine(c_tick),2==w?(hoa[i].sliderSingleHitsounds[j]|=2,hoa[i].sliderSingleHitsounds[j]&=23):4==w?(hoa[i].sliderSingleHitsounds[j]|=8,hoa[i].sliderSingleHitsounds[j]&=29):hoa[i].sliderSingleHitsounds[j]&=21;break;case 7:w=isWhiteLine(c_tick),4==w?(hoa[i].sliderSingleHitsounds[j]|=2,hoa[i].sliderSingleHitsounds[j]&=23):2==w?(hoa[i].sliderSingleHitsounds[j]|=8,hoa[i].sliderSingleHitsounds[j]&=29):hoa[i].sliderSingleHitsounds[j]&=21;break;case 8:hoa[i].sliderSingleHitsounds[j]=0,hoa[i].sliderExtHitsounds[j]="0:0";break;case 10:w=isWhiteLine(c_tick),1==w?hoa[i].sliderSingleHitsounds[j]|=4:hoa[i].sliderSingleHitsounds[j]&=27;break;case 11:Math.random()>.5?hoa[i].sliderSingleHitsounds[j]&=21:hoa[i].sliderSingleHitsounds[j]|=2;break;case 12:w=isWhiteLine(c_tick),w2=isWhiteLine(c_tick,3,.5),2==w||4==w||3==w2?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 13:w=isWhiteLine(c_tick),1==w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 14:w=isWhiteLine(c_tick),2==w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 15:w=isWhiteLine(c_tick),3==w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23;break;case 16:w=isWhiteLine(c_tick),4==w?hoa[i].sliderSingleHitsounds[j]|=8:hoa[i].sliderSingleHitsounds[j]&=23}}}
    return hoa;
}

function main()
{
    var args = process.argv;
    if(args.length <= 4) {
        output("please specify mode, inputfile path and outputfile path");
        return;
    }
    var date0 = new Date();
    var mode = args[2].charAt(0), mode2 = args[2].charAt(1);
    var inputfile = args[3];
    var outputfile = args[4];

    if(mode == "j") {
        try {
            var txt = fs.readFileSync(inputfile, 'utf8');
            var json = load_map(txt);

            // this will overwrite it if it existed!!
            fs.writeFileSync(outputfile, JSON.stringify(json), {encoding: "utf8"});
            if(mode2 != "q") {
                output("success! file converted to json.");
            }
        }
        catch(e) {
            output(e);
        }
    }
    else if(mode == "o") {
        try {
            var txt = fs.readFileSync(inputfile, 'utf8');
            var json = JSON.parse(txt);

            // this will overwrite it if it existed!!
            fs.writeFileSync(outputfile, buildOsuFile(json), {encoding: "utf8"});
            if(mode2 != "q") {
                output("success! file converted to osu map.");
            }
        }
        catch(e) {
            output(e);
        }
    }
    else if(mode == "c") {
        try {
            var txt = fs.readFileSync(inputfile, 'utf8');
            var json = JSON.parse(txt);

            globalizeMap(json);

            let mode = json["general"]["Mode"] || 0;
            if(mode < 3) {
                generateSliders(json);

                // json.obj = streamRegularizer(json.obj);

                json.obj = newComboEvery2Metronome(json.obj, json.timing.uts);
            }

            /*
             * Hitsounds can be deep-learned as well, probably, but one main problem is
             * that most of the maps use a custom hitsound set.
             * In this way, the hitsound is largely correlated to the hitsound itself, rather from our data.
             * With a much bigger dataset (#OsuHitsoundCollection!) this should be possible, but it is pointless -
             *
             * - because we can do this the easy way!
             */
            if(json.obj.every(item => item.hitsounds == 0)) { // Skip hitsounding if it is already hitsounded
                json.obj = makeClaps(11, json.obj);
                json.obj = makeClaps(1, json.obj);
            }

            // this will overwrite it if it existed!!
            fs.writeFileSync(outputfile, buildOsuFile(json), {encoding: "utf8"});
            if(mode2 != "q") {
                output("success! built osu map from json data.");
            }
        }
        catch(e) {
            output(e);
        }
    }
    else if(mode == "t") {
        try {
            var txt = fs.readFileSync(inputfile, 'utf8');
            var json = load_map(txt);

            output("script end!");
        }
        catch(e) {
            output(e);
        }
    }
    else {
        output("mitakoto nai mo-do desu ne")
    }

    var date1 = new Date();
    if(mode2 != "q") {
        output("elapsed time: " + (date1-date0)/1000 + " s");
    }

}

main();