import { udd, UddOptions, UddResult } from "./mod.ts";
import { decode, encode } from "./deps.ts";
import {
  FakeRegistry,
  FakeDenoStd,
  assert,
  assertEquals,
  assertThrowsAsync
} from "./test_deps.ts";

async function testUdd(
  before: string,
  after: string,
  registries: any[] = [FakeRegistry]
) {
  const fn = await Deno.makeTempFile();
  try {
    await Deno.writeFile(fn, encode(before));
    const results: UddResult[] = await udd(
      fn,
      { _registries: registries, quiet: true } as UddOptions
    );

    const altered = decode(await Deno.readFile(fn));
    assertEquals(after, altered);
    return results;
  } finally {
    await Deno.remove(fn);
  }
}

Deno.test(async function uddFakeregistry() {
  const contents = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts";';
  const expected = 'import "https://fakeregistry.com/foo@0.0.2/mod.ts";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeregistryNotFound() {
  const contents = 'import "https://fakeregistry.com/foo@0.0.3/mod.ts#=";';
  const expected = 'import "https://fakeregistry.com/foo@0.0.3/mod.ts#=";';
  const results = await testUdd(contents, expected);
  assertEquals(1, results.length);
  assertEquals(false, results[0].success);
  assertEquals("no compatible version found", results[0].newVersion);
});

Deno.test(async function uddFakeDenolandStd() {
  const contents = 'import "https://deno.land/std@0.34.0/mod.ts";';
  const expected = 'import "https://deno.land/std@0.35.0/mod.ts";';
  await testUdd(contents, expected, [FakeDenoStd]);
});

Deno.test(async function uddFakeregistryEqToken() {
  const contents =
    'import "https://fakeregistry.com/foo@0.0.1/mod.ts#=0.0.1";';
  const expected =
    'import "https://fakeregistry.com/foo@0.0.1/mod.ts#=0.0.1";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeregistryTildeToken() {
  const contents =
    'import "https://fakeregistry.com/foo@0.0.1/mod.ts#~0.0.1";';
  const expected =
    'import "https://fakeregistry.com/foo@0.0.2/mod.ts#~0.0.1";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeregistryLtToken() {
  const contents =
    'import "https://fakeregistry.com/foo@0.0.1/mod.ts#<0.1.0";';
  const expected =
    'import "https://fakeregistry.com/foo@0.0.2/mod.ts#<0.1.0";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeregistryLtTokenSpaces() {
  const contents =
    'import "https://fakeregistry.com/foo@0.0.1/mod.ts# < 0.1.0";';
  const expected =
    'import "https://fakeregistry.com/foo@0.0.2/mod.ts# < 0.1.0";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeregistryInvalidFragmentSemver() {
  const contents =
    'import "https://fakeregistry.com/foo@0.0.1/mod.ts# < 0.1.b";';
  const expected =
    'import "https://fakeregistry.com/foo@0.0.1/mod.ts# < 0.1.b";';
  const results = await testUdd(contents, expected);
  assertEquals(results.length, 1);
  assertEquals(results[0].success, false);
  assertEquals(results[0].newVersion, "invalid semver version: 0.1.b");
});

Deno.test(async function uddFakeregistryInvalidFragmentFoo() {
  const contents = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts#foo";';
  const expected = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts#foo";';
  const results = await testUdd(contents, expected);
  assertEquals(results.length, 1);
  assertEquals(results[0].success, false);
  assertEquals(results[0].newVersion, "invalid semver fragment: foo");
});

Deno.test(async function uddFakeregistryEq() {
  const contents = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts#=";';
  const expected = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts#=";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeregistryTilde() {
  const contents = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts#~";';
  const expected = 'import "https://fakeregistry.com/foo@0.0.2/mod.ts#~";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeregistryCaret() {
  const contents = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts#^";';
  const expected = 'import "https://fakeregistry.com/foo@0.0.2/mod.ts#^";';
  await testUdd(contents, expected);
});

Deno.test(async function uddFakeMultiple() {
  const contents = `
import "https://deno.land/std@0.34.0/mod.ts";
import "https://deno.land/std@0.34.0/foo.ts";
import { foo } from "https://fakeregistry.com/foo@0.0.1/mod.ts";
import { bar } from "https://fakeregistry.com/foo@0.0.1/bar.ts#=";
`;
  const expected = `
import "https://deno.land/std@0.35.0/mod.ts";
import "https://deno.land/std@0.35.0/foo.ts";
import { foo } from "https://fakeregistry.com/foo@0.0.2/mod.ts";
import { bar } from "https://fakeregistry.com/foo@0.0.1/bar.ts#=";
`;
  const results = await testUdd(
    contents,
    expected,
    [FakeRegistry, FakeDenoStd]
  );
  assertEquals(4, results.length);
  // the ordering is a little weird...
  // (it corresponds to the order passed registries)
  // FIXME make less fragile by improving search.ts to provide urls in order
  assertEquals([true, undefined, true, true], results.map(x => x.success));
});
