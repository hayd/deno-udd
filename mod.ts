import { decode, encode, colors } from "./deps.ts";
import { Progress } from "./progress.ts";
import { importUrls } from "./search.ts";
import { REGISTRIES, registry, RegistryUrl } from "./registry.ts";

// FIXME we should catch ctrl-c etc. and write back the original deps.ts

export async function udd(
  filename: string,
  test: () => Promise<void>,
  options: UddOptions,
  // FIXME don't use any[] here
  registries: any[] = REGISTRIES
): Promise<UddResult[]> {
  const u = new Udd(filename, test, options, registries);
  return await u.run();
}

export interface UddOptions {
  dryRun: boolean;
}

export interface UddResult {
  initUrl: string;
  initVersion: string;
  newVersion?: string;
  success?: boolean;
}

export class Udd {
  private filename: string;
  private test: () => Promise<void>;
  private options: UddOptions;
  private progress: Progress;
  private registries: any[];

  constructor(
    filename: string,
    test: () => Promise<void>,
    options: UddOptions,
    registries: any[]
  ) {
    this.filename = filename;
    this.test = test;
    this.options = options;
    this.registries = registries;
    this.progress = new Progress(1);
  }

  async content(): Promise<string> {
    return decode(await Deno.readFile(this.filename));
  }

  async run(): Promise<UddResult[]> {
    const content: string = await this.content();

    const urls: string[] = importUrls(content, this.registries);
    this.progress.n = urls.length;

    // from a url we need to extract the current version
    const results: UddResult[] = [];
    for (const [i, u] of urls.entries()) {
      this.progress.step = i;
      const v = registry(u, this.registries);
      if (v !== undefined) {
        results.push(await this.update(v!));
      }
    }
    return results;
  }

  async update(
    url: RegistryUrl
  ): Promise<UddResult> {
    const initVersion = url.version();
    await this.progress.log(`Looking for releases: ${url.url}`);
    const versions = await url.all();

    if (initVersion === versions[0]) {
      // already at latest version, skip!
      await this.progress.log(`Using latest: ${url.url}`);
      return { initUrl: url.url, initVersion };
    }

    // TODO: options: try latest, semver compat, or input
    // pick a new version (should be in for loop?)
    // i.e. rety or skip if fails

    // for now, let's pick the most recent!
    const newVersion = versions[0];

    // console.log("  Current version:", url.current());
    // console.log("  Available versions:", versions.join(","));

    await this.progress.log(`Attempting update: ${url.url} -> ${newVersion}`);
    const failed: boolean = await this.maybeReplace(url, newVersion);
    const msg = failed ? "failed" : "successful";
    await this.progress.log(`Update ${msg}: ${url.url} -> ${newVersion}`);
    return {
      initUrl: url.url,
      initVersion,
      newVersion,
      success: !failed
    };
  }

  async maybeReplace(
    url: RegistryUrl,
    newVersion: string
  ): Promise<boolean> {
    const newUrl = url.at(newVersion);
    await this.replace(url, newUrl);

    const failed = await this.test().then(_ => false).catch(_ => true);
    if (failed || this.options.dryRun) {
      await this.replace(newUrl, url);
    }
    return failed;
  }

  async replace(url: RegistryUrl, newUrl: RegistryUrl) {
    const content = await this.content();
    const newContent = content.split(url.url).join(newUrl.url);
    await Deno.writeFile(this.filename, encode(newContent));
  }
}
