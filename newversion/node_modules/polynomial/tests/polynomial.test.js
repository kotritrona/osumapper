
var assert = require('assert');

var Poly = require('../polynomial.js');

var tests = [
  {f: "C", o: "add", a: "-1x^3-1x^2-1x-1", b: 0, r: "-x^3-x^2-x-1"},
  {f: "R", o: "add", a: "-1x^3-1x^2-1x-1", b: 0, r: "-x^3-x^2-x-1"},
  {f: "Q", o: "add", a: "-1x^3-1x^2-1x-1", b: 0, r: "-x^3-x^2-x-1"},
  {f: "C", o: "add", a: "+1x^3+1x^2+1x+1", b: 0, r: "x^3+x^2+x+1"},
  {f: "R", o: "add", a: "+1x^3+1x^2+1x+1", b: 0, r: "x^3+x^2+x+1"},
  {f: "Q", o: "add", a: "+1x^3+1x^2+1x+1", b: 0, r: "x^3+x^2+x+1"},
  {f: 'R', o: 'mul', a: undefined, b: null, r: "0"},
  {f: 'R', o: 'mul', a: [-3, 5, -2], b: [-3, 5, 7], r: "-14x^4+25x^3+10x^2-30x+9"},
  {f: 'Z7', o: 'mul', a: [-2, 5], b: [-1, 3, 4], r: "6x^3+3x+2"},
  {f: 'Z7', o: 'div', a: [3, 1, 1, 5, 3, 1], b: [0, 1, 4, 2], r: "4x^2+4x+3"},
  {f: 'Z7', o: 'mod', a: [3, 1, 1, 5, 3, 1], b: [0, 1, 4, 2], r: "6x^2+5x+3"},
  {f: 'Q', o: 'div', a: [3, 1, 1, 5, 3, 1], b: [0, 1, 4, 2], r: "0.5x^2+0.5x+1.25"},
  {f: 'Q', o: 'mod', a: [0, 1, 4, 2], b: [3, 5, 6], r: "-1.9(4)x-1.1(6)"},
  {f: 'R', o: 'add', a: "22-14x^4+25x^3+10x^2-30x+9", b: "-2+1000x", r: "-14x^4+25x^3+10x^2+970x+29"},
  {f: 'Q', o: 'sub', a: "-1.9(4)x-1.1(6)", b: -3, r: "-1.9(4)x+1.8(3)"},
  {f: 'Q', o: 'addmul', a: 2, b: 5, c: 6, r: "32"},
  {f: 'Q', o: 'add', a: "1x", b: 2, r: "x+2"},
  {f: 'Q', o: 'derive', a: "5+3x^3+6x^5", b: 0, r: "6x^5+3x^3+5"},
  {f: 'Q', o: 'derive', a: "5+3x^3+6x^5", b: 1, r: "30x^4+9x^2"},
  {f: 'Q', o: 'derive', a: "5+3x^3+6x^5", b: 2, r: "120x^3+18x"},
  {f: 'Q', o: 'derive', a: "92x+3+5x^2+43x^4", b: 2, r: "516x^2+10"},
  {f: 'Q', o: 'derive', a: "1+2x+3x^2+4x^3+5x^4+6x^5+7x^6", b: 3, r: "840x^3+360x^2+120x+24"},
  {f: 'Q', o: 'derive', a: "1+2x+3x^2+4x^3+5x^4+6x^5+7x^6", b: 0, r: "7x^6+6x^5+5x^4+4x^3+3x^2+2x+1"},
  {f: 'Z2', o: 'sub', a: 2, b: 1, r: '1'},
  {f: "C", o: "mul", a: "x-i", b: "x+i", r: "x^2+1"},
  {f: 'R', o: 'add', a: 0, b: 0, r: '0'},
  {f: 'R', o: 'add', a: 2, b: 3, r: '5'},
  {f: 'Q', o: 'add', a: '0.(3)x', b: '0.(6)x', r: 'x'},
  {f: "Q", o: "div", a: "x^5+3x^4+5x^3+x^2+x+3", b: "2x^3+4x^2+x", r: "0.5x^2+0.5x+1.25"},
  {f: "Q", o: "mod", a: "x^5+3x^4+5x^3+x^2+x+3", b: "2x^3+4x^2+x", r: "-4.5x^2-0.25x+3"},
  {f: 'R', o: 'sub', a: 2, b: 3, r: '-1'},
  {f: 'R', o: 'div', a: "x^4-81", b: "3x^2+27", r: '0.3333333333333333x^2-3'},
  {f: 'R', o: 'mod', a: [-81, 0, 0, 0, 1], b: [27, 0, 3], r: '0'}, // 0 is correct
  {f: 'Q', o: 'integrate', a: '3x^2', b: 0, r: '3x^2'},
  {f: 'Q', o: 'integrate', a: '3x^2', b: 1, r: 'x^3'},
  {f: 'Q', o: 'integrate', a: '3x^2', b: 2, r: '0.25x^4'},
  {f: 'R', o: 'add', a: "3x^2", b: "-x^2", r: "2x^2"},
  {f: 'Q', o: 'div', a: "3/2x^2-4x", b: "5x", r: "0.3x-0.8"},
  {f: 'Q', o: 'mod', a: "3/2x^2-4x", b: "5x", r: "0"},
  {f: 'Q', o: 'mod', a: "3x^2-4x", b: "5x", r: "0"},
  {f: 'Q', o: 'mod', a: "3x^2+2x+1", b: "x^2+1", r: "2x-2"},
  {f: 'Q', o: 'mod', a: "3x^2+2x+1", b: "2", r: "0"},
  {f: 'C', o: 'div', a: "25x^9", b: "5ix", r: "-5ix^8"},
  {f: 'C', o: 'div', a: "25x^9", b: "5x", r: "5x^8"},
  {f: 'C', o: 'mod', a: "25x^9", b: "5ix", r: "0"},
  {f: 'R', o: "mod", a: "5x^3+8x", b: "3x^2", r: "8x"},
  {f: 'Z7', o: 'pow', a: "9x^2+4", b: 3, r: "x^6+6x^4+5x^2+1"},
  {f: 'R', o: 'mul', a: "3x^3-1", b: 4, r: "12x^3-4"},
  {f: 'Q', o: 'integrate', a: '3x^2', b: 3, r: '0.05x^5'},
  {f: 'Q', o: 'integrate', a: '3x^2+3x^4', b: 2, r: '0.1x^6+0.25x^4'},
  {f: 'Q', o: 'derive', a: '3x^2', b: 0, r: '3x^2'},
  {f: 'Q', o: 'derive', a: '3x^2', b: 1, r: '6x'},
  {f: 'Q', o: 'derive', a: '3x^2', b: 2, r: '6'},
  {f: 'R', o: 'derive', a: '3x^2', b: 3, r: '0'},
  {f: 'R', o: 'derive', a: '3x^2', b: 4, r: '0'},
  {f: 'Q', o: 'derive', a: '3x^2', b: 5, r: '0'},
  {f: 'Q', o: 'pow', a: '3x', b: 9, r: '19683x^9'},
  {f: 'C', o: 'add', a: '3x+ix', b: "3ix^2+x^2", r: 'x^2+3ix^2+3x+ix'},
  {f: 'Q', o: 'div', a: '3x^4+2x^3+x^2-4', b: '2x^2-4', r: '1.5x^2+x+3.5'},
  {f: 'Q', o: 'mod', a: '3x^4+2x^3+x^2-4', b: '2x^2-4', r: '4x+10'},
  {f: 'Q', o: 'pow', a: '3x^2', b: 9, r: '19683x^18'},
  {f: 'Z7', o: 'pow', a: '3x^2', b: 9, r: '6x^18'},
  {f: 'C', o: 'pow', a: '3x^2+i', b: 2, r: '9x^4+6ix^2-1'},
  {f: 'R', o: 'add', a: 'x', b: "x^2", r: 'x^2+x'},
  {f: 'Z11', o: 'mod', a: '3x^2+x+7', b: '3x^2+x+7', r: '0'},
  {f: 'R', o: 'div', a: 'x^4+x^3+2x^2+1', b: 'x^3+2x^2+2', r: 'x-1'},
  {f: 'R', o: 'mod', a: 'x^4+x^3+2x^2+1', b: 'x^3+2x^2+2', r: '4x^2-2x+3'},
  {f: 'Q', o: "div", a: "x^4+x^3+2x^2+1", b: "2", r: "0.5x^4+0.5x^3+x^2+0.5"},
  {f: 'Q', o: "mod", a: "x^4+x^3+2x^2+1", b: "2", r: "0"},
  {f: 'R', o: 'add', a: '3x^3+4+6x^2+x', b: "-4", r: '3x^3+6x^2+x'},
  {f: 'R', o: 'add', a: '3x', b: "3x^3", r: '3x^3+3x'},
  {f: 'Z7', o: 'div', a: 'x^4+3x^3+6x+2', b: '2x^2+x+3', r: '4x^2+3x+3'},
  {f: 'Z7', o: 'mod', a: 'x^4+3x^3+6x+2', b: '2x^2+x+3', r: 'x'},
  {f: 'Q', o: 'derive', a: '-1/2x^2', b: 5, r: '0'},
  {f: 'Q', o: 'add', a: "-3x^6-13x^5-19x^4-23x^3-10x^2-10x+6", b: 0, r: '-3x^6-13x^5-19x^4-23x^3-10x^2-10x+6'},
  {f: 'Q', o: 'sub', a: "-18x^4-42x^3-48x^2-12x+12", b: 5, r: '-18x^4-42x^3-48x^2-12x+7'},
  {f: 'Q', o: 'mul', a: "55+3x^3+6x^5-x+4-1/2x^2+3x-x^2+x-4/8x^3", b: 1, r: '6x^5+2.5x^3-1.5x^2+3x+59'},
  {f: 'Q', o: 'mod', a: 'x^4+x^3+2x+2', b: 'x^2+2x+2', r: '4x+2'},
  {f: 'Q', o: 'div', a: 'x^4+x^3+2x+2', b: 'x^4+x^3+2x+2', r: '1'},
  {f: 'C', o: 'add', a: '1', b: '2', r: '3'},
  {f: 'C', o: 'add', a: '2i', b: 'i3', r: '5i'},
  {f: 'C', o: 'mul', a: '1-i', b: 'i+1', r: '2'},
  {f: 'C', o: 'add', a: 'x^2-ix^3', b: '12', r: '-ix^3+x^2+12'},
  {f: 'C', o: 'add', a: '-12', b: '12', r: '0'},
  {f: 'C', o: 'pow', a: '-i', b: 2, r: '-1'},
  {f: 'C', o: 'div', a: 'x-2', b: 'x-1', r: '1'},
  {f: 'C', o: 'div', a: 'x^2-2x+1', b: 'x', r: 'x-2'},
  {f: 'C', o: 'div', a: 'x^3-x^2+x-1', b: 'x-1', r: 'x^2+1'},
  {f: 'C', o: 'div', a: 'x^4-3x^3+3x^2-3x+2', b: 'x-1', r: 'x^3-2x^2+x-2'},
  {f: 'C', o: 'div', a: 'x^4-10x^3+26x^2-50x+105', b: 'x^2+5', r: 'x^2-10x+21'},
  {f: 'C', o: 'div', a: 'x^3-6x^2+11x-6', b: 'x-4', r: 'x^2-2x+3'},
  {f: 'C', o: 'div', a: 'x^5-5x^3+4x^2+x', b: 'x^2+3x+1', r: 'x^3-3x^2+3x-2'},
  {f: 'C', o: 'div', a: 'x^4-3x^2+3x+2', b: 'x^2-1', r: 'x^2-2'},
  {f: 'Q', o: 'gcd', a: '30x^2-90x+60', b: '50x^2-100x+50', r: 'x-1'},
  {f: 'Z5', o: 'gcd', a: '3x^3+4x^2+3', b: '3x^3+4x^2+3x+4', r: 'x+2'},
  {f: 'Z11', o: 'gcd', a: '3x^2+x+7', b: '3x^2+x+7', r: 'x^2+4x+6'},
  {f: 'Q', o: 'gcd', a: '3x^2+x+7', b: '3x^2+x+7', r: 'x^2+0.(3)x+2.(3)'},
  {f: 'Q', o: 'gcd', a: 'x^3+x^2+2x', b: '1+x^2', r: '1'},
  {f: 'Q', o: 'gcd', a: '15x^0', b: '3x^0', r: '1'},
  {f: 'Q', o: 'gcd', a: '30x^2-90x+60', b: '50x^2-100x+50', r: 'x-1'},
  {f: 'R', o: 'gcd', a: 'x^4+x^3+2x^2+1', b: 'x^3+2x^2+2', r: '1'},
  {f: 'C', o: 'gcd', a: "25x^9", b: "5ix", r: "x"},
  {f: 'Q', o: 'gcd', a: "x^4-9x^2-4x+12", b: "x^3+5x^2+2x-8", r: "x^2+x-2"},
  {f: 'Q', o: 'gcd', a: "30", b: "5", r: "1"},
  {f: 'Q', o: 'gcd', a: 'x^2+7x+6', b: 'x^2-5x-6', r: 'x+1'},
  {f: 'R', o: 'gcd', a: 'x^5+1', b: 'x^3+1', r: 'x+1'},
  {f: 'C', o: 'gcd', a: '-12', b: '0', r: '1'},
  {f: 'Q', o: 'gcd', a: '0', b: '0', r: '0'},
  {f: 'Q', o: 'gcd', a: 'x^2-4', b: 'x+2', r: 'x+2'},
  {f: 'Q', o: 'gcd', a: 'x^2+2', b: 'x^2-2', r: '1'},
  {f: 'Q', o: 'gcd', a: 'x^3-1', b: 'x^2-1', r: 'x-1'},
  {f: 'Q', o: 'gcd', a: 'x^4-5x^3+8x^2-10x+12', b: 'x^4+x^2-2', r: 'x^2+2'},
  {f: 'Q', o: 'gcd', a: 'x^4-16', b: 'x^4+8x^3+24x^2+32x+16', r: 'x+2'},
  {f: 'Q', o: 'gcd', a: 'x^5+x^4+x^3+x^2+x+1', b: 'x^3+x^2+x+1', r: 'x+1'},
  {f: 'Q', o: 'gcd', a: 'x^7+x^4+x^2+x^2+x+1', b: 'x^5+x^4+x^3+x^2+x+1', r: '1'},
  {f: 'Q', o: 'gcd', a: 'x^4+2x^3-2x^2+2x-3', b: 'x^4+x^3+2x^2+x+1', r: 'x^2+1'},
  {f: 'Q', o: 'gcd', a: 'x^3+x^2-3x-3', b: 'x^2+3x+2', r: 'x+1'},
  {f: 'Q', o: 'gcd', a: '12x^2+12x', b: '16x^2', r: 'x'},
  {f: 'C', o: 'gcd', a: 'x^2-1', b: 'x^2-3x+2', r: 'x-1'},
  {f: 'C', o: 'div', a: 'x^2-3', b: 'x+2', r: 'x-2'},
  {f: 'C', o: 'mod', a: 'x^2+3x+2', b: 'x+1', r: '0'},
  {f: 'C', o: 'mod', a: 'x^3+x^2-3x-3', b: 'x+1', r: '0'},
  {f: 'Z5', o: 'mod', a: '3x^3+4x^2+3', b: 'x+2', r: '0'},
  {f: 'Z5', o: 'mod', a: '3x^3+4x^2+3', b: '2x+4', r: '0'},
  {f: 'Z5', o: 'mod', a: '3x^3+4x^2+3x+4', b: 'x+2', r: '0'},
  {f: 'Z5', o: 'mod', a: '3x^3+4x^2+3x+4', b: '2x+4', r: '0'},
  {f: 'Z11', o: 'mod', a: '3x^2+x+7', b: 'x^2+4x+6', r: '0'},
  {f: 'Z11', o: 'mod', a: '3x^2+x+7', b: '3x^2+x+7', r: '0'},
  {f: 'Z11', o: 'mod', a: '3x^2+x+7', b: 'x^2+4x+6', r: '0'},
  {f: 'Z11', o: 'mod', a: '3x^2+x+7', b: '3x^2+x+7', r: '0'},
  {f: 'R', o: 'lc', a: '1', b: null, r: "1"},
  {f: 'R', o: 'lc', a: '4x+3', b: null, r: "4"},
  {f: 'R', o: 'lc', a: '5x^2+4x+3', b: null, r: "5"},
  {f: 'R', o: 'lm', a: '1', b: null, r: "1"},
  {f: 'R', o: 'lm', a: '4x+3', b: null, r: "4x"},
  {f: 'R', o: 'lm', a: '5x^2+4x+3', b: null, r: "5x^2"},
  {f: 'R', o: 'monic', a: 'x^2+10x+20', b: null, r: "x^2+10x+20"},
  {f: 'R', o: 'monic', a: '5x^2+10x+20', b: null, r: "x^2+2x+4"},
  {f: 'R', o: 'monic', a: '56', b: null, r: "1"},
  {f: 'Q', o: 'eval', a: '4/3x^2-3x+9', b: '2/3', r: '7.(592)'},
  {f: 'Q', o: 'eval', a: '4/3x^2-3x+9', b: '0', r: '9'},
  {f: 'R', o: 'degree', a: 123, b: null, r: '0'},
  {f: 'R', o: 'degree', a: 'x^88+3', b: null, r: '88'},
  {f: 'R', o: 'add', a: '2', b: '2/1', r: '4'},
  {f: 'R', o: 'add', a: '2*2/2', b: '-1', r: '1'},
  {f: 'R', o: 'add', a: 'x', b: '3', r: 'x+3'},
  {f: 'R', o: 'add', a: '2x', b: '2x', r: '4x'},
  {f: 'R', o: 'add', a: '2*x', b: '2*x', r: '4x'},
  {f: 'R', o: 'add', a: '2*x^4', b: '2*x', r: '2x^4+2x'},
  {f: 'Q', o: 'add', a: 'x^8+1/2x', b: '1', r: 'x^8+0.5x+1'},
  {f: 'C', o: 'add', a: "2i*3*4x^8+1/2*x", b: '-0.5x', r: '24ix^8'},
  {f: 'Q', o: 'add', a: "3/4x^3+2/2x^2-1/3x+1/2", b: 0, r: "0.75x^3+x^2-0.(3)x+0.5"},
  {f: 'Q', o: 'add', a: ["1/2", "-1/3", "2/2", "3/4"], b: 0, r: "0.75x^3+x^2-0.(3)x+0.5"}
];



