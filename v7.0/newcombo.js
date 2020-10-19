'use strict';
/*
 * Modularized newcombo.js
 */
(function(module) {

var curCombo = 0; // i'll go with combo[n] = n+1 in .osu file. it's kinda weird here..
var totalCombos = 0;
var globSpinBuff = 0;
var globalComboToInit = 0;

var hitObjectArray = [];
var uninheritedSections = null;
var colorsData = "";

function setHitObjectsAndUTS(hoa, uts) {
    hitObjectArray = hoa;
    uninheritedSections = uts;
}

function getHitObjects(hoa) {
    return hitObjectArray;
}

function output(p) {
    /* Disable output */
    // console.log(p);
}

function nc_open()
{

}

function nc_close()
{

}

function modAdd(a,b,m)
{
    return (a%m + b%m + 2*m)%m;
}

function modSub(a,b,m)
{
    return (a%m - b%m + 2*m)%m;
}

function comInc(a,b)
{
    var a1 = (a&4)?((a+12)>>4):0;
    var c1 = modAdd(a1,b,totalCombos);
    return (c1==0)?(totalCombos << 4)-12:(c1 << 4)-12;
}

function comDec(a,b)
{
    var a1 = (a&4)?((a+12)>>4):0;
    var c1 = modSub(a1,b,totalCombos);
    return (c1==0)?(totalCombos << 4)-12:(c1 << 4)-12;
}

function comAdd(a,b)
{
    var a1 = (a&4)?((a+12)>>4):0;
    var b1 = (b&4)?((b+12)>>4):0;
    var c1 = modAdd(a1,b1,totalCombos);
    return (c1==0)?(totalCombos << 4)-12:(c1 << 4)-12;
}

function comSub(a,b)
{
    var a1 = (a&4)?((a+12)>>4):0;
    var b1 = (b&4)?((b+12)>>4):0;
    var c1 = modSub(a1,b1,totalCombos);
    return (c1==0)?(totalCombos << 4)-12:(c1 << 4)-12;
}

function debugCombo()
{
    setCombo(11319,1);
    output("OK");
}

function getCombo(t)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    totalCombos = colorsData.split(/\r?\n/).length;
    var c0 = hitObjectArray[0].type & 244;
    if(c0 == 0)
    {
        var curCombo = 1;
    }
    else if(c0 & 4)
    {
        var curCombo = (1 + ((c0 - 4) >> 4)) % totalCombos;
    }
    var spinBuff = 0;
    for(var i=1;i<hitObjectArray.length;i++)
    {
        var ci = hitObjectArray[i].type & 244;
        if(hitObjectArray[i].type & 8)
        {
            spinBuff = 1;
            continue;
        }
        else if(ci & 4)
        {
            curCombo = modAdd(curCombo,(ci + 12) >> 4,totalCombos);
            spinBuff = 0;
        }
        else if(spinBuff)
        {
            curCombo = modAdd(curCombo,1,totalCombos);
            spinBuff = 0;
        }
        if(Math.abs(hitObjectArray[i].time - t) <= 3)
        {
            return curCombo;
        }
    }
    return -1;
}

function setCombo(t,c)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    totalCombos = colorsData.split(/\r?\n/).length;
    var resetFlag = 0;
    var c0 = hitObjectArray[0].type & 244;
    if(c0 == 0)
    {
        var curCombo = 1;
    }
    else if(c0 & 4)
    {
        var curCombo = (1 + ((c0 - 4) >> 4)) % totalCombos;
    }
    var spinBuff = 0;
    for(var i=1;i<hitObjectArray.length;i++)
    {
        var ci = hitObjectArray[i].type & 244;
        if(hitObjectArray[i].type & 8)
        {
            spinBuff = 1;
            continue;
        }
        if(Math.abs(hitObjectArray[i].time - t) <= 3)
        {
            if(c == curCombo)
            {
                hitObjectArray[i].type = hitObjectArray[i].type & 11;
                return 2;
            }
            else
            {
                resetFlag = comInc(ci,modSub(curCombo,c,totalCombos));
                hitObjectArray[i].type = (modSub(c,curCombo,totalCombos) << 4) - 12 + (hitObjectArray[i].type & 11);
            }
        }
        else if(ci & 4)
        {
            curCombo = modAdd(curCombo,(ci + 12) >> 4,totalCombos);
            spinBuff = 0;
            if(resetFlag)
            {
                hitObjectArray[i].type = comAdd(ci,resetFlag) + (hitObjectArray[i].type & 11);
                return 1;
            }
        }
        else if(spinBuff)
        {
            curCombo = modAdd(curCombo,1,totalCombos);
            spinBuff = 0;
            if(resetFlag)
            {
                hitObjectArray[i].type = comAdd(ci,resetFlag) + (hitObjectArray[i].type & 11);
                return 1;
            }
        }
    }
    return 0;
}

