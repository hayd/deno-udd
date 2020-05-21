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

// Link header format: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Link
function parseLinkHeader(res: Response): Record<string, string> {
  const linkMap: Record<string, string> = {}
  const headerValue = res.headers.get("link");
  if (headerValue == null) {
    return linkMap;
  }

  const links = headerValue.split(",");
  for (const link of links) {
    const match = link.match(/<(.+)>; rel="(.+)"/);
    if (match) {
      linkMap[match[2]] = match[1];
    }
  }
  return linkMap;
}

// export for testing purposes
// FIXME this should really be lazy, we shouldn't always iterate everything...
export const CACHE: Map<string, string[]> = new Map<string, string[]>();
async function fetchReleases(
  url: string,
  cacheKey: string,
  cache: Map<string, string[]>
): Promise<string[]> {
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // FIXME do we need to handle 404?
  let res = await fetch(url);
  let links = parseLinkHeader(res);
  let tags: { name: string }[] = await res.json();
  console.log(tags.length, "tags");
  const versions = tags.map(tag => tag.name);

  // arbitrarily fetch only 3 pages
  let i = 0;
  while (links.next && i < 3) {
    res = await fetch(links.next);
    tags = await res.json();
    links = parseLinkHeader(res);
    versions.push(...tags.map(tag => tag.name));
  }

  cache.set(cacheKey, versions);
  return versions;
}

function githubReleases(
  owner: string,
  repo: string,
  cache: Map<string, string[]> = CACHE,
): Promise<string[]> {
  return fetchReleases(
    `https://api.github.com/repos/${owner}/${repo}/tags`,
    `github:${owner}/${repo}`,
    cache,
  );
}

function gitlabReleases(
  owner: string,
  repo: string,
  cache: Map<string, string[]> = CACHE,
): Promise<string[]> {
  return fetchReleases(
    `https://gitlab.com/api/v4/projects/${owner}%2F${repo}/repository/tags`,
    `gitlab:${owner}/${repo}`,
    cache,
  );
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
        "https://raw.githubusercontent.com/denoland/deno_website2/master/database.json";
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

export class GithubRaw implements RegistryUrl {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  all(): Promise<string[]> {
    const [,,, user, repo] = this.url.split("/") ;
    return githubReleases(user, repo);
  }

  at(version: string): RegistryUrl {
    const parts = this.url.split("/");
    parts[5] = version;
    return new GithubRaw(parts.join("/"));
  }

  version(): string {
    const v = this.url.split("/")[5];
    if (v === undefined) {
      throw Error(`Unable to find version in ${this.url}`);
    }
    return v;
  }

  regexp: RegExp = /https?:\/\/raw\.githubusercontent\.com\/[^\/\"\']+\/[^\/\"\']+\/(?!master)[^\/\"\']+\/[^\'\"]*/;
}

export class GitlabRaw implements RegistryUrl {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  all(): Promise<string[]> {
    const [,,, user, repo] = this.url.split("/") ;
    return gitlabReleases(user, repo);
  }

  at(version: string): RegistryUrl {
    const parts = this.url.split("/");
    parts[5] = version;
    return new GithubRaw(parts.join("/"));
  }

  version(): string {
    const v = this.url.split("/")[7];
    if (v === undefined) {
      throw Error(`Unable to find version in ${this.url}`);
    }
    return v;
  }

  regexp: RegExp = /https?:\/\/gitlab\.com\/[^\/\"\']+\/[^\/\"\']+\/-\/raw\/(?!master)[^\/\"\']+\/[^\'\"]*/;
}

export const REGISTRIES = [DenoStd, DenoLand, Unpkg, Denopkg, Jspm, Pika, GithubRaw, GitlabRaw];
