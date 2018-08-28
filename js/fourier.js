(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
fourier = require('./index');

/* eslint-env browser */
/* global fourier: 0 */
/* eslint no-unused-vars: 0 */

},{"./index":8}],2:[function(require,module,exports){
'use strict';

/**
Discrete Fourier transform (DFT).
(the slowest possible implementation)
Assumes `inpReal` and `inpImag` arrays have the same size.
*/
module.exports = function (inpReal, inpImag) {
    var N,
        k,
        n,
        angle,
        outReal = [],
        outImag = [],
        sumReal,
        sumImag,
        nn,
        sin = [],
        cos = [],
        twoPiByN;

    N = inpReal.length;
    twoPiByN = Math.PI / N * 2;

    /* initialize Sin / Cos tables */
    for (k = 0; k < N; k++) {
        angle = twoPiByN * k;
        sin.push(Math.sin(angle));
        cos.push(Math.cos(angle));
    }

    for (k = 0; k < N; k++) {
        sumReal = 0;
        sumImag = 0;
        nn = 0;
        for (n = 0; n < N; n++) {
            sumReal +=  inpReal[n] * cos[nn] + inpImag[n] * sin[nn];
            sumImag += -inpReal[n] * sin[nn] + inpImag[n] * cos[nn];
            nn = (nn + k) % N;
        }
        outReal.push(sumReal);
        outImag.push(sumImag);
    }
    return [outReal, outImag];
};

},{}],3:[function(require,module,exports){
'use strict';

exports.alloc = function (size, base) {
    // allocate space for Real, Imag and Twiddles
    // Assumes Float data
    var byteSize,
        last,
        i;

    byteSize = (1 << base) * size * 13 / 4;
    i = 0x8000;
    last = i;
    for (; i < 0x10000000; i <<= 1) {
        if (byteSize & i) {
            last = i;
        }
    }
    byteSize = last << 1;
    // console.log('0x' + byteSize.toString(16));
    return new ArrayBuffer(byteSize);
};

exports.array2heap = function (input, arr, size, offset) {
    var i;
    for (i = 0; i < size; i++) {
        arr[i + offset] = input[i];
    }
};

exports.heap2array = function (arr, output, size, offset) {
    var i;
    for (i = 0; i < size; i++) {
        output[i] = arr[i + offset];
    }
};

exports.fft_f32_16_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.39269908169872414;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 128,
            s1 = 160,
            s2 = 160,
            s3 = 192,
            s4 = 192;

        data[32] = 0.0;
        data[36] = 1.0;
        data[40] = 0.0;
        data[44] = -1.0;
        data[48] = 0.0;

        for (i = 1; (i | 0) < 4; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 64; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 4; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 64) | 0) >> 2]);
                data[((i + 64) | 0) >> 2] = fround(data[((j + 64) | 0) >> 2]);
                data[((j + 64) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 32;
        half = 4;
        for (width = 8; (width | 0) <= 64; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 64; i = (i + width) | 0) {
                k = 128;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 64) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 64) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 16) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 64) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 64) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_32_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.19634954084936207;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 256,
            s1 = 320,
            s2 = 320,
            s3 = 384,
            s4 = 384;

        data[64] = 0.0;
        data[72] = 1.0;
        data[80] = 0.0;
        data[88] = -1.0;
        data[96] = 0.0;

        for (i = 1; (i | 0) < 8; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 128; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 5; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 128) | 0) >> 2]);
                data[((i + 128) | 0) >> 2] = fround(data[((j + 128) | 0) >> 2]);
                data[((j + 128) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 64;
        half = 4;
        for (width = 8; (width | 0) <= 128; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 128; i = (i + width) | 0) {
                k = 256;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 128) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 128) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 32) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 128) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 128) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_64_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.09817477042468103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 512,
            s1 = 640,
            s2 = 640,
            s3 = 768,
            s4 = 768;

        data[128] = 0.0;
        data[144] = 1.0;
        data[160] = 0.0;
        data[176] = -1.0;
        data[192] = 0.0;

        for (i = 1; (i | 0) < 16; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 256; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 6; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 256) | 0) >> 2]);
                data[((i + 256) | 0) >> 2] = fround(data[((j + 256) | 0) >> 2]);
                data[((j + 256) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 128;
        half = 4;
        for (width = 8; (width | 0) <= 256; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 256; i = (i + width) | 0) {
                k = 512;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 256) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 256) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 64) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 256) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 256) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_128_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.04908738521234052;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1024,
            s1 = 1280,
            s2 = 1280,
            s3 = 1536,
            s4 = 1536;

        data[256] = 0.0;
        data[288] = 1.0;
        data[320] = 0.0;
        data[352] = -1.0;
        data[384] = 0.0;

        for (i = 1; (i | 0) < 32; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 512; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 7; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 512) | 0) >> 2]);
                data[((i + 512) | 0) >> 2] = fround(data[((j + 512) | 0) >> 2]);
                data[((j + 512) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 256;
        half = 4;
        for (width = 8; (width | 0) <= 512; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 512; i = (i + width) | 0) {
                k = 1024;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 512) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 512) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 128) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 512) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 512) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_256_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.02454369260617026;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2048,
            s1 = 2560,
            s2 = 2560,
            s3 = 3072,
            s4 = 3072;

        data[512] = 0.0;
        data[576] = 1.0;
        data[640] = 0.0;
        data[704] = -1.0;
        data[768] = 0.0;

        for (i = 1; (i | 0) < 64; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 1024; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 8; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 1024) | 0) >> 2]);
                data[((i + 1024) | 0) >> 2] = fround(data[((j + 1024) | 0) >> 2]);
                data[((j + 1024) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 512;
        half = 4;
        for (width = 8; (width | 0) <= 1024; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1024; i = (i + width) | 0) {
                k = 2048;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 1024) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 1024) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 256) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 1024) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 1024) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_512_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.01227184630308513;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4096,
            s1 = 5120,
            s2 = 5120,
            s3 = 6144,
            s4 = 6144;

        data[1024] = 0.0;
        data[1152] = 1.0;
        data[1280] = 0.0;
        data[1408] = -1.0;
        data[1536] = 0.0;

        for (i = 1; (i | 0) < 128; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 2048; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 9; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 2048) | 0) >> 2]);
                data[((i + 2048) | 0) >> 2] = fround(data[((j + 2048) | 0) >> 2]);
                data[((j + 2048) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 1024;
        half = 4;
        for (width = 8; (width | 0) <= 2048; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2048; i = (i + width) | 0) {
                k = 4096;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 2048) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 2048) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 512) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 2048) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 2048) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_1024_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.006135923151542565;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8192,
            s1 = 10240,
            s2 = 10240,
            s3 = 12288,
            s4 = 12288;

        data[2048] = 0.0;
        data[2304] = 1.0;
        data[2560] = 0.0;
        data[2816] = -1.0;
        data[3072] = 0.0;

        for (i = 1; (i | 0) < 256; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 4096; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 10; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 4096) | 0) >> 2]);
                data[((i + 4096) | 0) >> 2] = fround(data[((j + 4096) | 0) >> 2]);
                data[((j + 4096) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 2048;
        half = 4;
        for (width = 8; (width | 0) <= 4096; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4096; i = (i + width) | 0) {
                k = 8192;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 4096) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 4096) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 1024) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 4096) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 4096) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_2048_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0030679615757712823;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 16384,
            s1 = 20480,
            s2 = 20480,
            s3 = 24576,
            s4 = 24576;

        data[4096] = 0.0;
        data[4608] = 1.0;
        data[5120] = 0.0;
        data[5632] = -1.0;
        data[6144] = 0.0;

        for (i = 1; (i | 0) < 512; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 8192; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 11; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 8192) | 0) >> 2]);
                data[((i + 8192) | 0) >> 2] = fround(data[((j + 8192) | 0) >> 2]);
                data[((j + 8192) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 4096;
        half = 4;
        for (width = 8; (width | 0) <= 8192; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 8192; i = (i + width) | 0) {
                k = 16384;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 8192) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 8192) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 2048) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 8192) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 8192) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_4096_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0015339807878856412;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 32768,
            s1 = 40960,
            s2 = 40960,
            s3 = 49152,
            s4 = 49152;

        data[8192] = 0.0;
        data[9216] = 1.0;
        data[10240] = 0.0;
        data[11264] = -1.0;
        data[12288] = 0.0;

        for (i = 1; (i | 0) < 1024; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 16384; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 12; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 16384) | 0) >> 2]);
                data[((i + 16384) | 0) >> 2] = fround(data[((j + 16384) | 0) >> 2]);
                data[((j + 16384) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 8192;
        half = 4;
        for (width = 8; (width | 0) <= 16384; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 16384; i = (i + width) | 0) {
                k = 32768;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 16384) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 16384) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 4096) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 16384) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 16384) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_8192_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0007669903939428206;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 65536,
            s1 = 81920,
            s2 = 81920,
            s3 = 98304,
            s4 = 98304;

        data[16384] = 0.0;
        data[18432] = 1.0;
        data[20480] = 0.0;
        data[22528] = -1.0;
        data[24576] = 0.0;

        for (i = 1; (i | 0) < 2048; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 32768; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 13; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 32768) | 0) >> 2]);
                data[((i + 32768) | 0) >> 2] = fround(data[((j + 32768) | 0) >> 2]);
                data[((j + 32768) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 16384;
        half = 4;
        for (width = 8; (width | 0) <= 32768; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 32768; i = (i + width) | 0) {
                k = 65536;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 32768) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 32768) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 8192) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 32768) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 32768) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_16384_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0003834951969714103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 131072,
            s1 = 163840,
            s2 = 163840,
            s3 = 196608,
            s4 = 196608;

        data[32768] = 0.0;
        data[36864] = 1.0;
        data[40960] = 0.0;
        data[45056] = -1.0;
        data[49152] = 0.0;

        for (i = 1; (i | 0) < 4096; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 65536; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 14; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 65536) | 0) >> 2]);
                data[((i + 65536) | 0) >> 2] = fround(data[((j + 65536) | 0) >> 2]);
                data[((j + 65536) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 32768;
        half = 4;
        for (width = 8; (width | 0) <= 65536; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 65536; i = (i + width) | 0) {
                k = 131072;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 65536) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 65536) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 16384) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 65536) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 65536) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_32768_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.00019174759848570515;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 262144,
            s1 = 327680,
            s2 = 327680,
            s3 = 393216,
            s4 = 393216;

        data[65536] = 0.0;
        data[73728] = 1.0;
        data[81920] = 0.0;
        data[90112] = -1.0;
        data[98304] = 0.0;

        for (i = 1; (i | 0) < 8192; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 131072; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 15; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 131072) | 0) >> 2]);
                data[((i + 131072) | 0) >> 2] = fround(data[((j + 131072) | 0) >> 2]);
                data[((j + 131072) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 65536;
        half = 4;
        for (width = 8; (width | 0) <= 131072; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 131072; i = (i + width) | 0) {
                k = 262144;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 131072) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 131072) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 32768) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 131072) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 131072) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_65536_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.00009587379924285257;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 524288,
            s1 = 655360,
            s2 = 655360,
            s3 = 786432,
            s4 = 786432;

        data[131072] = 0.0;
        data[147456] = 1.0;
        data[163840] = 0.0;
        data[180224] = -1.0;
        data[196608] = 0.0;

        for (i = 1; (i | 0) < 16384; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 262144; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 16; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 262144) | 0) >> 2]);
                data[((i + 262144) | 0) >> 2] = fround(data[((j + 262144) | 0) >> 2]);
                data[((j + 262144) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 131072;
        half = 4;
        for (width = 8; (width | 0) <= 262144; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 262144; i = (i + width) | 0) {
                k = 524288;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 262144) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 262144) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 65536) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 262144) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 262144) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_131072_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000047936899621426287;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1048576,
            s1 = 1310720,
            s2 = 1310720,
            s3 = 1572864,
            s4 = 1572864;

        data[262144] = 0.0;
        data[294912] = 1.0;
        data[327680] = 0.0;
        data[360448] = -1.0;
        data[393216] = 0.0;

        for (i = 1; (i | 0) < 32768; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 524288; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 17; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 524288) | 0) >> 2]);
                data[((i + 524288) | 0) >> 2] = fround(data[((j + 524288) | 0) >> 2]);
                data[((j + 524288) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 262144;
        half = 4;
        for (width = 8; (width | 0) <= 524288; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 524288; i = (i + width) | 0) {
                k = 1048576;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 524288) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 524288) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 131072) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 524288) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 524288) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_262144_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000023968449810713143;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2097152,
            s1 = 2621440,
            s2 = 2621440,
            s3 = 3145728,
            s4 = 3145728;

        data[524288] = 0.0;
        data[589824] = 1.0;
        data[655360] = 0.0;
        data[720896] = -1.0;
        data[786432] = 0.0;

        for (i = 1; (i | 0) < 65536; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 1048576; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 18; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 1048576) | 0) >> 2]);
                data[((i + 1048576) | 0) >> 2] = fround(data[((j + 1048576) | 0) >> 2]);
                data[((j + 1048576) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 524288;
        half = 4;
        for (width = 8; (width | 0) <= 1048576; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1048576; i = (i + width) | 0) {
                k = 2097152;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 1048576) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 1048576) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 262144) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 1048576) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 1048576) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_524288_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000011984224905356572;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4194304,
            s1 = 5242880,
            s2 = 5242880,
            s3 = 6291456,
            s4 = 6291456;

        data[1048576] = 0.0;
        data[1179648] = 1.0;
        data[1310720] = 0.0;
        data[1441792] = -1.0;
        data[1572864] = 0.0;

        for (i = 1; (i | 0) < 131072; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 2097152; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 19; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 2097152) | 0) >> 2]);
                data[((i + 2097152) | 0) >> 2] = fround(data[((j + 2097152) | 0) >> 2]);
                data[((j + 2097152) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 1048576;
        half = 4;
        for (width = 8; (width | 0) <= 2097152; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2097152; i = (i + width) | 0) {
                k = 4194304;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 2097152) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 2097152) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 524288) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 2097152) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 2097152) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_1048576_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000005992112452678286;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8388608,
            s1 = 10485760,
            s2 = 10485760,
            s3 = 12582912,
            s4 = 12582912;

        data[2097152] = 0.0;
        data[2359296] = 1.0;
        data[2621440] = 0.0;
        data[2883584] = -1.0;
        data[3145728] = 0.0;

        for (i = 1; (i | 0) < 262144; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = fround(tmp);
            data[s1 >> 2] = fround(tmp);
            data[s4 >> 2] = fround(tmp);
            data[s2 >> 2] = fround(-tmp);
            data[s3 >> 2] = fround(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 4194304; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 20; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = fround(data[i >> 2]);
                data[i >> 2] = fround(data[j >> 2]);
                data[j >> 2] = fround(tmpReal);

                tmpImag = fround(data[((i + 4194304) | 0) >> 2]);
                data[((i + 4194304) | 0) >> 2] = fround(data[((j + 4194304) | 0) >> 2]);
                data[((j + 4194304) | 0) >> 2] = fround(tmpImag);
            }
        }

        step = 2097152;
        half = 4;
        for (width = 8; (width | 0) <= 4194304; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4194304; i = (i + width) | 0) {
                k = 8388608;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = fround(data[j >> 2]);
                    imagj = fround(data[(j + 4194304) >> 2]);

                    realjh = fround(data[jh >> 2]);
                    imagjh = fround(data[(jh + 4194304) >> 2]);

                    sink = fround(data[k >> 2]);
                    sinkNq = fround(data[(k + 1048576) >> 2]);

                    // complex multiplication
                    tmpReal = fround(
                        fround(
                            fround(imagjh) *
                            fround(sink)
                        )
                        +
                        fround(
                            fround(realjh) *
                            fround(sinkNq)
                        )
                    );
                    tmpImag = fround(
                        fround(
                            fround(imagjh) *
                            fround(sinkNq)
                        )
                        -
                        fround(
                            fround(realjh) *
                            fround(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = fround(realj - tmpReal);
                    data[((jh + 4194304) | 0) >> 2] = fround(imagj - tmpImag);
                    data[j >> 2] = fround(realj + tmpReal);
                    data[((j + 4194304) | 0) >> 2] = fround(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_16_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.39269908169872414;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 256,
            s1 = 320,
            s2 = 320,
            s3 = 384,
            s4 = 384;

        data[32] = 0.0;
        data[36] = 1.0;
        data[40] = 0.0;
        data[44] = -1.0;
        data[48] = 0.0;

        for (i = 1; (i | 0) < 4; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 128; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 4; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 128) | 0) >> 3]);
                data[((i + 128) | 0) >> 3] = +(data[((j + 128) | 0) >> 3]);
                data[((j + 128) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 64;
        half = 8;
        for (width = 16; (width | 0) <= 128; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 128; i = (i + width) | 0) {
                k = 256;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 128) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 128) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 32) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 128) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 128) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_32_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.19634954084936207;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 512,
            s1 = 640,
            s2 = 640,
            s3 = 768,
            s4 = 768;

        data[64] = 0.0;
        data[72] = 1.0;
        data[80] = 0.0;
        data[88] = -1.0;
        data[96] = 0.0;

        for (i = 1; (i | 0) < 8; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 256; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 5; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 256) | 0) >> 3]);
                data[((i + 256) | 0) >> 3] = +(data[((j + 256) | 0) >> 3]);
                data[((j + 256) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 128;
        half = 8;
        for (width = 16; (width | 0) <= 256; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 256; i = (i + width) | 0) {
                k = 512;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 256) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 256) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 64) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 256) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 256) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_64_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.09817477042468103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1024,
            s1 = 1280,
            s2 = 1280,
            s3 = 1536,
            s4 = 1536;

        data[128] = 0.0;
        data[144] = 1.0;
        data[160] = 0.0;
        data[176] = -1.0;
        data[192] = 0.0;

        for (i = 1; (i | 0) < 16; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 512; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 6; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 512) | 0) >> 3]);
                data[((i + 512) | 0) >> 3] = +(data[((j + 512) | 0) >> 3]);
                data[((j + 512) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 256;
        half = 8;
        for (width = 16; (width | 0) <= 512; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 512; i = (i + width) | 0) {
                k = 1024;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 512) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 512) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 128) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 512) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 512) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_128_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.04908738521234052;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2048,
            s1 = 2560,
            s2 = 2560,
            s3 = 3072,
            s4 = 3072;

        data[256] = 0.0;
        data[288] = 1.0;
        data[320] = 0.0;
        data[352] = -1.0;
        data[384] = 0.0;

        for (i = 1; (i | 0) < 32; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 1024; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 7; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 1024) | 0) >> 3]);
                data[((i + 1024) | 0) >> 3] = +(data[((j + 1024) | 0) >> 3]);
                data[((j + 1024) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 512;
        half = 8;
        for (width = 16; (width | 0) <= 1024; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1024; i = (i + width) | 0) {
                k = 2048;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 1024) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 1024) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 256) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 1024) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 1024) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_256_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.02454369260617026;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4096,
            s1 = 5120,
            s2 = 5120,
            s3 = 6144,
            s4 = 6144;

        data[512] = 0.0;
        data[576] = 1.0;
        data[640] = 0.0;
        data[704] = -1.0;
        data[768] = 0.0;

        for (i = 1; (i | 0) < 64; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 2048; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 8; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 2048) | 0) >> 3]);
                data[((i + 2048) | 0) >> 3] = +(data[((j + 2048) | 0) >> 3]);
                data[((j + 2048) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 1024;
        half = 8;
        for (width = 16; (width | 0) <= 2048; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2048; i = (i + width) | 0) {
                k = 4096;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 2048) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 2048) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 512) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 2048) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 2048) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_512_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.01227184630308513;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8192,
            s1 = 10240,
            s2 = 10240,
            s3 = 12288,
            s4 = 12288;

        data[1024] = 0.0;
        data[1152] = 1.0;
        data[1280] = 0.0;
        data[1408] = -1.0;
        data[1536] = 0.0;

        for (i = 1; (i | 0) < 128; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 4096; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 9; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 4096) | 0) >> 3]);
                data[((i + 4096) | 0) >> 3] = +(data[((j + 4096) | 0) >> 3]);
                data[((j + 4096) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 2048;
        half = 8;
        for (width = 16; (width | 0) <= 4096; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4096; i = (i + width) | 0) {
                k = 8192;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 4096) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 4096) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 1024) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 4096) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 4096) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_1024_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.006135923151542565;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 16384,
            s1 = 20480,
            s2 = 20480,
            s3 = 24576,
            s4 = 24576;

        data[2048] = 0.0;
        data[2304] = 1.0;
        data[2560] = 0.0;
        data[2816] = -1.0;
        data[3072] = 0.0;

        for (i = 1; (i | 0) < 256; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 8192; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 10; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 8192) | 0) >> 3]);
                data[((i + 8192) | 0) >> 3] = +(data[((j + 8192) | 0) >> 3]);
                data[((j + 8192) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 4096;
        half = 8;
        for (width = 16; (width | 0) <= 8192; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 8192; i = (i + width) | 0) {
                k = 16384;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 8192) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 8192) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 2048) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 8192) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 8192) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_2048_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0030679615757712823;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 32768,
            s1 = 40960,
            s2 = 40960,
            s3 = 49152,
            s4 = 49152;

        data[4096] = 0.0;
        data[4608] = 1.0;
        data[5120] = 0.0;
        data[5632] = -1.0;
        data[6144] = 0.0;

        for (i = 1; (i | 0) < 512; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 16384; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 11; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 16384) | 0) >> 3]);
                data[((i + 16384) | 0) >> 3] = +(data[((j + 16384) | 0) >> 3]);
                data[((j + 16384) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 8192;
        half = 8;
        for (width = 16; (width | 0) <= 16384; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 16384; i = (i + width) | 0) {
                k = 32768;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 16384) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 16384) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 4096) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 16384) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 16384) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_4096_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0015339807878856412;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 65536,
            s1 = 81920,
            s2 = 81920,
            s3 = 98304,
            s4 = 98304;

        data[8192] = 0.0;
        data[9216] = 1.0;
        data[10240] = 0.0;
        data[11264] = -1.0;
        data[12288] = 0.0;

        for (i = 1; (i | 0) < 1024; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 32768; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 12; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 32768) | 0) >> 3]);
                data[((i + 32768) | 0) >> 3] = +(data[((j + 32768) | 0) >> 3]);
                data[((j + 32768) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 16384;
        half = 8;
        for (width = 16; (width | 0) <= 32768; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 32768; i = (i + width) | 0) {
                k = 65536;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 32768) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 32768) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 8192) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 32768) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 32768) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_8192_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0007669903939428206;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 131072,
            s1 = 163840,
            s2 = 163840,
            s3 = 196608,
            s4 = 196608;

        data[16384] = 0.0;
        data[18432] = 1.0;
        data[20480] = 0.0;
        data[22528] = -1.0;
        data[24576] = 0.0;

        for (i = 1; (i | 0) < 2048; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 65536; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 13; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 65536) | 0) >> 3]);
                data[((i + 65536) | 0) >> 3] = +(data[((j + 65536) | 0) >> 3]);
                data[((j + 65536) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 32768;
        half = 8;
        for (width = 16; (width | 0) <= 65536; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 65536; i = (i + width) | 0) {
                k = 131072;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 65536) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 65536) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 16384) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 65536) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 65536) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_16384_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0003834951969714103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 262144,
            s1 = 327680,
            s2 = 327680,
            s3 = 393216,
            s4 = 393216;

        data[32768] = 0.0;
        data[36864] = 1.0;
        data[40960] = 0.0;
        data[45056] = -1.0;
        data[49152] = 0.0;

        for (i = 1; (i | 0) < 4096; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 131072; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 14; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 131072) | 0) >> 3]);
                data[((i + 131072) | 0) >> 3] = +(data[((j + 131072) | 0) >> 3]);
                data[((j + 131072) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 65536;
        half = 8;
        for (width = 16; (width | 0) <= 131072; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 131072; i = (i + width) | 0) {
                k = 262144;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 131072) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 131072) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 32768) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 131072) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 131072) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_32768_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.00019174759848570515;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 524288,
            s1 = 655360,
            s2 = 655360,
            s3 = 786432,
            s4 = 786432;

        data[65536] = 0.0;
        data[73728] = 1.0;
        data[81920] = 0.0;
        data[90112] = -1.0;
        data[98304] = 0.0;

        for (i = 1; (i | 0) < 8192; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 262144; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 15; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 262144) | 0) >> 3]);
                data[((i + 262144) | 0) >> 3] = +(data[((j + 262144) | 0) >> 3]);
                data[((j + 262144) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 131072;
        half = 8;
        for (width = 16; (width | 0) <= 262144; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 262144; i = (i + width) | 0) {
                k = 524288;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 262144) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 262144) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 65536) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 262144) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 262144) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_65536_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.00009587379924285257;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1048576,
            s1 = 1310720,
            s2 = 1310720,
            s3 = 1572864,
            s4 = 1572864;

        data[131072] = 0.0;
        data[147456] = 1.0;
        data[163840] = 0.0;
        data[180224] = -1.0;
        data[196608] = 0.0;

        for (i = 1; (i | 0) < 16384; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 524288; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 16; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 524288) | 0) >> 3]);
                data[((i + 524288) | 0) >> 3] = +(data[((j + 524288) | 0) >> 3]);
                data[((j + 524288) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 262144;
        half = 8;
        for (width = 16; (width | 0) <= 524288; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 524288; i = (i + width) | 0) {
                k = 1048576;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 524288) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 524288) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 131072) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 524288) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 524288) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_131072_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000047936899621426287;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2097152,
            s1 = 2621440,
            s2 = 2621440,
            s3 = 3145728,
            s4 = 3145728;

        data[262144] = 0.0;
        data[294912] = 1.0;
        data[327680] = 0.0;
        data[360448] = -1.0;
        data[393216] = 0.0;

        for (i = 1; (i | 0) < 32768; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 1048576; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 17; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 1048576) | 0) >> 3]);
                data[((i + 1048576) | 0) >> 3] = +(data[((j + 1048576) | 0) >> 3]);
                data[((j + 1048576) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 524288;
        half = 8;
        for (width = 16; (width | 0) <= 1048576; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1048576; i = (i + width) | 0) {
                k = 2097152;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 1048576) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 1048576) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 262144) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 1048576) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 1048576) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_262144_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000023968449810713143;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4194304,
            s1 = 5242880,
            s2 = 5242880,
            s3 = 6291456,
            s4 = 6291456;

        data[524288] = 0.0;
        data[589824] = 1.0;
        data[655360] = 0.0;
        data[720896] = -1.0;
        data[786432] = 0.0;

        for (i = 1; (i | 0) < 65536; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 2097152; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 18; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 2097152) | 0) >> 3]);
                data[((i + 2097152) | 0) >> 3] = +(data[((j + 2097152) | 0) >> 3]);
                data[((j + 2097152) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 1048576;
        half = 8;
        for (width = 16; (width | 0) <= 2097152; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2097152; i = (i + width) | 0) {
                k = 4194304;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 2097152) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 2097152) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 524288) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 2097152) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 2097152) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_524288_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000011984224905356572;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8388608,
            s1 = 10485760,
            s2 = 10485760,
            s3 = 12582912,
            s4 = 12582912;

        data[1048576] = 0.0;
        data[1179648] = 1.0;
        data[1310720] = 0.0;
        data[1441792] = -1.0;
        data[1572864] = 0.0;

        for (i = 1; (i | 0) < 131072; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 4194304; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 19; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 4194304) | 0) >> 3]);
                data[((i + 4194304) | 0) >> 3] = +(data[((j + 4194304) | 0) >> 3]);
                data[((j + 4194304) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 2097152;
        half = 8;
        for (width = 16; (width | 0) <= 4194304; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4194304; i = (i + width) | 0) {
                k = 8388608;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 4194304) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 4194304) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 1048576) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 4194304) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 4194304) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_1048576_asm = function (stdlib, foreign, buffer) {
    'use asm';

    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000005992112452678286;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 16777216,
            s1 = 20971520,
            s2 = 20971520,
            s3 = 25165824,
            s4 = 25165824;

        data[2097152] = 0.0;
        data[2359296] = 1.0;
        data[2621440] = 0.0;
        data[2883584] = -1.0;
        data[3145728] = 0.0;

        for (i = 1; (i | 0) < 262144; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = +(tmp);
            data[s1 >> 3] = +(tmp);
            data[s4 >> 3] = +(tmp);
            data[s2 >> 3] = +(-tmp);
            data[s3 >> 3] = +(-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 8388608; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 20; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = +(data[i >> 3]);
                data[i >> 3] = +(data[j >> 3]);
                data[j >> 3] = +(tmpReal);

                tmpImag = +(data[((i + 8388608) | 0) >> 3]);
                data[((i + 8388608) | 0) >> 3] = +(data[((j + 8388608) | 0) >> 3]);
                data[((j + 8388608) | 0) >> 3] = +(tmpImag);
            }
        }

        step = 4194304;
        half = 8;
        for (width = 16; (width | 0) <= 8388608; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 8388608; i = (i + width) | 0) {
                k = 16777216;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = +(data[j >> 3]);
                    imagj = +(data[(j + 8388608) >> 3]);

                    realjh = +(data[jh >> 3]);
                    imagjh = +(data[(jh + 8388608) >> 3]);

                    sink = +(data[k >> 3]);
                    sinkNq = +(data[(k + 2097152) >> 3]);

                    // complex multiplication
                    tmpReal = +(
                        +(
                            +(imagjh) *
                            +(sink)
                        )
                        +
                        +(
                            +(realjh) *
                            +(sinkNq)
                        )
                    );
                    tmpImag = +(
                        +(
                            +(imagjh) *
                            +(sinkNq)
                        )
                        -
                        +(
                            +(realjh) *
                            +(sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = +(realj - tmpReal);
                    data[((jh + 8388608) | 0) >> 3] = +(imagj - tmpImag);
                    data[j >> 3] = +(realj + tmpReal);
                    data[((j + 8388608) | 0) >> 3] = +(imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_16_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.39269908169872414;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 128,
            s1 = 160,
            s2 = 160,
            s3 = 192,
            s4 = 192;

        data[32] = 0.0;
        data[36] = 1.0;
        data[40] = 0.0;
        data[44] = -1.0;
        data[48] = 0.0;

        for (i = 1; (i | 0) < 4; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 64; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 4; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 64) | 0) >> 2]);
                data[((i + 64) | 0) >> 2] = (data[((j + 64) | 0) >> 2]);
                data[((j + 64) | 0) >> 2] = (tmpImag);
            }
        }

        step = 32;
        half = 4;
        for (width = 8; (width | 0) <= 64; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 64; i = (i + width) | 0) {
                k = 128;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 64) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 64) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 16) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 64) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 64) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_32_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.19634954084936207;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 256,
            s1 = 320,
            s2 = 320,
            s3 = 384,
            s4 = 384;

        data[64] = 0.0;
        data[72] = 1.0;
        data[80] = 0.0;
        data[88] = -1.0;
        data[96] = 0.0;

        for (i = 1; (i | 0) < 8; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 128; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 5; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 128) | 0) >> 2]);
                data[((i + 128) | 0) >> 2] = (data[((j + 128) | 0) >> 2]);
                data[((j + 128) | 0) >> 2] = (tmpImag);
            }
        }

        step = 64;
        half = 4;
        for (width = 8; (width | 0) <= 128; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 128; i = (i + width) | 0) {
                k = 256;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 128) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 128) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 32) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 128) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 128) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_64_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.09817477042468103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 512,
            s1 = 640,
            s2 = 640,
            s3 = 768,
            s4 = 768;

        data[128] = 0.0;
        data[144] = 1.0;
        data[160] = 0.0;
        data[176] = -1.0;
        data[192] = 0.0;

        for (i = 1; (i | 0) < 16; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 256; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 6; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 256) | 0) >> 2]);
                data[((i + 256) | 0) >> 2] = (data[((j + 256) | 0) >> 2]);
                data[((j + 256) | 0) >> 2] = (tmpImag);
            }
        }

        step = 128;
        half = 4;
        for (width = 8; (width | 0) <= 256; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 256; i = (i + width) | 0) {
                k = 512;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 256) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 256) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 64) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 256) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 256) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_128_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.04908738521234052;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1024,
            s1 = 1280,
            s2 = 1280,
            s3 = 1536,
            s4 = 1536;

        data[256] = 0.0;
        data[288] = 1.0;
        data[320] = 0.0;
        data[352] = -1.0;
        data[384] = 0.0;

        for (i = 1; (i | 0) < 32; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 512; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 7; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 512) | 0) >> 2]);
                data[((i + 512) | 0) >> 2] = (data[((j + 512) | 0) >> 2]);
                data[((j + 512) | 0) >> 2] = (tmpImag);
            }
        }

        step = 256;
        half = 4;
        for (width = 8; (width | 0) <= 512; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 512; i = (i + width) | 0) {
                k = 1024;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 512) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 512) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 128) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 512) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 512) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_256_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.02454369260617026;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2048,
            s1 = 2560,
            s2 = 2560,
            s3 = 3072,
            s4 = 3072;

        data[512] = 0.0;
        data[576] = 1.0;
        data[640] = 0.0;
        data[704] = -1.0;
        data[768] = 0.0;

        for (i = 1; (i | 0) < 64; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 1024; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 8; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 1024) | 0) >> 2]);
                data[((i + 1024) | 0) >> 2] = (data[((j + 1024) | 0) >> 2]);
                data[((j + 1024) | 0) >> 2] = (tmpImag);
            }
        }

        step = 512;
        half = 4;
        for (width = 8; (width | 0) <= 1024; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1024; i = (i + width) | 0) {
                k = 2048;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 1024) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 1024) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 256) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 1024) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 1024) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_512_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.01227184630308513;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4096,
            s1 = 5120,
            s2 = 5120,
            s3 = 6144,
            s4 = 6144;

        data[1024] = 0.0;
        data[1152] = 1.0;
        data[1280] = 0.0;
        data[1408] = -1.0;
        data[1536] = 0.0;

        for (i = 1; (i | 0) < 128; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 2048; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 9; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 2048) | 0) >> 2]);
                data[((i + 2048) | 0) >> 2] = (data[((j + 2048) | 0) >> 2]);
                data[((j + 2048) | 0) >> 2] = (tmpImag);
            }
        }

        step = 1024;
        half = 4;
        for (width = 8; (width | 0) <= 2048; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2048; i = (i + width) | 0) {
                k = 4096;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 2048) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 2048) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 512) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 2048) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 2048) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_1024_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.006135923151542565;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8192,
            s1 = 10240,
            s2 = 10240,
            s3 = 12288,
            s4 = 12288;

        data[2048] = 0.0;
        data[2304] = 1.0;
        data[2560] = 0.0;
        data[2816] = -1.0;
        data[3072] = 0.0;

        for (i = 1; (i | 0) < 256; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 4096; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 10; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 4096) | 0) >> 2]);
                data[((i + 4096) | 0) >> 2] = (data[((j + 4096) | 0) >> 2]);
                data[((j + 4096) | 0) >> 2] = (tmpImag);
            }
        }

        step = 2048;
        half = 4;
        for (width = 8; (width | 0) <= 4096; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4096; i = (i + width) | 0) {
                k = 8192;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 4096) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 4096) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 1024) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 4096) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 4096) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_2048_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0030679615757712823;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 16384,
            s1 = 20480,
            s2 = 20480,
            s3 = 24576,
            s4 = 24576;

        data[4096] = 0.0;
        data[4608] = 1.0;
        data[5120] = 0.0;
        data[5632] = -1.0;
        data[6144] = 0.0;

        for (i = 1; (i | 0) < 512; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 8192; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 11; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 8192) | 0) >> 2]);
                data[((i + 8192) | 0) >> 2] = (data[((j + 8192) | 0) >> 2]);
                data[((j + 8192) | 0) >> 2] = (tmpImag);
            }
        }

        step = 4096;
        half = 4;
        for (width = 8; (width | 0) <= 8192; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 8192; i = (i + width) | 0) {
                k = 16384;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 8192) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 8192) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 2048) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 8192) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 8192) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_4096_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0015339807878856412;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 32768,
            s1 = 40960,
            s2 = 40960,
            s3 = 49152,
            s4 = 49152;

        data[8192] = 0.0;
        data[9216] = 1.0;
        data[10240] = 0.0;
        data[11264] = -1.0;
        data[12288] = 0.0;

        for (i = 1; (i | 0) < 1024; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 16384; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 12; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 16384) | 0) >> 2]);
                data[((i + 16384) | 0) >> 2] = (data[((j + 16384) | 0) >> 2]);
                data[((j + 16384) | 0) >> 2] = (tmpImag);
            }
        }

        step = 8192;
        half = 4;
        for (width = 8; (width | 0) <= 16384; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 16384; i = (i + width) | 0) {
                k = 32768;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 16384) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 16384) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 4096) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 16384) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 16384) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_8192_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0007669903939428206;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 65536,
            s1 = 81920,
            s2 = 81920,
            s3 = 98304,
            s4 = 98304;

        data[16384] = 0.0;
        data[18432] = 1.0;
        data[20480] = 0.0;
        data[22528] = -1.0;
        data[24576] = 0.0;

        for (i = 1; (i | 0) < 2048; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 32768; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 13; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 32768) | 0) >> 2]);
                data[((i + 32768) | 0) >> 2] = (data[((j + 32768) | 0) >> 2]);
                data[((j + 32768) | 0) >> 2] = (tmpImag);
            }
        }

        step = 16384;
        half = 4;
        for (width = 8; (width | 0) <= 32768; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 32768; i = (i + width) | 0) {
                k = 65536;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 32768) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 32768) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 8192) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 32768) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 32768) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_16384_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.0003834951969714103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 131072,
            s1 = 163840,
            s2 = 163840,
            s3 = 196608,
            s4 = 196608;

        data[32768] = 0.0;
        data[36864] = 1.0;
        data[40960] = 0.0;
        data[45056] = -1.0;
        data[49152] = 0.0;

        for (i = 1; (i | 0) < 4096; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 65536; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 14; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 65536) | 0) >> 2]);
                data[((i + 65536) | 0) >> 2] = (data[((j + 65536) | 0) >> 2]);
                data[((j + 65536) | 0) >> 2] = (tmpImag);
            }
        }

        step = 32768;
        half = 4;
        for (width = 8; (width | 0) <= 65536; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 65536; i = (i + width) | 0) {
                k = 131072;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 65536) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 65536) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 16384) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 65536) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 65536) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_32768_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.00019174759848570515;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 262144,
            s1 = 327680,
            s2 = 327680,
            s3 = 393216,
            s4 = 393216;

        data[65536] = 0.0;
        data[73728] = 1.0;
        data[81920] = 0.0;
        data[90112] = -1.0;
        data[98304] = 0.0;

        for (i = 1; (i | 0) < 8192; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 131072; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 15; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 131072) | 0) >> 2]);
                data[((i + 131072) | 0) >> 2] = (data[((j + 131072) | 0) >> 2]);
                data[((j + 131072) | 0) >> 2] = (tmpImag);
            }
        }

        step = 65536;
        half = 4;
        for (width = 8; (width | 0) <= 131072; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 131072; i = (i + width) | 0) {
                k = 262144;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 131072) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 131072) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 32768) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 131072) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 131072) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_65536_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.00009587379924285257;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 524288,
            s1 = 655360,
            s2 = 655360,
            s3 = 786432,
            s4 = 786432;

        data[131072] = 0.0;
        data[147456] = 1.0;
        data[163840] = 0.0;
        data[180224] = -1.0;
        data[196608] = 0.0;

        for (i = 1; (i | 0) < 16384; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 262144; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 16; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 262144) | 0) >> 2]);
                data[((i + 262144) | 0) >> 2] = (data[((j + 262144) | 0) >> 2]);
                data[((j + 262144) | 0) >> 2] = (tmpImag);
            }
        }

        step = 131072;
        half = 4;
        for (width = 8; (width | 0) <= 262144; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 262144; i = (i + width) | 0) {
                k = 524288;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 262144) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 262144) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 65536) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 262144) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 262144) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_131072_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000047936899621426287;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1048576,
            s1 = 1310720,
            s2 = 1310720,
            s3 = 1572864,
            s4 = 1572864;

        data[262144] = 0.0;
        data[294912] = 1.0;
        data[327680] = 0.0;
        data[360448] = -1.0;
        data[393216] = 0.0;

        for (i = 1; (i | 0) < 32768; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 524288; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 17; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 524288) | 0) >> 2]);
                data[((i + 524288) | 0) >> 2] = (data[((j + 524288) | 0) >> 2]);
                data[((j + 524288) | 0) >> 2] = (tmpImag);
            }
        }

        step = 262144;
        half = 4;
        for (width = 8; (width | 0) <= 524288; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 524288; i = (i + width) | 0) {
                k = 1048576;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 524288) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 524288) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 131072) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 524288) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 524288) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_262144_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000023968449810713143;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2097152,
            s1 = 2621440,
            s2 = 2621440,
            s3 = 3145728,
            s4 = 3145728;

        data[524288] = 0.0;
        data[589824] = 1.0;
        data[655360] = 0.0;
        data[720896] = -1.0;
        data[786432] = 0.0;

        for (i = 1; (i | 0) < 65536; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 1048576; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 18; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 1048576) | 0) >> 2]);
                data[((i + 1048576) | 0) >> 2] = (data[((j + 1048576) | 0) >> 2]);
                data[((j + 1048576) | 0) >> 2] = (tmpImag);
            }
        }

        step = 524288;
        half = 4;
        for (width = 8; (width | 0) <= 1048576; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1048576; i = (i + width) | 0) {
                k = 2097152;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 1048576) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 1048576) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 262144) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 1048576) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 1048576) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_524288_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000011984224905356572;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4194304,
            s1 = 5242880,
            s2 = 5242880,
            s3 = 6291456,
            s4 = 6291456;

        data[1048576] = 0.0;
        data[1179648] = 1.0;
        data[1310720] = 0.0;
        data[1441792] = -1.0;
        data[1572864] = 0.0;

        for (i = 1; (i | 0) < 131072; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 2097152; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 19; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 2097152) | 0) >> 2]);
                data[((i + 2097152) | 0) >> 2] = (data[((j + 2097152) | 0) >> 2]);
                data[((j + 2097152) | 0) >> 2] = (tmpImag);
            }
        }

        step = 1048576;
        half = 4;
        for (width = 8; (width | 0) <= 2097152; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2097152; i = (i + width) | 0) {
                k = 4194304;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 2097152) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 2097152) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 524288) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 2097152) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 2097152) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f32_1048576_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,
        fround = stdlib.Math.fround,
        data = new stdlib.Float32Array(buffer),
        twoPiByN = 0.000005992112452678286;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8388608,
            s1 = 10485760,
            s2 = 10485760,
            s3 = 12582912,
            s4 = 12582912;

        data[2097152] = 0.0;
        data[2359296] = 1.0;
        data[2621440] = 0.0;
        data[2883584] = -1.0;
        data[3145728] = 0.0;

        for (i = 1; (i | 0) < 262144; i = (i + 1) | 0) {
            s0 = (s0 + 4) | 0;
            s1 = (s1 - 4) | 0;
            s2 = (s2 + 4) | 0;
            s3 = (s3 - 4) | 0;
            s4 = (s4 + 4) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 2] = (tmp);
            data[s1 >> 2] = (tmp);
            data[s4 >> 2] = (tmp);
            data[s2 >> 2] = (-tmp);
            data[s3 >> 2] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = fround(0.0),
            sinkNq = fround(0.0),
            realj = fround(0.0),
            imagj = fround(0.0),
            realjh = fround(0.0),
            imagjh = fround(0.0),
            tmpReal = fround(0.0),
            tmpImag = fround(0.0);

        // element permutation
        for (i = 0; (i | 0) < 4194304; i = (i + 4) | 0) {
            // bit reversal
            x = (i | 0) >> 2;
            j = 0;
            for (k = 0; (k | 0) < 20; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 2;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 2]);
                data[i >> 2] = (data[j >> 2]);
                data[j >> 2] = (tmpReal);

                tmpImag = (data[((i + 4194304) | 0) >> 2]);
                data[((i + 4194304) | 0) >> 2] = (data[((j + 4194304) | 0) >> 2]);
                data[((j + 4194304) | 0) >> 2] = (tmpImag);
            }
        }

        step = 2097152;
        half = 4;
        for (width = 8; (width | 0) <= 4194304; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4194304; i = (i + width) | 0) {
                k = 8388608;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 4) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 2]);
                    imagj = (data[(j + 4194304) >> 2]);

                    realjh = (data[jh >> 2]);
                    imagjh = (data[(jh + 4194304) >> 2]);

                    sink = (data[k >> 2]);
                    sinkNq = (data[(k + 1048576) >> 2]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 2] = (realj - tmpReal);
                    data[((jh + 4194304) | 0) >> 2] = (imagj - tmpImag);
                    data[j >> 2] = (realj + tmpReal);
                    data[((j + 4194304) | 0) >> 2] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_16_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.39269908169872414;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 256,
            s1 = 320,
            s2 = 320,
            s3 = 384,
            s4 = 384;

        data[32] = 0.0;
        data[36] = 1.0;
        data[40] = 0.0;
        data[44] = -1.0;
        data[48] = 0.0;

        for (i = 1; (i | 0) < 4; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 128; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 4; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 128) | 0) >> 3]);
                data[((i + 128) | 0) >> 3] = (data[((j + 128) | 0) >> 3]);
                data[((j + 128) | 0) >> 3] = (tmpImag);
            }
        }

        step = 64;
        half = 8;
        for (width = 16; (width | 0) <= 128; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 128; i = (i + width) | 0) {
                k = 256;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 128) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 128) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 32) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 128) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 128) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_32_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.19634954084936207;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 512,
            s1 = 640,
            s2 = 640,
            s3 = 768,
            s4 = 768;

        data[64] = 0.0;
        data[72] = 1.0;
        data[80] = 0.0;
        data[88] = -1.0;
        data[96] = 0.0;

        for (i = 1; (i | 0) < 8; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 256; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 5; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 256) | 0) >> 3]);
                data[((i + 256) | 0) >> 3] = (data[((j + 256) | 0) >> 3]);
                data[((j + 256) | 0) >> 3] = (tmpImag);
            }
        }

        step = 128;
        half = 8;
        for (width = 16; (width | 0) <= 256; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 256; i = (i + width) | 0) {
                k = 512;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 256) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 256) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 64) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 256) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 256) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_64_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.09817477042468103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1024,
            s1 = 1280,
            s2 = 1280,
            s3 = 1536,
            s4 = 1536;

        data[128] = 0.0;
        data[144] = 1.0;
        data[160] = 0.0;
        data[176] = -1.0;
        data[192] = 0.0;

        for (i = 1; (i | 0) < 16; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 512; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 6; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 512) | 0) >> 3]);
                data[((i + 512) | 0) >> 3] = (data[((j + 512) | 0) >> 3]);
                data[((j + 512) | 0) >> 3] = (tmpImag);
            }
        }

        step = 256;
        half = 8;
        for (width = 16; (width | 0) <= 512; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 512; i = (i + width) | 0) {
                k = 1024;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 512) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 512) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 128) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 512) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 512) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_128_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.04908738521234052;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2048,
            s1 = 2560,
            s2 = 2560,
            s3 = 3072,
            s4 = 3072;

        data[256] = 0.0;
        data[288] = 1.0;
        data[320] = 0.0;
        data[352] = -1.0;
        data[384] = 0.0;

        for (i = 1; (i | 0) < 32; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 1024; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 7; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 1024) | 0) >> 3]);
                data[((i + 1024) | 0) >> 3] = (data[((j + 1024) | 0) >> 3]);
                data[((j + 1024) | 0) >> 3] = (tmpImag);
            }
        }

        step = 512;
        half = 8;
        for (width = 16; (width | 0) <= 1024; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1024; i = (i + width) | 0) {
                k = 2048;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 1024) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 1024) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 256) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 1024) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 1024) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_256_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.02454369260617026;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4096,
            s1 = 5120,
            s2 = 5120,
            s3 = 6144,
            s4 = 6144;

        data[512] = 0.0;
        data[576] = 1.0;
        data[640] = 0.0;
        data[704] = -1.0;
        data[768] = 0.0;

        for (i = 1; (i | 0) < 64; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 2048; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 8; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 2048) | 0) >> 3]);
                data[((i + 2048) | 0) >> 3] = (data[((j + 2048) | 0) >> 3]);
                data[((j + 2048) | 0) >> 3] = (tmpImag);
            }
        }

        step = 1024;
        half = 8;
        for (width = 16; (width | 0) <= 2048; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2048; i = (i + width) | 0) {
                k = 4096;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 2048) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 2048) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 512) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 2048) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 2048) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_512_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.01227184630308513;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8192,
            s1 = 10240,
            s2 = 10240,
            s3 = 12288,
            s4 = 12288;

        data[1024] = 0.0;
        data[1152] = 1.0;
        data[1280] = 0.0;
        data[1408] = -1.0;
        data[1536] = 0.0;

        for (i = 1; (i | 0) < 128; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 4096; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 9; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 4096) | 0) >> 3]);
                data[((i + 4096) | 0) >> 3] = (data[((j + 4096) | 0) >> 3]);
                data[((j + 4096) | 0) >> 3] = (tmpImag);
            }
        }

        step = 2048;
        half = 8;
        for (width = 16; (width | 0) <= 4096; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4096; i = (i + width) | 0) {
                k = 8192;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 4096) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 4096) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 1024) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 4096) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 4096) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_1024_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.006135923151542565;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 16384,
            s1 = 20480,
            s2 = 20480,
            s3 = 24576,
            s4 = 24576;

        data[2048] = 0.0;
        data[2304] = 1.0;
        data[2560] = 0.0;
        data[2816] = -1.0;
        data[3072] = 0.0;

        for (i = 1; (i | 0) < 256; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 8192; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 10; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 8192) | 0) >> 3]);
                data[((i + 8192) | 0) >> 3] = (data[((j + 8192) | 0) >> 3]);
                data[((j + 8192) | 0) >> 3] = (tmpImag);
            }
        }

        step = 4096;
        half = 8;
        for (width = 16; (width | 0) <= 8192; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 8192; i = (i + width) | 0) {
                k = 16384;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 8192) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 8192) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 2048) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 8192) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 8192) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_2048_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0030679615757712823;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 32768,
            s1 = 40960,
            s2 = 40960,
            s3 = 49152,
            s4 = 49152;

        data[4096] = 0.0;
        data[4608] = 1.0;
        data[5120] = 0.0;
        data[5632] = -1.0;
        data[6144] = 0.0;

        for (i = 1; (i | 0) < 512; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 16384; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 11; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 16384) | 0) >> 3]);
                data[((i + 16384) | 0) >> 3] = (data[((j + 16384) | 0) >> 3]);
                data[((j + 16384) | 0) >> 3] = (tmpImag);
            }
        }

        step = 8192;
        half = 8;
        for (width = 16; (width | 0) <= 16384; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 16384; i = (i + width) | 0) {
                k = 32768;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 16384) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 16384) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 4096) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 16384) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 16384) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_4096_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0015339807878856412;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 65536,
            s1 = 81920,
            s2 = 81920,
            s3 = 98304,
            s4 = 98304;

        data[8192] = 0.0;
        data[9216] = 1.0;
        data[10240] = 0.0;
        data[11264] = -1.0;
        data[12288] = 0.0;

        for (i = 1; (i | 0) < 1024; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 32768; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 12; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 32768) | 0) >> 3]);
                data[((i + 32768) | 0) >> 3] = (data[((j + 32768) | 0) >> 3]);
                data[((j + 32768) | 0) >> 3] = (tmpImag);
            }
        }

        step = 16384;
        half = 8;
        for (width = 16; (width | 0) <= 32768; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 32768; i = (i + width) | 0) {
                k = 65536;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 32768) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 32768) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 8192) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 32768) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 32768) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_8192_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0007669903939428206;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 131072,
            s1 = 163840,
            s2 = 163840,
            s3 = 196608,
            s4 = 196608;

        data[16384] = 0.0;
        data[18432] = 1.0;
        data[20480] = 0.0;
        data[22528] = -1.0;
        data[24576] = 0.0;

        for (i = 1; (i | 0) < 2048; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 65536; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 13; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 65536) | 0) >> 3]);
                data[((i + 65536) | 0) >> 3] = (data[((j + 65536) | 0) >> 3]);
                data[((j + 65536) | 0) >> 3] = (tmpImag);
            }
        }

        step = 32768;
        half = 8;
        for (width = 16; (width | 0) <= 65536; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 65536; i = (i + width) | 0) {
                k = 131072;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 65536) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 65536) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 16384) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 65536) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 65536) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_16384_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.0003834951969714103;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 262144,
            s1 = 327680,
            s2 = 327680,
            s3 = 393216,
            s4 = 393216;

        data[32768] = 0.0;
        data[36864] = 1.0;
        data[40960] = 0.0;
        data[45056] = -1.0;
        data[49152] = 0.0;

        for (i = 1; (i | 0) < 4096; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 131072; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 14; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 131072) | 0) >> 3]);
                data[((i + 131072) | 0) >> 3] = (data[((j + 131072) | 0) >> 3]);
                data[((j + 131072) | 0) >> 3] = (tmpImag);
            }
        }

        step = 65536;
        half = 8;
        for (width = 16; (width | 0) <= 131072; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 131072; i = (i + width) | 0) {
                k = 262144;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 131072) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 131072) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 32768) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 131072) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 131072) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_32768_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.00019174759848570515;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 524288,
            s1 = 655360,
            s2 = 655360,
            s3 = 786432,
            s4 = 786432;

        data[65536] = 0.0;
        data[73728] = 1.0;
        data[81920] = 0.0;
        data[90112] = -1.0;
        data[98304] = 0.0;

        for (i = 1; (i | 0) < 8192; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 262144; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 15; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 262144) | 0) >> 3]);
                data[((i + 262144) | 0) >> 3] = (data[((j + 262144) | 0) >> 3]);
                data[((j + 262144) | 0) >> 3] = (tmpImag);
            }
        }

        step = 131072;
        half = 8;
        for (width = 16; (width | 0) <= 262144; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 262144; i = (i + width) | 0) {
                k = 524288;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 262144) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 262144) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 65536) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 262144) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 262144) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_65536_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.00009587379924285257;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 1048576,
            s1 = 1310720,
            s2 = 1310720,
            s3 = 1572864,
            s4 = 1572864;

        data[131072] = 0.0;
        data[147456] = 1.0;
        data[163840] = 0.0;
        data[180224] = -1.0;
        data[196608] = 0.0;

        for (i = 1; (i | 0) < 16384; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 524288; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 16; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 524288) | 0) >> 3]);
                data[((i + 524288) | 0) >> 3] = (data[((j + 524288) | 0) >> 3]);
                data[((j + 524288) | 0) >> 3] = (tmpImag);
            }
        }

        step = 262144;
        half = 8;
        for (width = 16; (width | 0) <= 524288; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 524288; i = (i + width) | 0) {
                k = 1048576;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 524288) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 524288) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 131072) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 524288) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 524288) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_131072_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000047936899621426287;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 2097152,
            s1 = 2621440,
            s2 = 2621440,
            s3 = 3145728,
            s4 = 3145728;

        data[262144] = 0.0;
        data[294912] = 1.0;
        data[327680] = 0.0;
        data[360448] = -1.0;
        data[393216] = 0.0;

        for (i = 1; (i | 0) < 32768; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 1048576; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 17; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 1048576) | 0) >> 3]);
                data[((i + 1048576) | 0) >> 3] = (data[((j + 1048576) | 0) >> 3]);
                data[((j + 1048576) | 0) >> 3] = (tmpImag);
            }
        }

        step = 524288;
        half = 8;
        for (width = 16; (width | 0) <= 1048576; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 1048576; i = (i + width) | 0) {
                k = 2097152;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 1048576) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 1048576) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 262144) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 1048576) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 1048576) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_262144_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000023968449810713143;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 4194304,
            s1 = 5242880,
            s2 = 5242880,
            s3 = 6291456,
            s4 = 6291456;

        data[524288] = 0.0;
        data[589824] = 1.0;
        data[655360] = 0.0;
        data[720896] = -1.0;
        data[786432] = 0.0;

        for (i = 1; (i | 0) < 65536; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 2097152; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 18; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 2097152) | 0) >> 3]);
                data[((i + 2097152) | 0) >> 3] = (data[((j + 2097152) | 0) >> 3]);
                data[((j + 2097152) | 0) >> 3] = (tmpImag);
            }
        }

        step = 1048576;
        half = 8;
        for (width = 16; (width | 0) <= 2097152; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 2097152; i = (i + width) | 0) {
                k = 4194304;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 2097152) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 2097152) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 524288) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 2097152) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 2097152) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_524288_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000011984224905356572;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 8388608,
            s1 = 10485760,
            s2 = 10485760,
            s3 = 12582912,
            s4 = 12582912;

        data[1048576] = 0.0;
        data[1179648] = 1.0;
        data[1310720] = 0.0;
        data[1441792] = -1.0;
        data[1572864] = 0.0;

        for (i = 1; (i | 0) < 131072; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 4194304; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 19; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 4194304) | 0) >> 3]);
                data[((i + 4194304) | 0) >> 3] = (data[((j + 4194304) | 0) >> 3]);
                data[((j + 4194304) | 0) >> 3] = (tmpImag);
            }
        }

        step = 2097152;
        half = 8;
        for (width = 16; (width | 0) <= 4194304; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 4194304; i = (i + width) | 0) {
                k = 8388608;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 4194304) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 4194304) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 1048576) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 4194304) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 4194304) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};