function initGlobalCombo()
{
    globalComboToInit = 0;
    totalCombos = colorsData.split(/\r?\n/).length;
    var c0 = hitObjectArray[0].type & 244;
    if(c0 == 0)
    {
        curCombo = 1;
    }
    else if(c0 & 4)
    {
        curCombo = (1 + ((c0 - 4) >> 4)) % totalCombos;
    }
    globSpinBuff = 0;
    return 1;
}

function calcGlobalCombo(t)
{
    if(globalComboToInit)
    {
        initGlobalCombo();
        return;
    }
    if(t & 8)
    {
        globSpinBuff = 1;
        return;
    }
    else
    {
        var c = t & 244;
        if(c & 4)
        {
            curCombo = modAdd(curCombo,(c + 12) >> 4,totalCombos);
            globSpinBuff = 0;
        }
        else if(globSpinBuff)
        {
            curCombo = modAdd(curCombo,1,totalCombos);
            globSpinBuff = 0;
        }
    }
}

function setFirstComboHere(obj,c)
{
    if(c == 0)
    {
        obj.type = ((modSub(c,curCombo,totalCombos) << 4) - 12) | (obj.type & 11);
    }
    else
    {
        obj.type = ((modSub(c,curCombo,totalCombos) << 4) - 12) | (obj.type & 11);
    }
}

function setComboHere(obj,c)
{
    if(globalComboToInit)
    {
        setComboHereForce(obj,c);
        return;
    }
    if(c != curCombo)
    {
        obj.type = ((modSub(c,curCombo,totalCombos) << 4) - 12) | (obj.type & 11);
    }
    else
    {
        obj.type = obj.type & 11;
    }
}

function addNewComboHere(obj)
{
    obj.type = 4 | (obj.type & 11);
}

function removeNewComboHere(obj)
{
    obj.type = obj.type & 11;
}

function setComboHereForce(obj,c)
{
    if(globalComboToInit)
    {
        curCombo = 0;
    }
    if(c != curCombo)
    {
        obj.type = ((modSub(c,curCombo,totalCombos) << 4) - 12) | (obj.type & 11);
    }
    else
    {
        obj.type = ((totalCombos << 4) - 12) | (obj.type & 11);
    }
}

function delayComboInit()
{
    totalCombos = colorsData.split(/\r?\n/).length;
    globalComboToInit = 1;
    curCombo = 0;
}

function setComboDivisor(dTimeStart, dTimeEnd)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    colorsData = "Combo1 : 234,234,231\r\nCombo2 : 249,21,20\r\nCombo3 : 70,138,249\r\nCombo4 : 251,247,20\r\nCombo5 : 227,22,225\r\nCombo6 : 128,128,128";
    var dTimeStart = dTimeStart || 0;
    var dTimeEnd = dTimeEnd || 19911123;
    delayComboInit();
    for(var i=0;i<hitObjectArray.length;i++)
    {
        var obj = hitObjectArray[i];
        if(obj.time >= dTimeStart && obj.time <= dTimeEnd)
        {
            if(isWhiteLine2(obj.time,1) !== false)
            {
                setComboHere(obj,0);
            }
            else if(isWhiteLine2(obj.time,2))
            {
                setComboHere(obj,1);
            }
            else if(isWhiteLine2(obj.time,4))
            {
                setComboHere(obj,2);
            }
            else if(isWhiteLine2(obj.time,8))
            {
                setComboHere(obj,3);
            }
            else if(isWhiteLine2(obj.time,6))
            {
                setComboHere(obj,4);
            }
            else
            {
                setComboHere(obj,5);
            }
        }
        calcGlobalCombo(hitObjectArray[i].type);
    }
    output("New Combo by Divisor complete!")
    diffname_buff("combodiv");
    nc_close();
}