describe('Polynomial', function() {

  for (var i = 0; i < tests.length; i++) {

    (function(i) {

      var t = tests[i];

      it(t.a + " " + t.o + " " + t.b + " (in " + t.f + ")", function() {

        Poly.setField(t.f);
        try {
          str = Poly(t.a)[t.o](t.b, t.c).toString();
        } catch (e) {
          str = e;
        }
        assert.equal(t.r, str);
      });

    })(i);
  }
});

describe('Polynomial reciprocal', function() {

  it("Reciprocal polynomial of a complex polynomial with all coefficients", function() {
    Poly.setField("C");
    assert.equal(Poly("2.x^4-5.ix^3+0.3x^2-0.1ix+4").reciprocal().toString(),
            Poly("4x^4-0.1ix^3+0.3x^2-5.ix+2").toString());
  });

  it("Reciprocal polynomial of a real polynomial with vanishing lower terms", function() {
    Poly.setField("R");
    assert.equal(Poly("2.x^4-5.x^3+0.3x^2").reciprocal().toString(),
            Poly("0.3x^2-5.x+2").toString());
  });

});

describe('Polynomial fromRoots', function() {

  it("(x-1)(x-2i)(x-3) expands to x^3-4x^2-2ix^2+3x+8ix-6i", function() {
    Poly.setField("C");
    assert.equal(Poly.fromRoots([1., { 're':0. , 'im':2. }, 3.]).toString(),
                 "x^3-4x^2-2ix^2+3x+8ix-6i");
  });
  it("Depressed polynomial, (x-1)(x-2i)(x-3)x^4 expands to x^7-4x^6-2ix^6+3x^5+8ix^5-6ix^4", function() {
    Poly.setField("C");
    assert.equal(Poly.fromRoots([1., { 're':0. , 'im':2. }, 3., 0., 0., 0., 0.]).toString(),
                 "x^7-4x^6-2ix^6+3x^5+8ix^5-6ix^4");
  });

});

