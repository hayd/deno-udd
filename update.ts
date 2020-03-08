import { decode, encode, colors } from "./deps.ts";
import { Progress } from "./progress.ts";
import { importUrls } from "./search.ts";
import { versioned, Versioned } from "./versioned.ts";

// FIXME we should catch ctrl-c etc. and write back the original deps.ts

export async function update(
  filename: string,
  test: () => Promise<boolean>,
  options: UpdateOptions
): Promise<UpdateResult[]> {
  const u = new Update(filename, test, options);
  return await u.update();
}

export interface UpdateOptions {
  dryRun: boolean;
}

export interface UpdateResult {
  initUrl: string;
  initVersion: string;
  newVersion?: string;
  success?: boolean;
}

export class Update {
  private filename: string;
  private test: () => Promise<boolean>;
  private options: UpdateOptions;
  private progress: Progress;

  constructor(
    filename: string,
    test: () => Promise<boolean>,
    options: UpdateOptions
  ) {
    this.filename = filename;
    this.test = test;
    this.options = options;
    this.progress = new Progress(1);
  }

  async update(): Promise<UpdateResult[]> {
    const content: string = await this.content();

    const urls: string[] = importUrls(content);
    this.progress.n = urls.length;

    // from a url we need to extract the current version
    const results: UpdateResult[] = [];
    for (const [i, u] of urls.entries()) {
      this.progress.step = i;
      const v = versioned(u);
      if (v !== undefined) {
        // this.progress.log(`Updating ${u}`)
        results.push(await this.updateOne(v!));
      }
    }
    return results;
  }

  async updateOne(
    url: Versioned
  ): Promise<UpdateResult> {
    // now we look up the available versions
    const versions = await url.all();

    // console.log(colors.bold(url.url));
    if (url.current() === versions[0]) {
      // already at latest version, skip!
      await this.progress.log(`Using latest: ${url.url}`);
      // console.log();
      return { initUrl: url.url, initVersion: url.current() };
    }

    // TODO: options: try latest, semver compat, or input
    // pick a new version (should be in for loop?)
    // i.e. rety or skip if fails

    // for now, let's pick the most recent!
    const newVersion = versions[0];

    // console.log("  Current version:", url.current());
    // console.log("  Available versions:", versions.join(","));

    await this.progress.log(`Updating: ${url.url} -> ${newVersion}`);
    const fails: boolean = await this.updateIfTestPasses(url, newVersion);
    return {
      initUrl: url.url,
      initVersion: url.current(),
      newVersion,
      success: !fails
    };
    // console.log();
  }

  async updateIfTestPasses(
    url: Versioned,
    newVersion: string
  ): Promise<boolean> {
    const newUrl = url.at(newVersion);
    // console.log("  Updating to", newUrl.url);
    await this.replace(url, newUrl);

    const fails = await this.test();
    if (fails || this.options.dryRun) {
      await this.replace(newUrl, url);
    }
    return fails;
  }

  async content(): Promise<string> {
    return decode(await Deno.readFile(this.filename));
  }

  async replace(url: Versioned, newUrl: Versioned) {
    const content = await this.content();
    const newContent = content.split(url.url).join(newUrl.url);
    await Deno.writeFile(this.filename, encode(newContent));
  }
}
