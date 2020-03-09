import { RegistryUrl } from "./registry.ts";

// ideally we'd do some proper parsing here (is there a deno api here? swc? or deno info)

// FIXME use deno info once it has json output.

// given a ts/js string we want to find the import urls/
// note: these can span over multiple lines
// import "https?://deno.land/(std|x)@([^/"]?)/.*?"
// import { foo, bar } from "https?://deno.land/(std|x)@([^/"]?)/.*?"
export function importUrls(tsContent: string, registries: any[]): string[] {
  // for now let's just look up all the deno.land/x and deno.land/std links
  // [...tsContent.matchAll(/https?\:\/\/deno\.land\/(std|x)\@[^\'\"]*/g)]]
  // return tsContent.match(
  //   /https?\:\/\/deno\.land\/(std|x\/[^\/\"\']*?)\@[^\'\"]*/g
  // ) || [];
  const rs: RegExp[] = registries.map(R => new R("").regexp).map(re =>
    new RegExp(re, "g")
  );
  return rs.flatMap(regexp => tsContent.match(regexp) || []);
}