describe('Polynomial Horner', function() {

  it("1/2x^4-9x^2-4x+12 in horner", function() {

    Poly.setField("Q");
    assert.equal(Poly("1/2x^4-9x^2-4x+12").toHorner(), "((0.5x^2-9)x-4)x+12");

    Poly.setField("C");
    assert.equal(Poly("-2x^4-9x^2-4x+12i+3ix^2").toHorner(), "((-2x^2+(-9 + 3i))x-4)x+12i");
    assert.equal(Poly("-ix^4+2x^4-9x^2-4x+12i+3ix^2").toHorner(), "(((2 - i)x^2+(-9 + 3i))x-4)x+12i");
    assert.equal(Poly("x^4+2.ix^3+2x^2+6x").toHorner(), '(((1x+2i)x+2)x+6)x');
    assert.equal(Poly("x^4+1.ix^3+2x^2+6x").toHorner(), '(((1x+i)x+2)x+6)x');

    Poly.setField("R");
    assert.equal(Poly("3x^7-9x^4-4x^2+12").toHorner(), "((3x^3-9)x^2-4)x^2+12");
    assert.equal(Poly("7x^2+x").toHorner(), "(7x+1)x");
    assert.equal(Poly("7x^13+8x^7+3x^3+4x+2").toHorner(), "(((7x^6+8)x^4+3)x^2+4)x+2");

  });

  it("1/2x^4-9x^2-4x+12 in latex", function() {

    Poly.setField("Q");
    assert.equal(Poly("1/2x^4-9x^2-4x+12").integrate().toLatex(), "\\frac{1}{10}x^5-3x^3-2x^2+12x");
  });
});

