
var Polynomial = require('../polynomial.js');
var bigInt = require("big-integer");

Polynomial.setField({
    "add": function(a, b) {
        return bigInt(a).add(b);
    },
    "sub": function(a, b) {
        return bigInt(a).subtract(b);
    },
    "mul": function(a, b) {
        return bigInt(a).multiply(b);
    },
    "div": function(a, b) {
        return bigInt(a).divide(b);
    },
    "parse": function(x) {
        return bigInt(x);
    },
    "empty": function(x) {
        return bigInt(x).equals(0);
    },
    "pow": function(a, b) {
        return bigInt(a).pow(b);
    },
    "abs": function(a) {
        return bigInt(a).abs();
    }
});

console.log(new Polynomial("3891238912389182391919282829x^3+4").add("23819218x^2-381").toString());