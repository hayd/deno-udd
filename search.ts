interface DenoInfo {
  roots: string[];
  modules: DenoModule[];
}
interface DenoModule {
  specifier: string;
  dependencies: DenoDependency[];
}
interface DenoDependency {
  code: {
    specifier: string;
    span: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
  };
}

async function getDenoInfo(targetFile: string) {
  const p = Deno.run({
    cmd: ["deno", "info", "--json", targetFile],
    stdout: "piped",
  });
  const denoInfo: DenoInfo = await p.output().then((o) =>
    JSON.parse(new TextDecoder().decode(o))
  );
  p.close();
  return denoInfo;
}

export async function importUrls(
  targetFile: string,
): Promise<string[]> {
  const denoInfo = await getDenoInfo(targetFile);

  const roots = denoInfo.roots;
  // NOTE: When can we have more then one root ?
  const root = roots[0];

  const targetModule = denoInfo.modules.find((m) => m.specifier === root);
  if (!targetModule) return [];

  const remoteDependencies = targetModule.dependencies.filter((d) => {
    const protocol = new URL(d.code.specifier).protocol;
    return protocol === "https:" || protocol === "npm:";
  });

  // NOTE: DenoDependency has the exact location of the import (span field)
  // Can we use that information for replace ? should we ?
  return remoteDependencies.map((rd) => decodeURI(rd.code.specifier));
}
