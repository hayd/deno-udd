import { decode, encode } from "./deps.ts";
import { importUrls } from "./search.ts";
import { versioned, Versioned } from "./versioned.ts";

// FIXME we should catch ctrl-c etc. and write back the original deps.ts

export async function update(
  filename: string,
  test: () => Promise<boolean>
): Promise<void> {
  const u = new Update(filename, test);
  await u.update();
}

export class Update {
  private filename: string;
  private test: () => Promise<boolean>;

  constructor(filename: string, test: () => Promise<boolean>) {
    this.filename = filename;
    this.test = test;
  }

  async update(): Promise<void> {
    // first we test the thunk works prior to updatng...
    if (await this.test()) {
      console.error("Tests failed prior to update");
      Deno.exit(1);
    }

    const content: string = await this.content(); // decode(await Deno.readFile(filename));

    const urls: string[] = importUrls(content);

    // from a url we need to extract the current version
    for (const u of urls) {
      const v = versioned(u);
      if (v !== undefined) {
        await this.updateOne(v!);
      }
    }
    // TODO count the imports that were updated
  }

  async updateOne(
    url: Versioned
  ): Promise<void> {
    // now we look up the available versions
    const versions = await url.all();
    console.log("current version:", url.current());
    console.log("available versions:", versions);

    // TODO: options: try latest, semver compat, or input
    // pick a new version (should be in for loop?)
    // i.e. rety or skip if fails

    // for now, let's pick the most recent!
    const newVersion = versions[0];
    if (url.current() === newVersion) {
      return;
    }
    const fails: boolean = await this.updateIfTestPasses(url, newVersion);
  }

  async updateIfTestPasses(
    url: Versioned,
    newVersion: string
  ): Promise<boolean> {
    const newUrl = url.at(newVersion);
    console.log("Updating to", newUrl.url);
    await this.replace(url, newUrl);

    console.log("Running tests...");
    if (await this.test()) {
      console.log("Test failed, reverting.");
      await this.replace(newUrl, url);
      return true;
    } else {
      console.log("Test passed.");
      return false;
    }
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
