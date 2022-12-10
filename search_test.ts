import { assertEquals } from "./test_deps.ts";
import { importUrls } from "./search.ts";

Deno.test("denolandImports", async () => {
  const expected = [
    "https://deno.land/std@0.35.0/foo.ts",
    "https://deno.land/x/foo@0.35.0/foo.ts",
    "npm:preact@10.11.2",
    "npm:preact@10.11.2/hooks",
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

  const dir = Deno.makeTempDirSync();
  Deno.writeTextFileSync(dir + "/a.ts", ts);
  const urls = await importUrls(dir + "/a.ts");
  urls.sort();
  assertEquals(urls, expected);
});
