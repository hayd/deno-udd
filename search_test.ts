import { assertEquals } from "./test_deps.ts";
import { REGISTRIES } from "./registry.ts";
import { importUrls } from "./search.ts";

Deno.test("denolandImports", () => {
  const expected = [
    "https://deno.land/std@0.35.0/foo.ts",
    "https://deno.land/x/foo@0.35.0/foo.ts",
    "npm:preact@10.11.2",
    "npm:preact@10.11.2/",
  ];
  //   const ts = `
  // import { foo } from "${expected[0]}";
  // import { bar } from "${expected[1]}";
  // `;
  const ts = `
import { foo } from "https://deno.land/std@0.35.0/foo.ts";
import { bar } from "https://deno.land/x/foo@0.35.0/foo.ts";
export * as preact from "npm:preact@10.11.2";
export * as hooks from "npm:preact@10.11.2/hooks";
`;

  const urls = importUrls(ts, REGISTRIES);
  urls.sort();
  assertEquals(urls, expected);
});
