import { Semver } from "./semver.ts";
import { assert, assertEquals, assertThrows } from "./test_deps.ts";

Deno.test(function semver() {
  const v = new Semver("1.0.2");
  assertEquals(v.major, 1);
  assertEquals(v.minor, 0);
  assertEquals(v.patch, 2);
});

Deno.test(function semverEq() {
  const v1 = new Semver("1.0.2");
  assert(v1.eq(v1));
});

Deno.test(function SemverLt() {
  const v1 = new Semver("1.0.2");
  const v2 = new Semver("1.0.3");
  assert(v1.lt(v2));
});

Deno.test(function semverTilde() {
  const v1 = new Semver("1.0.2");
  const v2 = new Semver("1.0.3");
  assert(v1.tilde(v2));
});

Deno.test(function semverBad() {
  assertThrows(() => new Semver("bad.0.2"));
});

Deno.test(function semverToken() {
  const v1 = new Semver("1.0.2");
  const v2 = new Semver("1.0.3");
  assert(v1._("<", v2));
  assert(v1._("<=", v2));
  assert(v1._("~", v2));
  assert(!v1._("=", v2));
  assert(!v1._(">=", v2));
  assert(!v1._(">", v2));
  assertThrows(() => v1._("x", v2));
});
