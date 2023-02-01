import {
  createGraph,
  ModuleGraph,
} from "https://deno.land/x/deno_graph@0.40.0/mod.ts";
import { ResolvedDependency } from "https://deno.land/x/deno_graph@0.40.0/lib/types.d.ts";

async function getRemoteDependencies(root: string) {
  const seen = new Set<string>();
  const result: Record<string, ResolvedDependency[]> = {};

  function getDeps(
    graph: ModuleGraph,
    specifier: string,
  ) {
    if (new URL(specifier).protocol !== "file:") {
      // It makes things easier to reason about
      throw "Searching for dependencies inside of a remote file is not supported";
    }

    if (seen.has(specifier)) {
      // It's already checked.
      return undefined;
    }

    const { dependencies } = graph.get(specifier)!.toJSON();
    if (dependencies) {
      for (const { code, type } of dependencies) {
        if (code?.specifier === undefined) continue;

        if (new URL(code.specifier).protocol === "file:") {
          // this is a local dependency, so we need to check if it has remote dependencies inside of it
          getDeps(
            graph,
            code?.specifier ?? type?.specifier!,
          );
        } else {
          // This is what we're looking for
          // remote dependencies inside of a local file
          result[specifier] = result[specifier]
            ? [...result[specifier], code]
            : [code];
        }
      }
    }
    seen.add(specifier);
  }
  getDeps(await createGraph(root), root);

  return result;
}
export async function importUrls(
  targetFile: string,
) {
  const root = `${new URL(targetFile, import.meta.url)}`;
  const remoteDeps = await getRemoteDependencies(root);

  return remoteDeps[root]
    .map((dep) => dep.specifier)
    .map((specifier) => specifier ? decodeURI(specifier) : undefined)
    .filter((s) => s) as string[]; // ignore empty specifiers
}