function setComboDMT(dTimeStart, dTimeEnd)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    colorsData = "Combo1 : 70,55,255\r\nCombo2 : 242,0,0\r\nCombo3 : 255,243,104\r\nCombo4 : 238,89,255";
    var dTimeStart = dTimeStart || 0;
    var dTimeEnd = dTimeEnd || 19911123;
    delayComboInit();
    var stackedQueue = [];
    var stackMaxTime = 1000;
    for(var i=0;i<hitObjectArray.length;i++)
    {
        var obj = hitObjectArray[i];
        if(obj.time >= dTimeStart && obj.time <= dTimeEnd)
        {
            if(obj.type & 2)
            {
                var ticks = obj.sliderLength / getSliderLen(obj.time);
                if(ticks < 0.30)
                {
                    setComboHere(obj,0);
                }
                else
                {
                    setComboHere(obj,2);
                }
            }
            else if(obj.type & 1)
            {
                var isStack = 0;
                for(var j=0;j<stackedQueue.length;j++)
                {
                    if(i == stackedQueue[j])
                    {
                        isStack = 1;
                        stackedQueue.splice(j,1);
                        break;
                    }
                }
                if(!isStack)
                {
                    var stackTimer = obj.time + stackMaxTime;
                    var x0 = obj.x;
                    var y0 = obj.y;
                    for(var j=i+1;j<hitObjectArray.length;j++)
                    {
                        if(hitObjectArray[j].time > stackTimer)
                        {
                            break;
                        }
                        if(hitObjectArray[j].x == x0 && hitObjectArray[j].y == y0)
                        {
                            stackTimer = hitObjectArray[j].time + stackMaxTime;
                            isStack = 1;
                            if(hitObjectArray[j].type & 1)
                            {
                                stackedQueue.push(j);
                            }
                        }
                    }
                }
                if(isStack)
                {
                    setComboHere(obj,3);
                }
                else
                {
                    setComboHere(obj,1);
                }
            }
        }
        calcGlobalCombo(hitObjectArray[i].type);
    }
    output("New Combo DMT complete!")
    diffname_buff("combodmt");
    nc_close();
}

function afterWhiteLine(t,divisor,err,ext)
{
    var err = err || 3;
    var ext = ext || 0;
    var m = 0;
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
            return 1 + Math.floor((t + err - us[i].beginTime) / tkl) + m;
        }
        if(us[i+1])
        {
            m += Math.ceil((us[i+1].beginTime - us[i].beginTime) / us[i].tickLength);
        }
    }
}

function setComboWL(n, dTimeStart, dTimeEnd)
{
    n = n || 4;
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    var dTimeStart = dTimeStart || 0;
    var dTimeEnd = dTimeEnd || 19911123;
    delayComboInit();
    var curWL = 1;
    for(var i=0;i<hitObjectArray.length;i++)
    {
        var obj = hitObjectArray[i];
        if(obj.time >= dTimeStart && obj.time <= dTimeEnd)
        {
            if(curWL == 1 && dTimeStart >= 1500)
            {
                curWL = afterWhiteLine(dTimeStart,1);
            }
            if(afterWhiteLine(obj.time,1) >= curWL)
            {
                addNewComboHere(obj);
                while(curWL <= afterWhiteLine(obj.time,1))
                {
                    curWL += n;
                }
            }
            else
            {
                removeNewComboHere(obj);
            }
        }
        calcGlobalCombo(hitObjectArray[i].type);
    }
    output("New Combo every " + n + " white lines complete!")
    // diffname_buff("combowl" + n);
    nc_close();
}

function setComboBlackTech(dTimeStart, dTimeEnd)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    var dTimeStart = dTimeStart || 0;
    var dTimeEnd = dTimeEnd || 19911123;
    delayComboInit();
    for(var i=0;i<hitObjectArray.length;i++)
    {
        var obj = hitObjectArray[i];
        if(obj.time >= dTimeStart && obj.time <= dTimeEnd)
        {
            if((obj.type & 12) == 0)
            {
                obj.type = (obj.type & 11) | ((totalCombos << 4) - 12);
            }
        }
        calcGlobalCombo(hitObjectArray[i].type);
    }
    output("New Combo BlackTech complete!")
    diffname_buff("comboblack");
    nc_close();
}

function setComboHitsounds(dTimeStart, dTimeEnd)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    colorsData = "Combo1 : 255,98,98\r\nCombo2 : 187,0,0\r\nCombo3 : 121,128,255\r\nCombo4 : 0,10,187\r\nCombo5 : 141,255,98\r\nCombo6 : 50,198,0\r\nCombo7 : 121,228,255\r\nCombo8 : 0,140,187";
    var dTimeStart = dTimeStart || 0;
    var dTimeEnd = dTimeEnd || 19911123;
    delayComboInit();
    for(var i=0;i<hitObjectArray.length;i++)
    {
        var obj = hitObjectArray[i];
        if(obj.time >= dTimeStart && obj.time <= dTimeEnd)
        {
            var hs = obj.hitsounds;
            if((obj.type & 2) && obj.sliderSingleHitsounds && obj.sliderSingleHitsounds.length)
            {
                hs = parseInt(obj.sliderSingleHitsounds[0]); // it isn't supposed to o.o..
            }
            switch(hs)
            {
                case 2:
                setComboHere(obj,2);
                break;
                case 4:
                setComboHere(obj,1);
                break;
                case 6:
                setComboHere(obj,3);
                break;
                case 8:
                setComboHere(obj,4);
                break;
                case 10:
                setComboHere(obj,6);
                break;
                case 12:
                setComboHere(obj,5);
                break;
                case 14:
                setComboHere(obj,7);
                break;
                default:
                setComboHere(obj,0);
                break;
            }
        }
        calcGlobalCombo(hitObjectArray[i].type);
    }
    output("New Combo for Hitsounds complete!")
    diffname_buff("combohs");
    nc_close();
}

