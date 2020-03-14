import { decode, encode, colors } from "./deps.ts";
import { Progress, SilentProgress } from "./progress.ts";
import { importUrls } from "./search.ts";
import { Semver, fragment, semver } from "./semver.ts";
import { REGISTRIES, RegistryUrl, lookup } from "./registry.ts";

// FIXME we should catch ctrl-c etc. and write back the original deps.ts

export async function udd(
  filename: string,
  options: UddOptions
): Promise<UddResult[]> {
  const u = new Udd(filename, options);
  return await u.run();
}

export interface UddOptions {
  // don't permanently edit files
  dryRun?: boolean;
  // don't print progress messages
  quiet?: boolean;
  // if this function errors then the update is reverted
  test?: () => Promise<void>;

  _registries?: any[];
}

export interface UddResult {
  initUrl: string;
  initVersion: string;
  message?: string;
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
    options: UddOptions
  ) {
    this.filename = filename;
    this.options = options;
    this.registries = options._registries || REGISTRIES;
    this.test = options.test || (async () => undefined);
    this.progress = options.quiet ? new SilentProgress(1) : new Progress(1);
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
      const v = lookup(u, this.registries);
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

    // for now, let's pick the most recent!
    let newVersion = versions[0];

    // if we pass a fragment with semver
    let filter: ((other: Semver) => boolean) | undefined = undefined;
    try {
      filter = fragment(url.url, url.version());
    } catch (e) {
      if (e instanceof SyntaxError) {
        return {
          initUrl: url.url,
          initVersion,
          success: false,
          message: e.message
        };
      } else {
        throw e;
      }
    }
    // potentially we can shortcut if fragment is #=${url.version()}...
    if (filter !== undefined) {
      const compatible: string[] = versions.map(semver).filter(x =>
        x !== undefined
      ).map(x => x!).filter(filter).map(x => x.version);
      if (compatible.length === 0) {
        return {
          initUrl: url.url,
          initVersion,
          success: false,
          message: "no compatible version found"
        };
      }
      newVersion = compatible[0];
    }

    if (initVersion === newVersion) {
      await this.progress.log(`Using latest: ${url.url}`);
      return { initUrl: url.url, initVersion };
    }

    await this.progress.log(`Attempting update: ${url.url} -> ${newVersion}`);
    const failed: boolean = await this.maybeReplace(url, newVersion);
    const msg = failed ? "failed" : "successful";
    await this.progress.log(`Update ${msg}: ${url.url} -> ${newVersion}`);
    return {
      initUrl: url.url,
      initVersion,
      message: newVersion,
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
