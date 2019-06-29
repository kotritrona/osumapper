
var Polynomial = require('../polynomial.js');

Polynomial.setField("Q");


// This implements Newton's method on top of a rational polynomial. The code is highly experimental!
function factor(P) {

    var xn = 1;

    var F = Polynomial(P); // f(x)
    var f = F['derive'](); // f'(x)

    var res = [];

    do {

        var prev, xn = Polynomial(1).coeff[0];
        var k = 0;

        do {

            prev = xn;
            //xn = FIELD['sub'](xn, FIELD.div(F.result(xn), f.result(xn)));
            xn = xn.sub(F.result(xn).div(f.result(xn)));
        } while (k++ === 0 || Math.abs(xn.valueOf() - prev.valueOf()) > 1e-8);

        var p = Polynomial("x").sub(xn); // x-x0

        F = F.div(p);
        f = F.derive();

        res.push(xn);

    } while (f.degree() >= 0);

    return res;
}
// Result should by ~3, ~4, ~9
console.log(factor("x^3-16x^2+75x-108"));