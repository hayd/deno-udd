// FIXME don't use any[]
export function lookup(url: string, registries: any[]):
  | RegistryUrl
  | undefined {
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

export function defaultAt(that: RegistryUrl, version: string): string {
  return that.url.replace(/@(.*?)(\/|$)/, `@${version}/`);
}

export function defaultVersion(that: RegistryUrl): string {
  const v = that.url.match(/\@([^\/]+)[\/$]?/);
  if (v === null) {
    throw Error(`Unable to find version in ${that.url}`);
  }
  return v[1];
}

export function defaultName(that: RegistryUrl): string {
  const n = that.url.match(/([^\/\"\']*?)\@[^\'\"]*/);
  if (n === null) {
    throw new Error(`Package name not found in ${that.url}`);
  }
  return n[1];
}

async function githubDownloadRelases(
  owner: string,
  repo: string,
  lastVersion: string | undefined = undefined,
): Promise<string[]> {
  let url = `https://github.com/${owner}/${repo}/releases.atom`;
  if (lastVersion) {
    url += `?${lastVersion}`;
  }
  // FIXME do we need to handle 404?

  const page = await fetch(url);
  const text = await page.text();
  return [
    ...text.matchAll(
      /\<id\>tag\:github\.com\,2008\:Repository\/\d+\/(.*?)\<\/id\>/g,
    ),
  ].map((x) => x[1]);
}

// export for testing purposes
// FIXME this should really be lazy, we shouldn't always iterate everything...
export const GR_CACHE: Map<string, string[]> = new Map<string, string[]>();
async function githubReleases(
  owner: string,
  repo: string,
  cache: Map<string, string[]> = GR_CACHE,
): Promise<string[]> {
  const cacheKey = `${owner}/${repo}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }
  const versions = await githubDownloadRelases(owner, repo);
  if (versions.length === 10) {
    let lastVersion: string | undefined = undefined;
    // arbitrarily we're going to limit to 5 pages...?
    let i: number = 0;
    while (lastVersion !== versions[versions.length - 1] && i < 5) {
      i++;
      lastVersion = versions[versions.length];
      versions.push(...await githubDownloadRelases(owner, repo, lastVersion));
    }
  }
  cache.set(cacheKey, versions);
  return versions;
}

let denoLandDB: any;

export class DenoLand implements RegistryUrl {
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

export class DenoStd implements RegistryUrl {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    const denoReleases = await githubReleases("denoland", "deno");
    return denoReleases
      .filter((x) => x.startsWith("std/"))
      .map((x) => "v" + x.split("/")[1])
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

async function unpkgVersions(name: string): Promise<string[]> {
  const page = await fetch(`https://unpkg.com/browse/${name}/`);
  const text = await page.text();
  // naively, we grab all the options
  const m = [...text.matchAll(/\<option[^\<\>]* value\=\"(.*?)\"\>/g)];
  m.reverse();
  return m.map((x) => x[1]);
}

export class Unpkg implements RegistryUrl {
  url: string;

  name(): string {
    return defaultName(this);
  }

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    return await unpkgVersions(this.name());
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

export class Jspm implements RegistryUrl {
  url: string;

  name(): string {
    return defaultName(this);
  }

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    return await unpkgVersions(this.name());
  }

  at(version: string): RegistryUrl {
    const url = defaultAt(this, version);
    return new Jspm(url);
  }

  version(): string {
    return defaultVersion(this);
  }

  regexp: RegExp = /https?:\/\/dev.jspm.io\/[^\/\"\']*?\@[^\'\"]*/;
}

export class Denopkg implements RegistryUrl {
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

  regexp: RegExp = /https?:\/\/denopkg.com\/[^\/\"\']*?\/[^\/\"\']*?\@[^\'\"]*/;
}

// TODO Pika

export class Pika implements RegistryUrl {
  url: string;

  name(): string {
    return defaultName(this);
  }

  constructor(url: string) {
    this.url = url;
  }

  async all(): Promise<string[]> {
    return await unpkgVersions(this.name());
  }

  at(version: string): RegistryUrl {
    const url = defaultAt(this, version);
    return new Pika(url);
  }

  version(): string {
    return defaultVersion(this);
  }

  regexp: RegExp = /https?:\/\/cdn.pika.dev(\/\_)?\/[^\/\"\']*?\@[^\'\"]*/;
}

export const REGISTRIES = [DenoStd, DenoLand, Unpkg, Denopkg, Jspm, Pika];
