import { RegistryUrl } from "./registry.ts";

// FIXME use deno info once it has json output?

// given a ts/js string we want to find the import urls/
// note: these can span over multiple lines
// import "https?://deno.land/(std|x)@([^/"]?)/.*?"
// import { foo, bar } from "https?://deno.land/(std|x)@([^/"]?)/.*?"

export function importUrls(tsContent: string, registries: any[]): string[] {
  // look up all the supported regex matches.
  const rs: RegExp[] = registries.map((R) => new R("").regexp).map((re) =>
    new RegExp(re, "g")
  );
  return rs.flatMap((regexp) => tsContent.match(regexp) || []);
}
