import { Progress, SilentProgress } from "./progress.ts";
import { importUrls } from "./search.ts";
import * as semver from "https://deno.land/std@0.167.0/semver/mod.ts";
import { lookup, REGISTRIES, RegistryCtor, RegistryUrl } from "./registry.ts";

// FIXME we should catch ctrl-c etc. and write back the original deps.ts

export async function udd(
  filename: string,
  options: UddOptions,
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

  _registries?: RegistryCtor[];
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
  private registries: RegistryCtor[];

  constructor(
    filename: string,
    options: UddOptions,
  ) {
    this.filename = filename;
    this.options = options;
    this.registries = options._registries || REGISTRIES;
    // deno-lint-ignore require-await
    this.test = options.test || (async () => undefined);
    this.progress = options.quiet ? new SilentProgress(1) : new Progress(1);
  }

  async content(): Promise<string> {
    const decoder = new TextDecoder();
    return decoder.decode(await Deno.readFile(this.filename));
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
    url: RegistryUrl,
  ): Promise<UddResult> {
    const initUrl: string = url.url;
    const initVersion: string = url.version();
    await this.progress.log(`Looking for releases: ${url.url}`);
    const versions = await url.all();

    let newVersion;
    // look for npm modifiers
    if (initVersion[0].match(/^[\~\^\=\<]/)) {
      newVersion = versions.find((version) =>
        semver.satisfies(version, initVersion)
      );
    } else {
      // use the latest version
      // versions is sorted by newest
      newVersion = versions[0];
    }

    // look for udd modifiers
    const uddModifier = url.url.split("#").at(1)?.replaceAll(" ", "");
    if (uddModifier) {
      try {
        new semver.SemVer(uddModifier.slice(1));
      } catch {
        return {
          initVersion,
          initUrl,
          message: `invalid semver fragment: ${uddModifier}`,
        };
      }

      newVersion = versions.find(function (version) {
        return semver.satisfies(version, uddModifier);
      });
    }

    if (!newVersion) {
      return {
        initVersion,
        initUrl,
        message: "no compatible version found",
      };
    }

    let failed = false;
    if (!this.options.dryRun) {
      await this.progress.log(`Attempting update: ${url.url} -> ${newVersion}`);
      failed = await this.maybeReplace(url, newVersion, initUrl);
      const msg = failed ? "failed" : "successful";
      await this.progress.log(`Update ${msg}: ${url.url} -> ${newVersion}`);
    }
    return {
      initUrl,
      initVersion,
      message: newVersion,
      success: !failed,
    };
  }

  // Note: we pass initUrl because it may have been modified with fragments :(
  async maybeReplace(
    url: RegistryUrl,
    newVersion: string,
    initUrl: string,
  ): Promise<boolean> {
    const newUrl = url.at(newVersion).url;
    await this.replace(initUrl, newUrl);

    const failed = await this.test().then((_) => false).catch((_) => true);
    if (failed) {
      await this.replace(newUrl, initUrl);
    }
    return failed;
  }

  async replace(left: string, right: string) {
    const content = await this.content();
    const newContent = content.split(left).join(right);
    const encoder = new TextEncoder();
    await Deno.writeFile(this.filename, encoder.encode(newContent));
  }
}
