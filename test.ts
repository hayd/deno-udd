import { udd, UddOptions, UddResult } from "./mod.ts";
import { decode, encode } from "./deps.ts";
import {
  FakeRegistry,
  FakeDenoStd,
  assert,
  assertEquals
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
    assertEquals(1, results.length);
    assert(results[0].success);

    const altered = decode(await Deno.readFile(fn));
    assertEquals(after, altered);
  } finally {
    await Deno.remove(fn);
  }
}

Deno.test(async function fakeregistryUdd() {
  const contents = 'import "https://fakeregistry.com/foo@0.0.1/mod.ts";';
  const expected = 'import "https://fakeregistry.com/foo@0.0.2/mod.ts";';
  testUdd(contents, expected);
});

Deno.test(async function fakeDenoStdUdd() {
  const contents = 'import "https://deno.land/std@0.34.0/mod.ts";';
  const expected = 'import "https://deno.land/std@0.35.0/mod.ts";';
  testUdd(contents, expected, [FakeDenoStd]);
});
