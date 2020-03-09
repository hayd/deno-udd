import { REGISTRIES, lookup } from "./registry.ts";
import { assert, assertEquals, FakeRegistry } from "./test_deps.ts";

Deno.test(function fakeregistry() {
  const url = "https://fakeregistry.com/foo@0.0.1/mod.ts";
  const v = lookup(url, [FakeRegistry]);
  assert(v !== undefined);
  const vAt = v!.at("0.0.2");
  assertEquals(vAt.url, "https://fakeregistry.com/foo@0.0.2/mod.ts");
});

Deno.test(function fakeregistryMissing() {
  const url = "https://fakeregistry.com/foo@0.0.1/mod.ts";
  const v = lookup(url, REGISTRIES);
  assert(v === undefined);
});

Deno.test(function denolandStdRegistry() {
  const url = "https://deno.land/std@0.35.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.1.0");
  assertEquals(vAt.url, "https://deno.land/std@0.1.0/foo.ts");
});

Deno.test(function denolandXRegistry() {
  const url = "https://deno.land/x/foo@0.1.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(vAt.url, "https://deno.land/x/foo@0.2.0/foo.ts");
});
