import { REGISTRIES, lookup } from "./registry.ts";
import { assert, assertEquals, FakeRegistry } from "./test_deps.ts";

Deno.test("registryFakeregistry", () => {
  const url = "https://fakeregistry.com/foo@0.0.1/mod.ts";
  const v = lookup(url, [FakeRegistry]);
  assert(v !== undefined);
  const vAt = v!.at("0.0.2");
  assertEquals(vAt.url, "https://fakeregistry.com/foo@0.0.2/mod.ts");
});

Deno.test("registryFakeregistryMissing", () => {
  const url = "https://fakeregistry.com/foo@0.0.1/mod.ts";
  const v = lookup(url, REGISTRIES);
  assert(v === undefined);
});

Deno.test("registryDenolandStd", () => {
  const url = "https://deno.land/std@0.35.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.1.0");
  assertEquals(vAt.url, "https://deno.land/std@0.1.0/foo.ts");
});

Deno.test("registryDenolandX", () => {
  const url = "https://deno.land/x/foo@0.1.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(vAt.url, "https://deno.land/x/foo@0.2.0/foo.ts");
});

Deno.test("registryUnpkg", () => {
  const url = "https://unpkg.com/foo@0.1.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(vAt.url, "https://unpkg.com/foo@0.2.0/foo.ts");
});

Deno.test("registryDenopkg", () => {
  const url = "https://denopkg.com/bar/foo@0.1.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(vAt.url, "https://denopkg.com/bar/foo@0.2.0/foo.ts");
});

Deno.test("registryJspm", () => {
  const url = "https://dev.jspm.io/npm:foo@0.1.0/";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(vAt.url, "https://dev.jspm.io/npm:foo@0.2.0/");
});

Deno.test("registryPika", () => {
  const url = "https://cdn.pika.dev/foo@0.1.0/";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(vAt.url, "https://cdn.pika.dev/foo@0.2.0/");
});

Deno.test("registryGithubRaw", () => {
  const url = "https://raw.githubusercontent.com/bar/foo/0.1.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(
    vAt.url,
    "https://raw.githubusercontent.com/bar/foo/0.2.0/foo.ts",
  );
});

Deno.test("registryGitlabRaw", () => {
  const url = "https://gitlab.com/bar/foo/-/raw/0.1.0/foo.ts";
  const v = lookup(url, REGISTRIES);
  assert(v !== undefined);

  const vAt = v.at("0.2.0");
  assertEquals(vAt.url, "https://gitlab.com/bar/foo/-/raw/0.2.0/foo.ts");
});
