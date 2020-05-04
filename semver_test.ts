import { Semver } from "./semver.ts";
import { assert, assertEquals, assertThrows } from "./test_deps.ts";

Deno.test("semver", () => {
  const v = new Semver("1.0.2");
  assertEquals(v.major, 1);
  assertEquals(v.minor, 0);
  assertEquals(v.patch, 2);
});

Deno.test("semverEq", () => {
  const v1 = new Semver("1.0.2");
  assert(v1.eq(v1));
});

Deno.test("SemverLt", () => {
  const v1 = new Semver("1.0.2");
  const v2 = new Semver("1.0.3");
  assert(v1.lt(v2));
});

Deno.test("semverTilde", () => {
  const v1 = new Semver("1.0.2");
  const v2 = new Semver("1.0.3");
  assert(v1.tilde(v2));
});

Deno.test("semverBad", () => {
  assertThrows(() => new Semver("bad.0.2"));
});

Deno.test("semverToken", () => {
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
