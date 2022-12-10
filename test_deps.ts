import { defaultAt, defaultVersion, RegistryUrl } from "./registry.ts";
import { DenoLand } from "./registry.ts";

export {
  assert,
  assertEquals,
  assertThrows,
  assertThrowsAsync,
} from "https://deno.land/std@0.80.0/testing/asserts.ts";

export class FakeRegistry extends RegistryUrl {
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  // deno-lint-ignore require-await
  async all(): Promise<string[]> {
    return ["0.0.2", "0.0.1"];
  }

  at(version: string): RegistryUrl {
    const url = defaultAt(this, version);
    return new FakeRegistry(url);
  }

  version(): string {
    return defaultVersion(this);
  }

  regexp = /https?:\/\/fakeregistry.com\/[^\/\"\']*?\@[^\'\"]*/;
}

export class FakeDenoLand extends DenoLand {
  // deno-lint-ignore require-await
  async all(): Promise<string[]> {
    return ["0.35.0", "0.34.0"];
  }
}

export class FakeNpm extends RegistryUrl {
  url: string;
  parseRegex = /^npm:(\@[^/]+\/[^@/]+|[^@/]+)(?:\@([^/]+))?(.*)/;

  constructor(url: string) {
    super();
    this.url = url;
  }

  name(): string {
    const [, name] = this.url.match(this.parseRegex)!;

    return name;
  }

  at(version: string): RegistryUrl {
    const [, name, _, files] = this.url.match(this.parseRegex)!;
    const url = `npm:${name}@${version}${files}`;
    return new FakeNpm(url);
  }

  versionInner(): string {
    const [, _, version] = this.url.match(this.parseRegex)!;
    if (version === null) {
      throw Error(`Unable to find version in ${this.url}`);
    }
    return version;
  }

  regexp = /npm:(\@[^/]+\/[^@/]+|[^@/]+)(?:\@([^\/\"\']+))?[^\'\"]/;

  // deno-lint-ignore require-await
  async all(): Promise<string[]> {
    return ["6.6.6", "6.7.0", "7.0.0"];
  }
}
