
var Polynomial = require('../polynomial.js');


// Factorize the complex polynomial ix^2-3x-4x+9

Polynomial.setField("C");

var x = Polynomial("ix^2-13ix+36i");


// x1,2 = (-b +- sqrt(b^2-4ac)) / (2a)
var a = x.coeff[2];
var b = x.coeff[1];
var c = x.coeff[0];

var sqrt = b.mul(b).sub(a.mul(c).mul(4)).sqrt();

var x1 = b.neg().add(sqrt).div(a.mul(2));
var x2 = b.neg().sub(sqrt).div(a.mul(2));

// Ouputs (X-9)(X-4)
console.log("(X" + x1.neg().toString() + ")(X" + x2.neg().toString() + ")");