exports.fft_f64_1048576_raw = function (stdlib, foreign, buffer) {


    var sin = stdlib.Math.sin,

        data = new stdlib.Float64Array(buffer),
        twoPiByN = 0.000005992112452678286;

    function init () {
        var i = 0,
            tmp = 0.0,
            s0 = 16777216,
            s1 = 20971520,
            s2 = 20971520,
            s3 = 25165824,
            s4 = 25165824;

        data[2097152] = 0.0;
        data[2359296] = 1.0;
        data[2621440] = 0.0;
        data[2883584] = -1.0;
        data[3145728] = 0.0;

        for (i = 1; (i | 0) < 262144; i = (i + 1) | 0) {
            s0 = (s0 + 8) | 0;
            s1 = (s1 - 8) | 0;
            s2 = (s2 + 8) | 0;
            s3 = (s3 - 8) | 0;
            s4 = (s4 + 8) | 0;
            tmp = sin(
                +(
                    +(twoPiByN) *
                    +((i + 0) | 0)
                )
            );
            data[s0 >> 3] = (tmp);
            data[s1 >> 3] = (tmp);
            data[s4 >> 3] = (tmp);
            data[s2 >> 3] = (-tmp);
            data[s3 >> 3] = (-tmp);
        }
    }

    function transform () {
        var i = 0,
            j = 0,
            k = 0,
            x = 0,
            half = 0,
            ihalf = 0,
            jh = 0,
            step = 0,
            width = 0,
            sink = 0.0,
            sinkNq = 0.0,
            realj = 0.0,
            imagj = 0.0,
            realjh = 0.0,
            imagjh = 0.0,
            tmpReal = 0.0,
            tmpImag = 0.0;

        // element permutation
        for (i = 0; (i | 0) < 8388608; i = (i + 8) | 0) {
            // bit reversal
            x = (i | 0) >> 3;
            j = 0;
            for (k = 0; (k | 0) < 20; k = (k + 1) | 0) {
                j = j << 1;
                j = j | (x & 1);
                x = x >> 1;
            }
            j = j << 3;
            if ((j | 0) > (i | 0)) {

                tmpReal = (data[i >> 3]);
                data[i >> 3] = (data[j >> 3]);
                data[j >> 3] = (tmpReal);

                tmpImag = (data[((i + 8388608) | 0) >> 3]);
                data[((i + 8388608) | 0) >> 3] = (data[((j + 8388608) | 0) >> 3]);
                data[((j + 8388608) | 0) >> 3] = (tmpImag);
            }
        }

        step = 4194304;
        half = 8;
        for (width = 16; (width | 0) <= 8388608; width = (width * 2) | 0) {
            for (i = 0; (i | 0) < 8388608; i = (i + width) | 0) {
                k = 16777216;
                ihalf = (i + half) | 0;
                for (j = i; (j | 0) < (ihalf | 0); j = (j + 8) | 0) {
                    jh = (j + half) | 0;

                    realj = (data[j >> 3]);
                    imagj = (data[(j + 8388608) >> 3]);

                    realjh = (data[jh >> 3]);
                    imagjh = (data[(jh + 8388608) >> 3]);

                    sink = (data[k >> 3]);
                    sinkNq = (data[(k + 2097152) >> 3]);

                    // complex multiplication
                    tmpReal = (
                        (
                            (imagjh) *
                            (sink)
                        )
                        +
                        (
                            (realjh) *
                            (sinkNq)
                        )
                    );
                    tmpImag = (
                        (
                            (imagjh) *
                            (sinkNq)
                        )
                        -
                        (
                            (realjh) *
                            (sink)
                        )
                    );

                    // Radix-2 butterfly
                    data[jh >> 3] = (realj - tmpReal);
                    data[((jh + 8388608) | 0) >> 3] = (imagj - tmpImag);
                    data[j >> 3] = (realj + tmpReal);
                    data[((j + 8388608) | 0) >> 3] = (imagj + tmpImag);

                    k = (k + step) | 0;
                }
            }
            step = step >> 1;
            half = half << 1;
        }
    }

    return {
        init: init,
        transform: transform
    };
};



},{}],4:[function(require,module,exports){
'use strict';

/**
Fast Fourier transform (FFT).
Cooley–Tukey algorithm.
Assumes `real` and `imag` arrays have the same width.
*/

function bitReversal (x, bits) {
    var res = 0;
    while (bits--) {
        res <<= 1;
        res |= x & 1;
        x >>= 1;
    }
    return res;
}

function log2 (N) {
    return Math.log(N) / Math.log(2);
}

module.exports = function fftDitRadix2 (real, imag) {
    var log2N,
        i,
        j,
        N,
        k,
        half,
        step,
        twoPiByN,
        angle,
        sin = [],
        cos = [],
        tmpReal,
        tmpImag,
        width;

    N = real.length;
    log2N = log2(N);
    twoPiByN = Math.PI / N * 2;

    /* initialize Sin / Cos tables */
    for (k = 0; k < N; k++) {
        angle = twoPiByN * k;
        sin.push(Math.sin(angle));
        cos.push(Math.cos(angle));
    }

    // element permutation
    for (i = 0; i < N; i++) {
        j = bitReversal(i, log2N);
        if (j > i) {
            tmpReal = real[i];
            real[i] = real[j];
            real[j] = tmpReal;
            tmpImag = imag[i];
            imag[i] = imag[j];
            imag[j] = tmpImag;
        }
    }

    for (width = 2; width <= N; width *= 2) {
        step = N / width;
        half = width / 2;
        for (i = 0; i < N; i += width) {
            k = 0;
            for (j = i; j < i + half; j++) {

                // complex multiplication
                tmpReal =  real[j + half] * cos[k] + imag[j + half] * sin[k];
                tmpImag = -real[j + half] * sin[k] + imag[j + half] * cos[k];

                // Radix-2 butterfly
                real[j + half] = real[j] - tmpReal;
                imag[j + half] = imag[j] - tmpImag;
                real[j]        = real[j] + tmpReal;
                imag[j]        = imag[j] + tmpImag;

                k += step;
            }
        }
    }
};

},{}],5:[function(require,module,exports){
'use strict';

/**
    Fast Fourier transform (FFT).
    Cooley–Tukey algorithm.
    Assumes `real` and `imag` arrays have the same width.
*/

function fftDitRadix2 () {
    var sin = [];

    function bitReversal (x, log2N) {
        var res = 0;
        while (log2N--) {
            res <<= 1;
            res |= x & 1;
            x >>= 1;
        }
        return res;
    }

    /**
        element permutation
    */
    function permutation (real, imag) {
        var i,
            j,
            tmp,
            N,
            log2N;

        N = real.length;
        log2N = Math.log(N) / Math.log(2);

        for (i = 0; i < N; i++) {
            j = bitReversal(i, log2N);
            if (j > i) {
                tmp = real[i];
                real[i] = real[j];
                real[j] = tmp;
                tmp = imag[i];
                imag[i] = imag[j];
                imag[j] = tmp;
            }
        }
    }

    /**
        initialize Sin / Cos tables
    */
    function initTwiddles (input) {
        var twoPiByN,
            count,
            N,
            NQ,
            tmp,
            s0, s1, s2, s3, s4;

        N = input.length;
        NQ = N + N / 4;
        /** check existing tables */
        if (sin && sin.length && sin.length === NQ) {
            return;
        }
        twoPiByN = Math.PI / N * 2;

        switch (Object.prototype.toString.call(input)) {
        case '[object Float64Array]':
            sin = new Float64Array(NQ);
            break;
        case '[object Float32Array]':
            sin = new Float32Array(NQ);
            break;
        default:
            sin = new Array(NQ);
        }

        sin[0] = sin[N / 2] = sin[N] = 0;
        sin[N / 4] = 1;
        sin[3 * (N / 4)] = -1;

        s0 = 0;
        s1 = N / 2;
        s2 = N / 2;
        s3 = N;
        s4 = N;
        count = N / 4 - 1;

        while (count--) {
            s0++; s2++; s4++;
            s1--; s3--;
            tmp = Math.sin(twoPiByN * s0);
            sin[s0] = sin[s1] = sin[s4] = tmp;
            sin[s2] = sin[s3] = -tmp;
        }
    }

    function transform (real, imag) {
        var N,
            Nq,
            i,
            j,
            k,
            half,
            ihalf,
            jh,
            realj,
            imagj,
            realjh,
            imagjh,
            step,
            tmpReal,
            tmpImag,
            width,
            sink,
            sinkNq;

        initTwiddles(real);
        permutation(real, imag);
        N = real.length;
        Nq = N / 4;
        step = N / 2;
        half = 1;
        for (width = 2; width <= N; width *= 2) {

            for (i = 0; i < N; i += width) {
                k = 0;
                ihalf = i + half;

                for (j = i; j < ihalf; j++) {

                    // complex multiplication
                    realj = real[j];
                    imagj = imag[j];
                    jh = j + half;
                    realjh = real[jh];
                    imagjh = imag[jh];
                    sink = sin[k];
                    sinkNq = sin[k + Nq];
                    tmpReal =  realjh * sinkNq + imagjh * sink;
                    tmpImag = -realjh * sink   + imagjh * sinkNq;

                    // Radix-2 butterfly
                    real[jh] = realj - tmpReal;
                    imag[jh] = imagj - tmpImag;
                    real[j]  = realj + tmpReal;
                    imag[j]  = imagj + tmpImag;

                    k += step;
                }

            }
            step >>= 1;
            half <<= 1;
        }
    }

    return transform;
}

module.exports = fftDitRadix2;

},{}],6:[function(require,module,exports){
'use strict';

/**
Inverse Discrete Fourier transform (IDFT).
(the slowest possible implementation)
Assumes `inpReal` and `inpImag` arrays have the same size.
*/
module.exports = function (inpReal, inpImag) {
    var N,
        k,
        n,
        angle,
        outReal,
        outImag,
        sumReal,
        sumImag,
        kk,
        sin,
        cos,
        twoPiByN;

    N = inpReal.length;
    twoPiByN = Math.PI / N * 2;

    outReal = new Float64Array(N);
    outImag = new Float64Array(N);

    sin = new Float64Array(N);
    cos = new Float64Array(N);

    /* initialize Sin / Cos tables */
    for (n = 0; n < N; n++) {
        angle = twoPiByN * k;
        sin[n] = Math.sin(angle);
        cos[n] = Math.cos(angle);
    }

    for (n = 0; n < N; n++) {
        sumReal = 0;
        sumImag = 0;
        kk = 0;
        for (k = 0; k < N; k++) {
            sumReal +=  inpReal[k] * cos[kk] - inpImag[k] * sin[kk];
            sumImag +=  inpReal[k] * sin[kk] + inpImag[k] * cos[kk];
            kk = (kk + n) % N;
        }
        outReal[n] = sumReal / N;
        outImag[n] = sumImag / N;
    }
    return [outReal, outImag];
};

},{}],7:[function(require,module,exports){
'use strict';

/**
Inverse Discrete Fourier transform (IDFT).
(the slowest possible implementation)
Assumes `inpReal` and `inpImag` arrays have the same size.
*/
module.exports = function (inpReal, inpImag) {
    var N,
        k,
        n,
        angle,
        outReal = [],
        outImag = [],
        sumReal,
        sumImag,
        kk,
        sin = [],
        cos = [],
        twoPiByN;

    N = inpReal.length;
    twoPiByN = Math.PI / N * 2;
    /* initialize Sin / Cos tables */
    for (n = 0; n < N; n++) {
        angle = twoPiByN * n;
        sin.push(Math.sin(angle));
        cos.push(Math.cos(angle));
    }

    for (n = 0; n < N; n++) {
        sumReal = 0;
        sumImag = 0;
        kk = 0;
        for (k = 0; k < N; k++) {
            sumReal +=  inpReal[k] * cos[kk] - inpImag[k] * sin[kk];
            sumImag +=  inpReal[k] * sin[kk] + inpImag[k] * cos[kk];
            kk = (kk + n) % N;
        }
        outReal.push(sumReal / N);
        outImag.push(sumImag / N);
    }
    return [outReal, outImag];
};

},{}],8:[function(require,module,exports){
'use strict';

var dftSimple = require('./dft-simple'),
    idftSimple = require('./idft-simple'),
    idftSimpleDouble = require('./idft-simple-double'),
    fftDitRadix2 = require('./fft-dit-radix2'),
    fftDitRadix2Simple = require('./fft-dit-radix2-simple'),
    custom = require('./fft-custom');

module.exports = {
    dft: dftSimple,
    idft: idftSimple,
    fft: fftDitRadix2,
    custom: custom,
    dftSimple: dftSimple,
    idftSimple: idftSimple,
    idftSimpleDouble: idftSimpleDouble,
    fftDitRadix2: fftDitRadix2,
    fftDitRadix2Simple: fftDitRadix2Simple
};

},{"./dft-simple":2,"./fft-custom":3,"./fft-dit-radix2":5,"./fft-dit-radix2-simple":4,"./idft-simple":7,"./idft-simple-double":6}]},{},[1]);