function setComboArea(dTimeStart, dTimeEnd)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    colorsData = "Combo1 : 255,0,0\r\nCombo2 : 255,0,255\r\nCombo3 : 0,0,255\r\nCombo4 : 0,255,255\r\nCombo5 : 0,255,0\r\nCombo6 : 255,255,0";
    var dTimeStart = dTimeStart || 0;
    var dTimeEnd = dTimeEnd || 19911123;
    delayComboInit();
    for(var i=0;i<hitObjectArray.length;i++)
    {
        var obj = hitObjectArray[i];
        if(obj.time >= dTimeStart && obj.time <= dTimeEnd)
        {
            var wy = obj.y;
            var wx = obj.x;
            if(obj.type & 2)
            {
                wx = Math.round((wx + parseInt(obj.sliderPoints[obj.sliderPoints.length-1].split(":")[0]))/2);
                wy = Math.round((wy + parseInt(obj.sliderPoints[obj.sliderPoints.length-1].split(":")[1]))/2);
            }
            if(wy <= 192)
            {
                if(wx < 171)
                {
                    setComboHere(obj,0);
                }
                else if(wx < 342)
                {
                    setComboHere(obj,1);
                }
                else
                {
                    setComboHere(obj,2);
                }
            }
            else
            {
                if(wx < 171)
                {
                    setComboHere(obj,3);
                }
                else if(wx < 342)
                {
                    setComboHere(obj,4);
                }
                else
                {
                    setComboHere(obj,5);
                }
            }
        }
        calcGlobalCombo(hitObjectArray[i].type);
    }
    output("New Combo for Area complete!")
    diffname_buff("comboarea");
    nc_close();
}

function setComboCycle(cycleArray, dTimeStart, dTimeEnd)
{
    if(hitObjectArray.length == 0) { output("No object!"); return 0; }
    var arr = cycleArray;
    var dTimeStart = dTimeStart || 0;
    var dTimeEnd = dTimeEnd || 19911123;
    var pt = 0;
    var doEndBack = 1;
    var locSpinBuff = 0;
    var origColorLast = 0;
    for(var i=0;i<hitObjectArray.length;i++)
    {
        if(hitObjectArray[i].time > dTimeEnd)
        {
            origColorLast = getCombo(hitObjectArray[i].time);
            break;
        }
    }
    delayComboInit();
    for(var i=0;i<hitObjectArray.length;i++)
    {
        var obj = hitObjectArray[i];
        if(obj.time >= dTimeStart && obj.time <= dTimeEnd)
        {
            if(obj.type & 8)
            {
                locSpinBuff = 1;
            }
            else if((obj.type & 4) || locSpinBuff)
            {
                setComboHere(obj,arr[pt]);
                locSpinBuff = 0;
                pt = (1 + pt) % arr.length;
            }
        }
        else if(obj.time > dTimeEnd && doEndBack)
        {
            setComboHere(obj,origColorLast);
            doEndBack = 0;
        }
        calcGlobalCombo(hitObjectArray[i].type);
    }
    output("New Combo Cycle complete!")
    diffname_buff("combocyc");
    nc_close();
}

function diffname_buff() {

}

function getColorData() {
    return colorsData;
}

module.exports = {
    setHitObjectsAndUTS: setHitObjectsAndUTS,
    getHitObjects: getHitObjects,
    getColorData: getColorData,
    getCombo: getCombo,
    setCombo: setCombo,
    calcGlobalCombo: calcGlobalCombo,
    setComboDivisor: setComboDivisor,
    setComboDMT: setComboDMT,
    setComboWL: setComboWL,
    setComboBlackTech: setComboBlackTech,
    setComboHitsounds: setComboHitsounds,
    setComboArea: setComboArea,
    setComboCycle: setComboCycle
};

})(module);