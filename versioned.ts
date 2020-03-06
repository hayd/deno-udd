export function versioned(url: string): Versioned | undefined {
  if (DENO_LAND.test(url)) {
    return new DenoLand(url) as Versioned;
  }
  if (DENO_STD.test(url)) {
    return new DenoStd(url) as Versioned;
  }
  if (UNPKG.test(url)) {
    return new Unpkg(url) as Versioned;
  }
  if (DENOPKG.test(url)) {
    return new Denopkg(url) as Versioned;
  }
}

export interface Versioned {
  url: string;
  // all versions of the url
  all: () => Promise<string[]>;
  // url at a given version
  at(version: string): Versioned;
  // current version of url
  current: () => string;
}

function defaultAt(that: Versioned, version: string): string {
  return that.url.replace(/\@([^\/]*?)\//, `@${version}/`);
}

function defaultCurrent(that: Versioned): string {
  const v = that.url.match(/\@([^\/]*?)\//);
  if (v === null) {
    throw Error(`Unable to find version in ${that.url}`);
  }
  return v[1];
}

function defaultName(that: Versioned): string {
  const n = that.url.match(/([^\/\"\']*?)\@[^\'\"]*/);
  if (n === null) {
    throw new Error(`Package name not found in ${that.url}`);
  }
  return n[1];
}

async function githubReleases(owner: string, repo: string): Promise<string[]> {
  const page = await fetch(`http://github.com/${owner}/${repo}/releases.atom`);
  const text = await page.text();
  // naively, we grab all the titles, except the first which is the page titleL
  const m = text.matchAll(/<title>(.*?)\<\/title\>/g);
  return [...m].map(x => x[1]).slice(1);
}

let denoLandJson: any;

// FIXME use the full url then we can export this in search...
const DENO_LAND = /https?:\/\/deno.land\/x\/[^\/\"\']*?\@[^\'\"]*/;
class DenoLand implements Versioned {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  name(): string {
    return defaultName(this);
  }

  async all(): Promise<string[]> {
    if (!denoLandJson) {
      const jsonUrl =
        "https://raw.githubusercontent.com/denoland/deno_website2/master/src/database.json";
      denoLandJson = await (await fetch(jsonUrl)).json();
    }
    let res: any;
    try {
      res = denoLandJson[this.name()];
    } catch {
      throw new Error(`${this.name()} not found in deno land json`);
    }

    const { typ, owner, repo } = res;
    if (typ === "github") {
      throw new Error(`${this.name()} has unsupported type ${typ}`);
    }

    return await githubReleases(owner, repo);
  }

  at(version: string): Versioned {
    const url = defaultAt(this, version);
    return new DenoLand(url);
  }

  current(): string {
    return defaultCurrent(this);
  }
}

const DENO_STD = /https?:\/\/deno.land\/std\@[^\'\"]*/;
class DenoStd implements Versioned {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    return await githubReleases("denoland", "deno");
  }

  at(version: string): Versioned {
    const url = defaultAt(this, version);
    return new DenoStd(url);
  }

  current(): string {
    return defaultCurrent(this);
  }
}

const UNPKG = /https?:\/\/unpkg.com\/[^\/\"\']*?\@[^\'\"]*/;
class Unpkg implements Versioned {
  url: string;

  name(): string {
    return defaultName(this);
  }

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    const page = await fetch(`https://unpkg.com/browse/${this.name()}/`);
    const text = await page.text();
    // naively, we grab all the titles, except the first which is the page titleL
    const m = text.matchAll(/\<option value\=\"(.*?)\"\>/g);
    return [...m].map(x => x[1]);
  }

  at(version: string): Versioned {
    const url = defaultAt(this, version);
    return new Unpkg(url);
  }

  current(): string {
    return defaultCurrent(this);
  }
}

const DENOPKG = /https?:\/\/denopkg.com\/[^\/\"\']*?\/[^\/\"\']*?\@[^\'\"]*/;
class Denopkg implements Versioned {
  url: string;

  owner(): string {
    return this.url.split("/")[3];
  }

  repo(): string {
    return defaultName(this);
  }

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    return await githubReleases(this.owner(), this.repo());
  }

  at(version: string): Versioned {
    const url = defaultAt(this, version);
    return new Denopkg(url);
  }

  current(): string {
    return defaultCurrent(this);
  }
}

// TODO Pika

export const SUPPORTED_URLS = [DENO_STD, DENO_LAND, UNPKG, DENOPKG];
