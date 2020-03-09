// FIXME don't use any[]
export function registry(url: string, registries: any[]): RegistryUrl
  | undefined
{
  for (const R of registries) {
    const u = new R(url) as RegistryUrl;
    if (u.regexp.test(url)) {
      return u;
    }
  }
}

export interface RegistryUrl {
  url: string;
  // all versions of the url
  all: () => Promise<string[]>;
  // url at a given version
  at(version: string): RegistryUrl;
  // current version of url
  version: () => string;
  // is url valid for this RegistryUrl
  regexp: RegExp;
}

function defaultAt(that: RegistryUrl, version: string): string {
  return that.url.replace(/\@([^\/]*?)\//, `@${version}/`);
}

function defaultVersion(that: RegistryUrl): string {
  const v = that.url.match(/\@([^\/]*?)\//);
  if (v === null) {
    throw Error(`Unable to find version in ${that.url}`);
  }
  return v[1];
}

function defaultName(that: RegistryUrl): string {
  const n = that.url.match(/([^\/\"\']*?)\@[^\'\"]*/);
  if (n === null) {
    throw new Error(`Package name not found in ${that.url}`);
  }
  return n[1];
}

// export for testing purposes
export const GR_CACHE: Map<string, string[]> = new Map<string, string[]>();
async function githubReleases(
  owner: string,
  repo: string,
  cache: Map<string, string[]> = GR_CACHE
): Promise<string[]> {
  const cacheKey = `${owner}/${repo}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  const page = await fetch(
    `https://github.com/${owner}/${repo}/releases.atom`
  );
  const text = await page.text();
  // naively, we grab all the titles, except the first which is the page titleL
  const versions = [
    ...text.matchAll(
      /\<id\>tag\:github\.com\,2008\:Repository\/\d+\/(.*?)\<\/id\>/g
    )
  ].map(x => x[1]);
  cache.set(cacheKey, versions);
  return versions;
}

let denoLandDB: any;

class DenoLand implements RegistryUrl {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  name(): string {
    return defaultName(this);
  }

  async all(): Promise<string[]> {
    if (!denoLandDB) {
      const dbUrl =
        "https://raw.githubusercontent.com/denoland/deno_website2/master/src/database.json";
      denoLandDB = await (await fetch(dbUrl)).json();
    }
    let res: any;
    try {
      res = denoLandDB[this.name()];
    } catch {
      throw new Error(`${this.name()} not found in deno land json`);
    }

    const { type, owner, repo } = res;
    if (type !== "github") {
      throw new Error(`${this.name()} has unsupported type ${type}`);
    }

    return await githubReleases(owner, repo);
  }

  at(version: string): RegistryUrl {
    const url = defaultAt(this, version);
    return new DenoLand(url);
  }

  version(): string {
    return defaultVersion(this);
  }

  regexp: RegExp = /https?:\/\/deno.land\/x\/[^\/\"\']*?\@[^\'\"]*/;
}

class DenoStd implements RegistryUrl {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    return await githubReleases("denoland", "deno");
  }

  at(version: string): RegistryUrl {
    const url = defaultAt(this, version);
    return new DenoStd(url);
  }

  version(): string {
    return defaultVersion(this);
  }

  regexp: RegExp = /https?:\/\/deno.land\/std\@[^\'\"]*/;
}

class Unpkg implements RegistryUrl {
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
    const m = [...text.matchAll(/\<option value\=\"(.*?)\"\>/g)];
    m.reverse();
    return m.map(x => x[1]);
  }

  at(version: string): RegistryUrl {
    const url = defaultAt(this, version);
    return new Unpkg(url);
  }

  version(): string {
    return defaultVersion(this);
  }

  regexp: RegExp = /https?:\/\/unpkg.com\/[^\/\"\']*?\@[^\'\"]*/;
}

class Denopkg implements RegistryUrl {
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

  at(version: string): RegistryUrl {
    const url = defaultAt(this, version);
    return new Denopkg(url);
  }

  version(): string {
    return defaultVersion(this);
  }

  regexp: RegExp =
    /https?:\/\/denopkg.com\/[^\/\"\']*?\/[^\/\"\']*?\@[^\'\"]*/;
}

// TODO Pika

export const REGISTRIES = [DenoStd, DenoLand, Unpkg, Denopkg];
