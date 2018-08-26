/*
	this js is mainly for testing/eggpain purposes; no real use
	functi** EncodeString(text)
	{
		text+="       ";
		return base128encode(utf16to8(text));
	}
	functi** DecodeString(text)
	{
		return utf8to16(base128decode(text)).replace(/ *$/ig,"");
	}
	createTable(table,id,tableAttributes,tdAttributes);
*/
function traceObject(obj,n){var out = "";for(var i in obj){out += (i + " = " + obj[i] + (n?"<br />":"\r\n"));}return out;}
if(typeof $=='undefined'){function $(i){return document.querySelector(i);}}
function $A(i){return document.querySelectorAll(i);}
function $I(i){return document.getElementById(i);}
function $T(i){return document.getElementsByTagName(i);}
function $C(i){return document.createElement(i);}
var base128EncodeChars = new Array();
var base128DecodeChars = new Array(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,
90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,-1,128,129);
var base128DecodeCodes = new Array();
base128EncodeChars = new Array("ª¡","ª¢","ª£","ª¤","ª¥","ª¦","ª§","ª¨","ª©","ªª","ª±","ª²","ª³","ª´","ªµ","ª¶","ª·","ª¸","ª¹","ªº","ªÁ","ªÂ",
"ªÃ","ªÄ","ªÅ","ªÆ","ªÇ","ªÈ","ªÉ","ªÊ","ªÑ","ªÒ","ªÓ","ªÔ","ªÕ","ªÖ","ª×","ªØ","ªÙ","ªÚ","ªá","ªâ","ªã","ªä","ªå","ªæ","ªç","ªè","ªé","ªê",
"ªñ","ªò","ªó","ªô","ªõ","ªö","ª÷","ªø","ªù","ªú","«£","«¤","«¥","«¦","«§","«¨","«©","«ª","««","«¬","«³","«´","«µ","«¶","«·","«¸","«¹","«º",
"«»","«¼","«Ã","«Ä","«Å","«Æ","«Ç","«È","«É","«Ê","«Ë","«Ì","«Ó","«Ô","«Õ","«Ö","«×","«Ø","«Ù","«Ú","«Û","«Ü","«ã","«ä","«å","«æ","«ç","«è",
"«é","«ê","«ë","«ì","«ó","«ô","«õ","«ö","«÷","«ø","«ù","«ú","«û","«ü","¬¥","¬¦","¬§","¬¨","¬©","¬ª","¬«","¬¬","¬­");
base128DecodeCodes = new Array("ª¡","ª¢","ª£","ª¤","ª¥","ª¦","ª§","ª¨","ª©","ªª","ª±","ª²","ª³","ª´","ªµ","ª¶","ª·","ª¸","ª¹","ªº","ªÁ","ªÂ",
"ªÃ","ªÄ","ªÅ","ªÆ","ªÇ","ªÈ","ªÉ","ªÊ","ªÑ","ªÒ","ªÓ","ªÔ","ªÕ","ªÖ","ª×","ªØ","ªÙ","ªÚ","ªá","ªâ","ªã","ªä","ªå","ªæ","ªç","ªè","ªé","ªê",
"ªñ","ªò","ªó","ªô","ªõ","ªö","ª÷","ªø","ªù","ªú","«£","«¤","«¥","«¦","«§","«¨","«©","«ª","««","«¬","«³","«´","«µ","«¶","«·","«¸","«¹","«º",
"«»","«¼","«Ã","«Ä","«Å","«Æ","«Ç","«È","«É","«Ê","«Ë","«Ì","«Ó","«Ô","«Õ","«Ö","«×","«Ø","«Ù","«Ú","«Û","«Ü","«ã","«ä","«å","«æ","«ç","«è",
"«é","«ê","«ë","«ì","«ó","«ô","«õ","«ö","«÷","«ø","«ù","«ú","«û","«ü","¬¥","¬¦","¬§","¬¨","¬©","¬ª","¬«","¬¬","¬­");
function base128encode(str){var out, i, len;var c1, c2, c3, c4, c5, c6, c7;len=str.length;i=0;out="";while(i<len){c1=str.charCodeAt(i++)&0xff;
if(i==len){out+=base128EncodeChars[c1>>1];out+=base128EncodeChars[((c1&0x01)<<6)];
out+=base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128];
break;}c2=str.charCodeAt(i++)&0xff;if(i == len){out+=base128EncodeChars[c1>>1];out+=base128EncodeChars[((c1&0x01)<<6)|(c2>>2)];
out+=base128EncodeChars[((c2&0x03)<<5)];out+=base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128];
break;}c3=str.charCodeAt(i++)&0xff;if(i == len){out+=base128EncodeChars[c1>>1];out+=base128EncodeChars[((c1&0x01)<<6)|(c2>>2)];
out+=base128EncodeChars[((c2&0x03)<<5)|(c3>>3)];out+=base128EncodeChars[((c3&0x07)<<4)];
out+=base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128];break;}c4=str.charCodeAt(i++)&0xff;
if(i == len){out+=base128EncodeChars[c1>>1];out+=base128EncodeChars[((c1&0x01)<<6)|(c2>>2)];out+=base128EncodeChars[((c2&0x03)<<5)|(c3>>3)];
out+=base128EncodeChars[((c3&0x07)<<4)|(c4>>4)];out+=base128EncodeChars[((c4&0x0F)<<3)];out+=base128EncodeChars[128] + base128EncodeChars[128] + base128EncodeChars[128];
break;}c5=str.charCodeAt(i++)&0xff;if(i == len){out+=base128EncodeChars[c1>>1];out+=base128EncodeChars[((c1&0x01)<<6)|(c2>>2)];
out+=base128EncodeChars[((c2&0x03)<<5)|(c3>>3)];out+=base128EncodeChars[((c3&0x07)<<4)|(c4>>4)];out+=base128EncodeChars[((c4&0x0F)<<3)|(c5>>5)];
out+=base128EncodeChars[((c5&0x1F)<<2)];out+=base128EncodeChars[128] + base128EncodeChars[128];break;}c6=str.charCodeAt(i++)&0xff;if(i == len){
out+=base128EncodeChars[c1>>1];out+=base128EncodeChars[((c1&0x01)<<6)|(c2>>2)];out+=base128EncodeChars[((c2&0x03)<<5)|(c3>>3)];
out+=base128EncodeChars[((c3&0x07)<<4)|(c4>>4)];out+=base128EncodeChars[((c4&0x0F)<<3)|(c5>>5)];out+=base128EncodeChars[((c5&0x1F)<<2)|(c6>>6)];
out+=base128EncodeChars[((c6&0x3F)<<1)];out+=base128EncodeChars[128];break;}c7=str.charCodeAt(i++);out+=base128EncodeChars[c1>>1];
out+=base128EncodeChars[((c1&0x01)<<6)|(c2>>2)];out+=base128EncodeChars[((c2&0x03)<<5)|(c3>>3)];out+=base128EncodeChars[((c3&0x07)<<4)|(c4>>4)];
out+=base128EncodeChars[((c4&0x0F)<<3)|(c5>>5)];out+=base128EncodeChars[((c5&0x1F)<<2)|(c6>>6)];out+=base128EncodeChars[((c6&0x3F)<<1)|(c7>>7)];
out+=base128EncodeChars[c7&0x7F];}return out;}
function base128decode(str){var c1, c2, c3, c4, c5, c6, c7, c8;var i, j, len, out;len=str.length;i=0;j=0;out="";while(i < len){
c1=c2=c3=c4=c5=c6=c7=c8=23;for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c1=base128DecodeChars[j];}}i++;
if(c1 == -1){break;}for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c2=base128DecodeChars[j];}}i++;if(c2 == -1)
{break;}for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c3=base128DecodeChars[j];}}i++;if(c3 == -1){break;}
for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c4=base128DecodeChars[j];}}i++;if(c4 == -1){break;}
for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c5=base128DecodeChars[j];}}i++;if(c5 == -1){break;}
for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c6=base128DecodeChars[j];}}i++;if(c6 == -1){break;}
for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c7=base128DecodeChars[j];}}i++;if(c7 == -1){break;}
for(j=0;j<base128DecodeCodes.length;j++){if(str.charAt(i)==base128DecodeCodes[j]){c8=base128DecodeChars[j];}}i++;if(c8 == -1){break;}
out+=String.fromCharCode(((c1&0xFF)<<1) | (c2>>6));out+=String.fromCharCode(((c2&0x3F)<<2) | (c3>>5));
out+=String.fromCharCode(((c3&0x1F)<<3) | (c4>>4));out+=String.fromCharCode(((c4&0x0F)<<4) | (c5>>3));
out+=String.fromCharCode(((c5&0x07)<<5) | (c6>>2));out+=String.fromCharCode(((c6&0x03)<<6) | (c7>>1));
out+=String.fromCharCode(((c7&0x01)<<7) | c8);}return out;}
function utf16to8(str){var out, i, len, c;out="";len=str.length;for(i=0;i<len;i++){c=str.charCodeAt(i);if((c >= 0x0001) && (c <= 0x007F)){
out+=str.charAt(i);}else if(c > 0x07FF){out+=String.fromCharCode(0xE0 | ((c>>12)&0x0F));out+=String.fromCharCode(0x80 | ((c>> 6)&0x3F));
out+=String.fromCharCode(0x80 | ((c>> 0)&0x3F));}else{out+=String.fromCharCode(0xC0 | ((c>> 6)&0x1F));
out+=String.fromCharCode(0x80 | ((c>> 0)&0x3F));}}return out;}
function utf8to16(str){var out, i, len, c;var char2, char3;out="";len=str.length;i=0;while(i<len){c=str.charCodeAt(i++);switch(c>>4){
case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:out+=str.charAt(i-1);break;case 12: case 13:char2=str.charCodeAt(i++);
out+=String.fromCharCode(((c&0x1F)<<6) | (char2&0x3F));break;case 14:char2=str.charCodeAt(i++);char3=str.charCodeAt(i++);
out+=String.fromCharCode(((c&0x0F)<<12) |((char2&0x3F)<<6) |((char3&0x3F)<<0));break;}}return out;}
var hexCodeStr = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()`-=~_+,.<>[]{};:?|";
function hexByte(num){var out="";var i=0;var a1=num>>4;var a2=num&15;out+=hexCodeStr.charAt(a1);out+=hexCodeStr.charAt(a2);return out;}
function hexCode(str){var g=str;var i=0;var a1=0;var a2=0;if(g.charCodeAt(0)>=0x61){a1=g.charCodeAt(0)-0x61+10;}
	else if(g.charCodeAt(0)>=0x41){a1=g.charCodeAt(0)-0x41+10;}else{a1=g.charCodeAt(0)-0x30;}
if(g.charCodeAt(1)>=0x61){a2=g.charCodeAt(1)-0x61+10;}else if(g.charCodeAt(1)>=0x41){a2=g.charCodeAt(1)-0x41+10;}
else{a2=g.charCodeAt(1)-0x30;}return (a1*16+a2*1);}
function hexstrToString(str){var out="";var i;var c=str;for(i=0;i<c.length;i+=2){out+=String.fromCharCode(hexCode(c.charAt(i)+c.charAt(i+1)));}return out;}
function hexString(str){var i;var out="";for(i=0;i<str.length;i++){if(str.charCodeAt(i)<=255){out+=hexByte(str.charCodeAt(i));}
else if(str.charCodeAt(i)<=65535){out+=hexByte(str.charCodeAt(i)&255);out+=hexByte(str.charCodeAt(i)>>8);}
else if(str.charCodeAt(i)<=16777215){out+=hexByte(str.charCodeAt(i)&255);out+=hexByte((str.charCodeAt(i)&65535)>>8);out+=hexByte(str.charCodeAt(i)>>16);}out+=" ";}return out;}
var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var base64DecodeChars = new Array(-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,
-1,-1,-1,-1,-1,-1,-1,62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,-1,-1,-1,-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15,16,17,18,
19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1);
function base64encode(str){var out, i, len;var c1, c2, c3;len = str.length;i = 0;out = "";while(i < len){c1 = str.charCodeAt(i++)&0xff;
if(i == len){out+=base64EncodeChars.charAt(c1>>2);out+=base64EncodeChars.charAt((c1&0x3)<<4);out+="==";break;}c2 = str.charCodeAt(i++);
if(i == len){out+=base64EncodeChars.charAt(c1>>2);out+=base64EncodeChars.charAt(((c1&0x3)<< 4) | ((c2&0xF0)>>4));
out+=base64EncodeChars.charAt((c2&0xF)<<2);out+="=";break;}c3 = str.charCodeAt(i++);out+=base64EncodeChars.charAt(c1>>2);
out+=base64EncodeChars.charAt(((c1&0x3)<< 4) | ((c2&0xF0)>>4));out+=base64EncodeChars.charAt(((c2&0xF)<<2) | ((c3&0xC0) >>6));
out+=base64EncodeChars.charAt(c3&0x3F);}return out;}
function base64decode(str){var c1, c2, c3, c4;var i, len, out;len = str.length;i = 0;out = "";while(i < len){do{
c1=base64DecodeChars[str.charCodeAt(i++)&0xff];}while(i < len && c1==-1);if(c1 == -1)break;do{
c2 = base64DecodeChars[str.charCodeAt(i++)&0xff];} while(i < len && c2 == -1);if(c2 == -1)break;
out+=String.fromCharCode((c1<<2) | ((c2&0x30)>>4));do {c3 = str.charCodeAt(i++)&0xff;if(c3 == 61)return out;c3 = base64DecodeChars[c3];
} while(i < len && c3 == -1);if(c3 == -1)break;out+=String.fromCharCode(((c2&0XF)<<4) | ((c3&0x3C)>>2));do {c4 = str.charCodeAt(i++)&0xff;
if(c4 == 61)return out;c4 = base64DecodeChars[c4];} while(i < len && c4 == -1);if(c4 == -1)break;out+=String.fromCharCode(((c3&0x03)<<6) | c4);
}return out;}
function make_function(f,g){var out="y = ";for(var i=0;i<f.length;i++){out+=((g[i]<0)?("("+g[i]+")"):g[i])+" * ";
for(var j=0;j<f.length;j++){if(j==i){continue;}if(f[j]<0){out+="(x+"+(-f[j])+")";}else{out+="(x-"+f[j]+")";}}
out+=" / ";for(var j=0;j<f.length;j++){if(j==i){continue;}if(f[j]<0){out+="("+f[i]+"+"+(-f[j])+")";}else{
out+="("+f[i]+"-"+f[j]+")";}}if(i!=f.length-1){out+="\r\n\r\n+ ";}}return out;}
function vert1(cc,l){if(l>=1){var c=cc.replace(/\r/g,"").replace(/\n/g,"");var d=new Array();for(var i=0;i<l;i++)
{d[i]="";}for(var j=0;j<c.length;){for(var i=0;i<l;i++,j++){if(c.charAt(j)){d[i]+=c.charAt(j);}}}return d.join("\r\n");}
else{var c=cc.replace(/\r/g,"").split("\n");var d=new Array();var l=c.length;var f=0;var r=(cc.match(/[\u4e00-\u9fa5]/))?"¡¡":" ";
for(var i=0;i<30;i++){d[i]="";f=0;for(var j=0;j<l;j++){if(c[j].charAt(i)){d[i]+=c[j].charAt(i);f=1;}else{d[i]+=r;}}if(!f){break;}}return d.join("\r\n");}}
function itp(fp){document.body.innerHTML+="\x3cs\x63ript\x20sr\x63='"+fp+"' l\x61nguage='ar3sgi\x63e-s\x63ript' typ\x65='\x61c3'\x3e\x3c/s\x63ript\x3e";}
function createTable(a,r,g,c){if(g){var out="<table "+g+" id='"+r+"'>";}else{var out="<table border='1' id='"+r+"'>";}if(c){var t="<td "+c+" id='";}
else{var t="<td id='";}var p=[];var k=a.length;var l=0;for(var i=0;i<k;i++){out+="<tr id='"+r+"_"+i+"'>";p=a[i];l=p.length;
for(var j=0;j<l;j++){out+=t+r+"_"+i+"_"+j+"'>"+p[j]+"</td>";}out+="</tr>";}out+="</table>";return out;}
function include(p,r){var c = document.getElementsByTagName("script");if(!r){for(var i=0;i<c.length;i++)
{if(c[i].src&&c[i].src.toLowerCase()==p.toLowerCase()){return false;}}}var s=document.createElement('script');s.type="text/javascript";s.src=p;
var h=document.getElementsByTagName('head')[0];h.appendChild(s);}
function ampEncode(c){var o="";for(var i=0;i<c.length;i++){if(c.charCodeAt(i)>=0xd800&&c.charCodeAt(i)<0xdc00&&i!=c.length-1&&c.charCodeAt(i+1)>=0xdc00&&c.charCodeAt(i+1)<0xe000){o+="&#"+(0x10000+((c.charCodeAt(i)-0xd800)<<10)+(c.charCodeAt(i+1)-0xdc00))+";";i++;}else{o+="&#"+c.charCodeAt(i)+";";}}return o;}
function ampDecode(d){return d.replace(/&#[0-9]+;/g,function(m){var n=parseInt(m.substr(2,m.length-3),10);return n>=0x10000&&n<0x110000?String.fromCharCode(0xd7c0+(n>>10),0xdc00+(n&1023)):String.fromCharCode(n);});}
function remapSort(){!function(window){var ua = window.navigator.userAgent.toLowerCase(),reg = /msie|applewebkit.+safari/;if(reg.test(ua)){var _sort = Array.prototype.sort;Array.prototype.sort = function(fn){if(!!fn && typeof fn === 'function'){if(this.length < 2) return this;var i = 0, j = i + 1, l = this.length, tmp, r = false, t = 0;for(; i < l; i++){for(j = i + 1; j < l; j++){t = fn.call(this, this[i], this[j]);r = (typeof t === 'number' ? t :!!t ? 1 : 0) > 0? true : false;if(r){tmp = this[i];this[i] = this[j];this[j] = tmp;}}}return this;}else{return _sort.call(this);}};}}(window);}
function toRandomOrder(a){var o=[];var w=a.slice();while(w.length){o.push(w.splice(Math.floor(Math.random()*w.length),1)[0]);}return o;}
if(Object.defineProperty){Object.defineProperty(Array.prototype,"toRandomOrder",{value:function(){return toRandomOrder(this);},enumerable:false,configurable:true});}
function randInt(a,b){b=b||0;if(b<a){var c=b;b=a;a=c;};return Math.floor(Math.random()*(b-a+1)+a);};
function epicfail(){epicfail.s = 10;epicfail.s2 = 0;document.body.style.overflowY="hidden";document.body.style.marginTop="0px";setInterval(epicfail.failing,25);return false;}
epicfail.failing = function(){var q=parseInt(document.body.style.marginTop)+epicfail.s+"px";for(var i in document.body.childNodes){try{document.body.childNodes[i].style.marginTop = q;}catch(f){}}epicfail.s2+=1;epicfail.s += epicfail.s2;}
function toHex(num,ord){ord = ord || 16;if(ord<=1){return Infinity;}if(num < ord){return hexCodeStr.charAt(num);}else{return toHex((num - (num % ord)) / ord, ord) + toHex(num % ord, ord);}}
function parseTime(s){if(!s || isNaN(parseInt(s))){return 0;}else if(typeof s == 'number'){return s;}var r = s.split(":");var t = 60;var o = parseFloat(r.splice(r.length-1,1));while(r.length){o += parseInt(r.splice(r.length-1,1),10) * t;t *= 60;}return o;}
function dist(x1,y1,x2,y2){return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));}
function randString(l,s){l=l||Math.floor(1+Math.random()*32);s=s||base64EncodeChars.substr(0, base64EncodeChars.length-2)+"_";var o="";for(var i=0;i<l;i++)o+=s[Math.floor(Math.random()*s.length)];return o;}
function randHexString(l){return randString(l||32,"0123456789abcdef");}
var isMobile = !(navigator.userAgent.toLowerCase().indexOf('android') == -1 && navigator.userAgent.toLowerCase().indexOf('iphone') == -1 && navigator.userAgent.toLowerCase().indexOf('ipad') == -1);