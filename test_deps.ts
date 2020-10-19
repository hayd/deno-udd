import { RegistryUrl, defaultAt, defaultVersion } from "./registry.ts";
import { DenoLand } from "./registry.ts";

export {
  assert,
  assertEquals,
  assertThrows,
  assertThrowsAsync,
} from "https://deno.land/std@v0.61.0/testing/asserts.ts";

export class FakeRegistry implements RegistryUrl {
  url: string;

  constructor(url: string) {
    this.url = url;
  }

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

  regexp: RegExp = /https?:\/\/fakeregistry.com\/[^\/\"\']*?\@[^\'\"]*/;
}

export class FakeDenoLand extends DenoLand {
  async all(): Promise<string[]> {
    return ["0.35.0", "0.34.0"];
  }
}
