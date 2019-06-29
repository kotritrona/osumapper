var assert = require("assert");

var Quaternion = require("../quaternion");
var EPS = 1e-11;

assert.q = function(a, b) {

  if ('w' in a && 'w' in b) {

  } else {
    assert(false);
  }

  var e = EPS;
  if (Math.abs(a.w - b.w) < e &&
    Math.abs(a.x - b.x) < e &&
    Math.abs(a.y - b.y) < e &&
    Math.abs(a.z - b.z) < e) {
  } else {
    assert.equal(a.toString(), b.toString());
  }
};

assert.v = function(a, b) {
  var e = EPS;
  if (Math.abs(a[0] - b[0]) < e &&
    Math.abs(a[1] - b[1]) < e &&
    Math.abs(a[2] - b[2]) < e) {
  } else {
    assert.equal(a.toString(), b.toString());
  }
};

assert.approx = function(is, should) {
  if (Math.abs(is - should) > EPS)
    assert.equal(is, should);
};

function CQ(a, b) {
  assert.q(a, b);
  return true;
}

describe("Quaternions", function() {

  it("should work with different params", function() {

    assert.equal(Quaternion(), '1');
    assert.equal(Quaternion().add(), '1'); // constructor gets 1, all others get 0
    assert.equal(Quaternion(2), '2');
    assert.equal(Quaternion(2, 3), '2 + 3i');
    assert.equal(Quaternion(2, 3, 4), '2 + 3i + 4j');
    assert.equal(Quaternion(2, 3, 4, 5), '2 + 3i + 4j + 5k');
  });

  it("should work with arrays", function() {

    assert.equal(Quaternion(1, [2, 3, 4]).equals(1, 2, 3, 4), true);
    assert.equal(Quaternion([1, 2, 3, 4]).equals(1, 2, 3, 4), true);
    assert.equal(Quaternion([1, 2, 3]).equals(0, 1, 2, 3), true);

  });

  it("should parse strings", function() {

    assert.equal(Quaternion("1").toString(), '1');
    assert.equal(Quaternion("1+1").toString(), '2');
    assert.equal(Quaternion("1-1").toString(), '0');
    assert.equal(Quaternion("1+i").toString(), '1 + i');
    assert.equal(Quaternion("1+ i +j - k").toString(), '1 + i + j - k');
    assert.equal(Quaternion(" -  13 + 55i - 1j - 5k").toString(), '-13 + 55i - j - 5k');
  });

  it("should add two quats", function() {

    assert.equal("10 + 10i + 10j - 2k", Quaternion(1, 2, 3, 4).add(9, 8, 7, -6).toString());
    assert.equal("10 + 6i + 10j + 2k", Quaternion(1, -2, 3, -4).add(9, 8, 7, 6).toString());
    assert.equal("6i + 10j + 2k", Quaternion(-9, -2, 3, -4).add(9, 8, 7, 6).toString());
    assert.equal("0", Quaternion(0, 0, 0, 0).add(0, 0, 0, 0).toString());
    assert.equal("1", Quaternion(2, 0, 0, 0).add(-1, 0, 0, 0).toString());
    assert.equal("-1 + k", Quaternion(0, 0, 0, 1).add(-1, 0, 0, 0).toString());

    assert.q(Quaternion(1).add("i"), Quaternion(1, 1, 0, 0));
    assert.q(Quaternion(1, 2, 3, 4).add(Quaternion(5, 6, 7, 8)), Quaternion(6, 8, 10, 12));
    assert.q(Quaternion(-1, 2, 3, 4).add(Quaternion(5, 6, 7, 8)), Quaternion(4, 8, 10, 12));
    assert.q(Quaternion(1, -2, 3, 4).add(Quaternion(5, 6, 7, 8)), Quaternion(6, 4, 10, 12));
    assert.q(Quaternion(1, 2, -3, 4).add(Quaternion(5, 6, 7, 8)), Quaternion(6, 8, 4, 12));
    assert.q(Quaternion(1, 2, 3, -4).add(Quaternion(5, 6, 7, 8)), Quaternion(6, 8, 10, 4));

    assert.q(Quaternion(0, 0, 0, 0).add(Quaternion(0, 0, 0, 0)), Quaternion(0, 0, 0, 0));
    assert.q(Quaternion(1, 0, 0, 0).add(Quaternion(-1, 0, 0, 0)), Quaternion(0, 0, 0, 0));
    assert.q(Quaternion(0, 1, 0, 0).add(Quaternion(0, -1, 0, 0)), Quaternion(0, 0, 0, 0));
    assert.q(Quaternion(0, 0, 1, 0).add(Quaternion(0, 0, -1, 0)), Quaternion(0, 0, 0, 0));
    assert.q(Quaternion(0, 0, 0, 1).add(Quaternion(0, 0, 0, -1)), Quaternion(0, 0, 0, 0));

    assert.q(Quaternion(1, 0, 0, 0).add(Quaternion(0, 0, 0, 0)), Quaternion(1, 0, 0, 0));
    assert.q(Quaternion(0, 1, 0, 0).add(Quaternion(0, 0, 0, 0)), Quaternion(0, 1, 0, 0));
    assert.q(Quaternion(0, 0, 1, 0).add(Quaternion(0, 0, 0, 0)), Quaternion(0, 0, 1, 0));
    assert.q(Quaternion(0, 0, 0, 1).add(Quaternion(0, 0, 0, 0)), Quaternion(0, 0, 0, 1));
  });

  it("should subtract two quats", function() {

    assert.equal("-8 - 6i - j + 10k", Quaternion(1, 2, 3, 4).sub(9, 8, 4, -6).toString());
    assert.equal("-8 - 10i - 4j - 10k", Quaternion(1, -2, 3, -4).sub(9, 8, 7, 6).toString());
    assert.equal("-18 - 10i - 4j - 10k", Quaternion(-9, -2, 3, -4).sub(9, 8, 7, 6).toString());
    assert.equal("0", Quaternion(0, 0, 0, 0).sub(0, 0, 0, 0).toString());
    assert.equal("3", Quaternion(2, 0, 0, 0).sub(-1, 0, 0, 0).toString());
    assert.equal("1 + k", Quaternion(0, 0, 0, 1).sub(-1, 0, 0, 0).toString());

    assert.q(Quaternion(0).sub(Quaternion(0)), Quaternion(0));
    assert.q(Quaternion(0).sub(Quaternion(1, 2, 3, 4)), Quaternion(-1, -2, -3, -4));
    assert.q(Quaternion(0).sub(Quaternion(-1, -2, -3, -4)), Quaternion(1, 2, 3, 4));
    assert.q(Quaternion(10, 9, 8, 7).sub(Quaternion(1, 2, 3, 4)), Quaternion(9, 7, 5, 3));
  });

  it("should calculate the norm of a quat", function() {

    assert.equal(1, Quaternion().norm());
    assert.equal(2, Quaternion(1, 1, 1, 1).norm());
    assert.equal(1, Quaternion([3, 2, 5, 4]).normalize().norm());
    assert.equal(Math.sqrt(1 + 4 + 9 + 16), Quaternion(1, 2, 3, 4).norm());
    assert.equal(1 + 4 + 9 + 16, Quaternion(1, 2, 3, 4).normSq());

    assert.equal(Quaternion({w: 5}).norm(), 5);
    assert.equal(Quaternion({w: -5}).norm(), 5);
    assert.equal(Quaternion(1, 1, 1, 1).norm(), 2);

    assert.equal(Quaternion(0, 0, 0, 0).norm(), 0);
    assert.equal(Quaternion(3, 4, 0, 0).norm(), 5);
    assert.equal(Quaternion(0, 3, 4, 0).norm(), 5);
    assert.equal(Quaternion(0, 0, 3, 4).norm(), 5);

    assert.equal(Quaternion(-3, 4, 0, 0).norm(), 5);
    assert.equal(Quaternion(0, -3, 4, 0).norm(), 5);
    assert.equal(Quaternion(0, 0, -3, 4).norm(), 5);

    assert.equal(Quaternion(1, 2, 2, 0).norm(), 3);
    assert.equal(Quaternion(0, 1, 2, 2).norm(), 3);

    assert.equal(Quaternion(1, 2, 6, 20).norm(), 21);
    assert.equal(Quaternion(20, 1, 2, 6).norm(), 21);
    assert.equal(Quaternion(6, 20, 1, 2).norm(), 21);
    assert.equal(Quaternion(2, 6, 20, 1).norm(), 21);

    assert.equal(Quaternion(1).norm(), 1);
    assert.equal(Quaternion("i").norm(), 1);
    assert.equal(Quaternion([3, 2, 5, 4]).norm(), 7.3484692283495345);
  });

  it("should calculate the inverse of a quat", function() {

    assert.equal('0.03333333333333333 - 0.06666666666666667i - 0.1j - 0.13333333333333333k', Quaternion(1, 2, 3, 4).inverse().toString());

    var p = Quaternion([3, 2, 5, 4]);
    var p_ = Quaternion(p).conjugate();
    var l = p.norm();
    var r = 1 / (l * l);

    assert.approx(l, p_.norm());
    assert.q(p.inverse(), p_.scale(r));
  });

  it("should calculate the conjugate of a quat", function() {

    assert.equal('1 - 2i - 3j - 4k', Quaternion(1, 2, 3, 4).conjugate().toString());

    assert.q(Quaternion(1, 2, 3, 4).conjugate(), Quaternion(1, -2, -3, -4));
    assert.q(Quaternion(-1, -2, -3, -4).conjugate(), Quaternion(-1, 2, 3, 4));

    assert.q(Quaternion(0, 0, 0, 0).conjugate(), Quaternion(0, 0, 0, 0));
    assert.q(Quaternion(1, 0, 0, 0).conjugate(), Quaternion(1, 0, 0, 0));
    assert.q(Quaternion(0, 1, 0, 0).conjugate(), Quaternion(0, -1, 0, 0));
    assert.q(Quaternion(0, 0, 1, 0).conjugate(), Quaternion(0, 0, -1, 0));
    assert.q(Quaternion(0, 0, 0, 1).conjugate(), Quaternion(0, 0, 0, -1));

    assert.q(Quaternion(-1, 0, 0, 0).conjugate(), Quaternion(-1, 0, 0, 0));
    assert.q(Quaternion(0, -1, 0, 0).conjugate(), Quaternion(0, 1, 0, 0));
    assert.q(Quaternion(0, 0, -1, 0).conjugate(), Quaternion(0, 0, 1, 0));
    assert.q(Quaternion(0, 0, 0, -1).conjugate(), Quaternion(0, 0, 0, 1));

    assert.q(Quaternion(1).conjugate(), Quaternion([1, -0, -0, -0]));
    assert.q(Quaternion("i").conjugate(), Quaternion([0, -1, -0, -0]));
    assert.q(Quaternion("j").conjugate(), Quaternion([0, -0, -1, -0]));
    assert.q(Quaternion("k").conjugate(), Quaternion([0, -0, -0, -1]));
    assert.q(Quaternion([3, 2, 5, 4]).conjugate(), Quaternion([3, -2, -5, -4]));
  });

  it('should pass conjugate properties', function() {

    var p1 = new Quaternion(8, 1, 2, 3);
    var p2 = new Quaternion(6, 9, 8, 7);

    // Test multiplicative property
    assert.q(p1.mul(p2).conjugate(), p2.conjugate().mul(p1.conjugate()));

    var p = new Quaternion(Math.random(), Math.random(), Math.random(), Math.random()).normalize();

    // Test unit quaternion property as inverse
    assert.q(p.conjugate().mul(p), p.mul(p.conjugate()));

    var q = Quaternion(1);

    // Test one element
    assert.q(q, q.conjugate());

    var q = Quaternion(0);

    // Test zero element
    assert.q(q, q.conjugate());

    // Test pure quats
    var q1 = new Quaternion(0, 1, 2, 3);
    var q2 = new Quaternion(0, 9, 8, 7);

    assert.q(q2.mul(q1), q1.mul(q2).conjugate());
  });

  it('should pass hamilton rules', function() {

    var i2 = Quaternion("i").mul("i");
    var j2 = Quaternion("j").mul("j");
    var k2 = Quaternion("k").mul("k");
    var ijk = Quaternion("i").mul("j").mul("k");

    assert.q(i2, j2);
    assert.q(j2, k2);
    assert.q(k2, ijk);
    assert.q(ijk, Quaternion([-1, 0, 0, 0]));

    var q = Quaternion(1, 0, 0, 0);
    var qI = Quaternion(0, 1, 0, 0);
    var qJ = Quaternion(0, 0, 1, 0);
    var qK = Quaternion(0, 0, 0, 1);

    var qTip = Quaternion(2, 3, 5, 7);

    assert.q(qI.mul(qI), Quaternion(-1));
    assert.q(qJ.mul(qJ), Quaternion(-1));
    assert.q(qK.mul(qK), Quaternion(-1));

    assert.q(qI.mul(qJ), Quaternion("k"));
    assert.q(qJ.mul(qI), Quaternion("-k"));
    assert.q(qJ.mul(qK), Quaternion("i"));
    assert.q(qK.mul(qJ), Quaternion("-i"));
    assert.q(qK.mul(qI), Quaternion("j"));
    assert.q(qI.mul(qK), Quaternion("-j"));

  });

  it('should add a number to a Quaternion', function() {
    assert.q(Quaternion(1, 2, 3, 4).add(5), Quaternion(6, 2, 3, 4));
    assert.q(Quaternion(1, 2, 3, 4).add(-5), Quaternion(-4, 2, 3, 4));
    assert.q(Quaternion(1, 2, 3, 4).add(0), Quaternion(1, 2, 3, 4));
    assert.q(Quaternion(0, 0, 0, 0).add(5), Quaternion(5, 0, 0, 0));
  });

  it("should return the real and imaginary part", function() {

    var q = new Quaternion(7, 2, 3, 4);

    assert.equal(Quaternion(q.imag()).toString(), '2i + 3j + 4k');
    assert.equal(q.real(), 7);
  });

  it("should result in the same for the inverse of normalized quats", function() {

    var q = Quaternion(9, 8, 7, 6).normalize();

    assert.q(q.inverse(), q.conjugate());
  });

  it("should normalize quaternion", function() {

    var q = Quaternion(Math.random() * 1000, Math.random() * 1000, Math.random() * 1000, Math.random() * 1000).normalize();

    assert(CQ(Quaternion(q.norm()), Quaternion(1, 0, 0, 0)));
  });

  it("should invert quaternion", function() {

    var q = Quaternion(Math.random() * 1000, Math.random() * 1000, Math.random() * 1000, Math.random() * 1000);

    assert(CQ(q.mul(q.inverse()), Quaternion(1, 0, 0, 0)));
    assert(CQ(q.inverse().mul(q), Quaternion(1, 0, 0, 0)));
  });

  it("should work to check if two quats are the same", function() {

    assert.equal(Quaternion(9, 8, 7, 6).equals(9, 8, 7, 6), true);
    assert.equal(Quaternion(8, 8, 7, 6).equals(9, 8, 7, 6), false);
    assert.equal(Quaternion(9, 7, 7, 6).equals(9, 8, 7, 6), false);
    assert.equal(Quaternion(9, 8, 6, 6).equals(9, 8, 7, 6), false);
    assert.equal(Quaternion(9, 8, 7, 5).equals(9, 8, 7, 6), false);
  });

  it("should calculate the dot product", function() {

    assert.equal(Quaternion(9, 8, 7, 6).dot(1, 2, 3, 4).toString(), '70');
    assert.equal(Quaternion(9, 8, 7, 6).normSq(), Quaternion(9, 8, 7, 6).dot(9, 8, 7, 6));
  });

  it('should pass trivial cases', function() {

    var q0 = new Quaternion(0);
    var q1 = Quaternion(Math.random(), Math.random(), Math.random(), Math.random());
    var q2 = Quaternion(Math.random(), Math.random(), Math.random(), Math.random());
    var l = Math.random() * 2.0 - 1.0;
    var lp = Math.random();

    assert.q(q1.add(q2), (q2.add(q1)));
    assert.q(q0.sub(q1), (q1.neg()));
    assert.q(q1.conjugate().conjugate(), (q1));
    assert.approx(q1.normalize().norm(), 1);
    assert.q(q1.inverse(), (q1.conjugate().scale(1 / Math.pow(q1.norm(), 2))));
    assert.q(q1.div(q2), q1.mul(q2.inverse()));
    assert.approx(q1.scale(l).norm(), Math.abs(q1.norm() * l));
    assert.approx(q1.mul(q2).norm(), q1.norm() * q2.norm());
    assert.q((new Quaternion(l)).exp(), (new Quaternion(Math.exp(l))));
    assert.q((new Quaternion(lp)).log(), (new Quaternion(Math.log(lp))));
    assert.q(q1.exp().log(), q1);
    assert.q(q1.log().exp(), q1);
    // TODO: assert.q(q1.add(q2).exp(), q1.exp().mul(q2.exp()));
    assert.q(q1.pow(2.0), q1.mul(q1));
    assert.q(q1.mul(q1.inverse()), (Quaternion.ONE));
    assert.q(q1.inverse().mul(q1), Quaternion.ONE);
    assert.q(q1.add(q1.conjugate()), Quaternion(2 * q1.w));
  });

  it('should pass other trivial cases', function() {

    var x = Quaternion(1, 2, -0.5, -1);
    var y = Quaternion(-3, 4, 0, 2);
    var z = Quaternion(-2, 1, 2, -4);

    assert.approx(y.normSq(), 29);
    assert.approx(z.normSq(), 25);
    assert.q(z.normalize(), Quaternion(-0.4, 0.2, 0.4, -0.8));
    assert.q(x.exp().log(), x);
    assert.q(x.mul(y), Quaternion(-9.0, -3.0, -6.5, 7.0));
    assert.approx(y.dot(y), 29);
  });

  it("should calculate the product", function() {

    assert.equal(Quaternion(5).mul(6).toString(), '30');
    assert.equal(Quaternion(1, 2, 3, 4).mul(6).toString(), '6 + 12i + 18j + 24k'); // scale
    assert.equal(Quaternion(6).mul(1, 2, 3, 4).toString(), '6 + 12i + 18j + 24k'); // scale
    assert.equal(Quaternion(5, 6).mul(6, 7).toString(), '-12 + 71i');
    assert.equal(Quaternion(1, 1, 1, 1).mul(2, 2, 2, 2).toString(), '-4 + 4i + 4j + 4k');

    assert.q(Quaternion(1, 2, 3, 4).mul(5, 6, 7, 8), Quaternion(-60, 12, 30, 24));
    assert.q(Quaternion(3, 2, 5, 4).mul(4, 5, 3, 1), Quaternion(-17, 16, 47, 0));
    assert.q(Quaternion().mul(Quaternion(1, 2, 3, 4)), Quaternion(1, 2, 3, 4));
    assert.q(Quaternion().mul(Quaternion()), Quaternion());

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(1, 0, 0, 0)), Quaternion(1, 0, 0, 0));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(1, 0, 0, 0)), Quaternion(0, 1, 0, 0));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(1, 0, 0, 0)), Quaternion(0, 0, 1, 0));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(1, 0, 0, 0)), Quaternion(0, 0, 0, 1));

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(0, 1, 0, 0)), Quaternion(0, 1, 0, 0));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(0, 1, 0, 0)), Quaternion(-1, 0, 0, 0));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(0, 1, 0, 0)), Quaternion(0, 0, 0, -1));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(0, 1, 0, 0)), Quaternion(0, 0, 1, 0));

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(0, 0, 1, 0)), Quaternion(0, 0, 1, 0));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(0, 0, 1, 0)), Quaternion(0, 0, 0, 1));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(0, 0, 1, 0)), Quaternion(-1, 0, 0, 0));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(0, 0, 1, 0)), Quaternion(0, -1, 0, 0));

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(0, 0, 0, 1)), Quaternion(0, 0, 0, 1));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(0, 0, 0, 1)), Quaternion(0, 0, -1, 0));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(0, 0, 0, 1)), Quaternion(0, 1, 0, 0));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(0, 0, 0, 1)), Quaternion(-1, 0, 0, 0));

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(-1, 0, 0, 0)), Quaternion(-1, 0, 0, 0));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(-1, 0, 0, 0)), Quaternion(0, -1, 0, 0));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(-1, 0, 0, 0)), Quaternion(0, 0, -1, 0));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(-1, 0, 0, 0)), Quaternion(0, 0, 0, -1));

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(0, -1, 0, 0)), Quaternion(0, -1, 0, 0));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(0, -1, 0, 0)), Quaternion(1, 0, 0, 0));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(0, -1, 0, 0)), Quaternion(0, 0, 0, 1));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(0, -1, 0, 0)), Quaternion(0, 0, -1, 0));

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(0, 0, -1, 0)), Quaternion(0, 0, -1, 0));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(0, 0, -1, 0)), Quaternion(0, 0, 0, -1));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(0, 0, -1, 0)), Quaternion(1, 0, 0, 0));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(0, 0, -1, 0)), Quaternion(0, 1, 0, 0));

    assert.q(Quaternion(1, 0, 0, 0).mul(Quaternion(0, 0, 0, -1)), Quaternion(0, 0, 0, -1));
    assert.q(Quaternion(0, 1, 0, 0).mul(Quaternion(0, 0, 0, -1)), Quaternion(0, 0, 1, 0));
    assert.q(Quaternion(0, 0, 1, 0).mul(Quaternion(0, 0, 0, -1)), Quaternion(0, -1, 0, 0));
    assert.q(Quaternion(0, 0, 0, 1).mul(Quaternion(0, 0, 0, -1)), Quaternion(1, 0, 0, 0));
  });

  it("should scale a quaternion", function() {

    assert.q(Quaternion([3, 2, 5, 4]).scale(3), Quaternion([9, 6, 15, 12]));
  });

  it("should calculate the quotient", function() {

    assert.equal(Quaternion(6).div(2).toString(), '3');
    assert.equal(Quaternion(1).div(2).toString(), '0.5');
    assert.equal(Quaternion(1).div(2).toString(), '0.5');
    assert.equal(Quaternion(4, 2).div(1, 1).toString(), '3 - i');
    assert.equal(Quaternion(3, -2).div(Quaternion.I).toString(), '-2 - 3i');
    assert.equal(Quaternion(25).div(3, -4).toString(), '3 + 4i');
  });

  it("should result in norm=1 with fromAxisAngle", function() {

    var axis = [1, 1, 1];
    var angle = Math.PI;

    assert.equal(Quaternion.fromAxisAngle(axis, angle).norm(), 1);
  });

  it("should have no effect to rotate on axis parallel to vector direction", function() {

    var v = [1, 1, 1];

    var angle = Math.random();
    var axis = [1, 1, 1];

    var r = Quaternion.fromAxisAngle(axis, angle).rotateVector(v);

    assert.v(r, [1,1,1]);
  });

  it("should generate a unit quaternion from euler angle", function() {

    var n = Quaternion.fromEuler(Math.PI, Math.PI, Math.PI).norm();

    assert.equal(n, 1);
  });

  it("should rotate a vector in direct and indirect manner", function() {

    var v = [1, 9, 3];

    var q = Quaternion("1+2i+3j+4k").normalize();

    var a = q.mul(v).mul(q.conjugate()).toVector();
    var b = q.rotateVector(v);

    assert.v(a.slice(1), b);
  });

  it("should rotate a vector correctly", function() {

    var theta = 2 * Math.PI / 3.0;
    var axis = [1.0, 1.0, 1.0];
    var vector = [3.0, 4.0, 5.0];

    var p = Quaternion.fromAxisAngle(axis, theta).rotateVector(vector);

    assert.v(p, [5.0, 3.0, 4.0]);
  });

  it("should rotate a vector correctly", function() {

    var v = [1.0, 1.0, 1.0];
    var q = Quaternion.fromAxisAngle([0.0, 1.0, 0.0], Math.PI);
    var p = q.rotateVector(v);

    assert.v(p, [-1, 1, -1]);
  });

  it("should rotate a vector correctly based on Euler angles", function() {

    var v = [1.0, 1.0, 1.0];
    var q = Quaternion.fromEuler(0.0, Math.PI, 0.0);
    var p = q.rotateVector(v);

    assert.v(p, [1, -1, -1]);
  });

  it("should exp and log a quaternion", function() {

    var q = new Quaternion(Math.random() * 10, Math.random() * 10, Math.random() * 10, Math.random() * 10);

    assert(CQ(q, q.log().exp()));
  });

  it("should exp and log real numbers", function() {

    var n = Math.random() * 10;
    var q = Quaternion(n);

    assert.v(q.exp().toVector(), [Math.exp(n), 0, 0, 0]);
    assert.v(q.log().toVector(), [Math.log(n), 0, 0, 0]);
  });

  it("should work with scalar powers", function() {

    var q = new Quaternion(Math.random() * 10, Math.random() * 10, Math.random() * 10, Math.random() * 10);

    assert(CQ(q.pow(3), q.mul(q).mul(q)));
  });

  it('should compare 2 quaternions correctly', function() {
    assert.equal(!Quaternion().equals(Quaternion(1, 0, 0, 0)), false);
    assert.equal(!Quaternion(1, 1, 1, 1).equals(Quaternion(1, 1, 1, 1)), false);
    assert.equal(!Quaternion(1, 1, 1, 0).equals(Quaternion(1, 1, 1, 0)), false);
    assert.equal(!Quaternion(1, 1, 0, 1).equals(Quaternion(1, 1, 0, 1)), false);
    assert.equal(!Quaternion(1, 0, 1, 1).equals(Quaternion(1, 0, 1, 1)), false);
    assert.equal(!Quaternion(0, 1, 1, 1).equals(Quaternion(0, 1, 1, 1)), false);
    assert.equal(!Quaternion(1, 1, 1, 1).equals(Quaternion(-1, 1, 1, 1)), true);
    assert.equal(!Quaternion(1, 1, 1, 1).equals(Quaternion(1, -1, 1, 1)), true);
    assert.equal(!Quaternion(1, 1, 1, 1).equals(Quaternion(1, 1, -1, 1)), true);
    assert.equal(!Quaternion(1, 1, 1, 1).equals(Quaternion(1, 1, 1, -1)), true);
  });

  it('should square Quaternions', function() {

    assert(CQ(Quaternion("i").pow(2), Quaternion(-1)));
    assert(CQ(Quaternion("j").pow(2), Quaternion(-1)));
    assert(CQ(Quaternion("k").pow(2), Quaternion(-1)));
    assert(CQ(Quaternion(1).pow(2), Quaternion({w: 1})));

    assert(CQ(Quaternion(3, -2, -3, 4).pow(2), Quaternion(-20, -12, -18, 24)));

    assert(CQ(Quaternion(1, 2, 3, 4).pow(2), Quaternion(-28, 4, 6, 8)));
    assert(CQ(Quaternion(-1, 2, 3, 4).pow(2), Quaternion(-28, -4, -6, -8)));
    assert(CQ(Quaternion(1, -2, 3, 4).pow(2), Quaternion(-28, -4, 6, 8)));
    assert(CQ(Quaternion(1, 2, -3, 4).pow(2), Quaternion(-28, 4, -6, 8)));
    assert(CQ(Quaternion(1, 2, 3, -4).pow(2), Quaternion(-28, 4, 6, -8)));

    assert(CQ(Quaternion(5, 4, 3, 2).pow(2), Quaternion(-4, 40, 30, 20)));
    assert(CQ(Quaternion(-5, 4, 3, 2).pow(2), Quaternion(-4, -40, -30, -20)));
    assert(CQ(Quaternion(5, -4, 3, 2).pow(2), Quaternion(-4, -40, 30, 20)));
    assert(CQ(Quaternion(5, 4, -3, 2).pow(2), Quaternion(-4, 40, -30, 20)));
    assert(CQ(Quaternion(5, 4, 3, -2).pow(2), Quaternion(-4, 40, 30, -20)));
  });

  it('should raise Quaternion to a Quaternion power', function() {
    assert(CQ(Quaternion(1, 4, 0, 0).pow(Quaternion(-2, 3, 0, 0)), Quaternion(-0.000030177061938851806, 0.0011015451057806702, 0, 0)));
    assert(CQ(Quaternion(1, 4, -3, 2).pow(Quaternion(4, 2, -3, 2)), Quaternion(4.023822744421112, -0.08808649248602358, 0.10799947333843203, -0.045858528052467734)));
    assert(CQ(Quaternion(-1, -1, 0, 4).pow(Quaternion(-4, 5, 1, 1.5)), Quaternion(0.00009562614911354535, 0.0010196374737841477, 0.0015348157881126755, -0.0007464390363321687)));

    assert(CQ(Quaternion(0, 2, 0, 0).pow(Quaternion(1, 0, 0, 0)), Quaternion(0, 2, 0, 0)));
    assert(CQ(Quaternion(0, 2, 0, 0).pow(Quaternion(0, 1, 0, 0)), Quaternion(0.15990905692806803, 0.13282699942462048, 0, 0)));
    assert(CQ(Quaternion(0, 2, 0, 0).pow(Quaternion(0, 0, 1, 0)), Quaternion(-0.145615694487965, 0, 0.399409670603132, 0.905134235650981)));
    assert(CQ(Quaternion(0, 2, 0, 0).pow(Quaternion(0, 0, 0, 1)), Quaternion(-0.145615694487965, 0, -0.905134235650981, 0.399409670603132)));

    assert(CQ(Quaternion(0, 0, 2, 0).pow(Quaternion(1, 0, 0, 0)), Quaternion(0, 0, 2, 0)));
    assert(CQ(Quaternion(0, 0, 2, 0).pow(Quaternion(0, 1, 0, 0)), Quaternion(-0.145615694487965, 0.399409670603132, 0, -0.905134235650981)));
    assert(CQ(Quaternion(0, 0, 2, 0).pow(Quaternion(0, 0, 1, 0)), Quaternion(0.159909056928068, 0, 0.13282699942462, 0)));
    assert(CQ(Quaternion(0, 0, 2, 0).pow(Quaternion(0, 0, 0, 1)), Quaternion(-0.145615694487965, 0.905134235650981, 0, 0.399409670603132)));

    assert(CQ(Quaternion(0, 0, 0, 2).pow(Quaternion(1, 0, 0, 0)), Quaternion(0, 0, 0, 2)));
    assert(CQ(Quaternion(0, 0, 0, 2).pow(Quaternion(0, 1, 0, 0)), Quaternion(-0.145615694487965, 0.399409670603132, 0.905134235650981, 0)));
    assert(CQ(Quaternion(0, 0, 0, 2).pow(Quaternion(0, 0, 1, 0)), Quaternion(-0.145615694487965, -0.905134235650981, 0.399409670603132, 0)));
    assert(CQ(Quaternion(0, 0, 0, 2).pow(Quaternion(0, 0, 0, 1)), Quaternion(0.159909056928068, 0, 0, 0.13282699942462)));

  });

  it('should raise reals to quaternion powers', function() {
    assert(CQ(Quaternion(1).pow(Quaternion(3, 4, 5, 9)), Quaternion(1)));
    assert(CQ(Quaternion(-2).pow(Quaternion(4, 2, 1, 1.5)), Quaternion(-0.024695944127665907, 0.015530441791896946, -0.004473740387907085, 0.004654139181719533)));
    assert(CQ(Quaternion(2, 0, 0, 0).pow(Quaternion(1, 0, 0, 0)), Quaternion(2, 0, 0, 0)));
    assert(CQ(Quaternion(2, 0, 0, 0).pow(Quaternion(0, 1, 0, 0)), Quaternion(0.7692389013639721, 0.6389612763136348, 0, 0)));
    assert(CQ(Quaternion(2, 0, 0, 0).pow(Quaternion(0, 0, 1, 0)), Quaternion(0.769238901363972, 0, 0.638961276313635, 0)));
    assert(CQ(Quaternion(2, 0, 0, 0).pow(Quaternion(0, 0, 0, 1)), Quaternion(0.769238901363972, 0, 0, 0.638961276313635)));
  });

  it('should return the square root of a Quaternion', function() {
    assert(CQ(Quaternion(1, 2, 3, 4).pow(1 / 2), Quaternion(1.7996146219471072, 0.5556745248702426, 0.8335117873053639, 1.1113490497404852)));
    assert(CQ(Quaternion(-1, -2, -3, -4).pow(1 / 2).pow(2), Quaternion(-1, -2, -3, -4)));
    assert(CQ(Quaternion().pow(1 / 2), Quaternion()));
    assert(CQ(Quaternion(1, 0, 0, 0).pow(1 / 2), Quaternion(1, 0, 0, 0)));
    assert(CQ(Quaternion(0, 1, 0, 0).pow(1 / 2), Quaternion(0.7071067811865476, 0.7071067811865475, 0, 0)));
    assert(CQ(Quaternion("1-2i").pow(1 / 2), Quaternion("1.272019649514069 - 0.7861513777574233i")))
    assert(CQ(Quaternion(0, 0, 1, 0).pow(1 / 2), Quaternion(0.7071067811865476, 0, 0.7071067811865475, 0)));
    assert(CQ(Quaternion(0, 0, 0, 1).pow(1 / 2), Quaternion(0.7071067811865476, 0, 0, 0.7071067811865475)));
    assert(CQ(Quaternion(-1).pow(1 / 2), Quaternion("i")));
  });

  it('should return the log base e of a quaternion', function() {
    assert(CQ(Quaternion(1, 2, 3, 4).log(), Quaternion(1.7005986908310777, 0.515190292664085, 0.7727854389961275, 1.03038058532817)));
    assert(CQ(Quaternion(-1, 2, 3, 4).log(), Quaternion(1.7005986908310777, 0.6515679277817118, 0.9773518916725678, 1.3031358555634236)));
    assert(CQ(Quaternion(1, -2, 3, 4).log(), Quaternion(1.7005986908310777, -0.515190292664085, 0.7727854389961275, 1.03038058532817)));
    assert(CQ(Quaternion(1, 2, -3, 4).log(), Quaternion(1.7005986908310777, 0.515190292664085, -0.7727854389961275, 1.03038058532817)));
    assert(CQ(Quaternion(1, 2, 3, -4).log(), Quaternion(1.7005986908310777, 0.515190292664085, 0.7727854389961275, -1.03038058532817)));

    assert(CQ(Quaternion(2, 3, 4, 5).log(), Quaternion(1.9944920232821373, 0.549487105217117, 0.7326494736228226, 0.9158118420285283)));
    assert(CQ(Quaternion(5, 2, 3, 4).log(), Quaternion(1.9944920232821373, 0.30545737557546476, 0.45818606336319717, 0.6109147511509295)));
    assert(CQ(Quaternion(4, 5, 2, 3).log(), Quaternion(1.9944920232821373, 0.8072177296195943, 0.3228870918478377, 0.48433063777175656)));
    assert(CQ(Quaternion(3, 4, 5, 2).log(), Quaternion(1.9944920232821373, 0.685883734654061, 0.8573546683175763, 0.3429418673270305)));
  });

  it('should return the exp of a quaternion', function() {
    assert(CQ(Quaternion(0, 0, 0, 0).exp(), Quaternion(1, 0, 0, 0)));
    assert(CQ(Quaternion(1, 0, 0, 0).exp(), Quaternion(2.718281828459045, 0, 0, 0)));
    assert(CQ(Quaternion(0, 1, 0, 0).exp(), Quaternion(0.5403023058681398, 0.8414709848078965, 0, 0)));
    assert(CQ(Quaternion(0, 0, 1, 0).exp(), Quaternion(0.5403023058681398, 0, 0.8414709848078965, 0)));
    assert(CQ(Quaternion(0, 0, 0, 1).exp(), Quaternion(0.5403023058681398, 0, 0, 0.8414709848078965)));

    assert(CQ(Quaternion(-1, 0, 0, 0).exp(), Quaternion(0.3678794411714424, 0, 0, 0)));
    assert(CQ(Quaternion(0, -1, 0, 0).exp(), Quaternion(0.5403023058681398, -0.8414709848078965, 0, 0)));
    assert(CQ(Quaternion(0, 0, -1, 0).exp(), Quaternion(0.5403023058681398, 0, -0.8414709848078965, 0)));
    assert(CQ(Quaternion(0, 0, 0, -1).exp(), Quaternion(0.5403023058681398, 0, 0, -0.8414709848078965)));

    assert(CQ(Quaternion(1, 2, 3, 4).exp(), Quaternion(1.6939227236832994, -0.7895596245415588, -1.184339436812338, -1.5791192490831176)));
    assert(CQ(Quaternion(4, 1, 2, 3).exp(), Quaternion(-45.05980201339819, -8.240025266756877, -16.480050533513754, -24.720075800270628)));
    assert(CQ(Quaternion(3, 4, 1, 2).exp(), Quaternion(-2.6000526954284027, -17.384580348249628, -4.346145087062407, -8.692290174124814)));
    assert(CQ(Quaternion(2, 3, 4, 1).exp(), Quaternion(2.786189997492657, -4.026439818820405, -5.3685864250938735, -1.3421466062734684)));
  });

  it('should divide quaternions by each other', function() {

    assert(CQ(Quaternion({z: 1}).div(Quaternion({y: 1})), Quaternion({x: 1})));
    assert(CQ(Quaternion({x: 1}).div(Quaternion({z: 1})), Quaternion({y: 1})));
    assert(CQ(Quaternion(3, -2, -3, 4).div(Quaternion(3, -2, -3, 4)), Quaternion(1, 0, 0, 0)));
    assert(CQ(Quaternion(1, 2, 3, 4).div(Quaternion(-1, 1, 2, 3)), Quaternion(19 / 15, -4 / 15, -1 / 5, -8 / 15)));

    assert(CQ(Quaternion(1, 0, 0, 0).div(Quaternion(1, 0, 0, 0)), Quaternion(1, 0, 0, 0)));
    assert(CQ(Quaternion(1, 0, 0, 0).div(Quaternion(0, 1, 0, 0)), Quaternion(0, -1, 0, 0)));
    assert(CQ(Quaternion(1, 0, 0, 0).div(Quaternion(0, 0, 1, 0)), Quaternion(0, 0, -1, 0)));
    assert(CQ(Quaternion(1, 0, 0, 0).div(Quaternion(0, 0, 0, 1)), Quaternion(0, 0, 0, -1)));
  });

  it('should raise Quaternion to real powers', function() {
    assert(CQ(Quaternion(1, 2, 3, 4).pow(2), Quaternion(-28, 4, 6, 8)));
    assert(CQ(Quaternion(1, 2, 3, 4).pow(0), Quaternion({w: 1})));
    assert(CQ(Quaternion(1, 2, 3, 4).pow(2.5), Quaternion(-66.50377063575604, -8.360428208578368, -12.54064231286755, -16.720856417156735)));
    assert(CQ(Quaternion(1, 2, 3, 4).pow(-2.5), Quaternion(-0.0134909686430938, 0.0016959981926818065, 0.0025439972890227095, 0.003391996385363613)));
  });

  it('should rotate one vector onto the other', function() {

    var u = [Math.random() * 100, Math.random() * 100, Math.random() * 100];
    var v = [Math.random() * 100, Math.random() * 100, Math.random() * 100];

    var q = Quaternion.fromBetweenVectors(u, v);
    var vPrime = q.rotateVector(u);

    // Do they look in the same direction?
    assert.q(Quaternion(v).normalize(), Quaternion(vPrime).normalize());

    // Is the length of rotated equal to the original?
    assert.approx(Quaternion(u).norm(), Quaternion(vPrime).norm());

  });

  it('should rotate additive inverse to the same point', function() {

    var q1 = Quaternion(Math.random(),Math.random(),Math.random(),Math.random()).normalize();
    var q2 = Quaternion(Math.random(),Math.random(),Math.random(),Math.random()).normalize();

    var v = [Math.random(),Math.random(),Math.random()];

    assert.v(q1.neg().rotateVector(v), q1.rotateVector(v));
    assert.v(q1.conjugate().neg().rotateVector(v), q1.conjugate().rotateVector(v));
  });

});
