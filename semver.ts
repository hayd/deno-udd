// Rolling our own until deno.land/x/semver is strict...

// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
// we also allow v? at the beginning since this is prevalent...
const regex =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function semver(version: string): Semver | undefined {
  try {
    return new Semver(version);
  } catch {
    return;
  }
}

export class Semver {
  version: string;
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  buildmetadata?: string;

  constructor(version: string) {
    const m = version.match(regex);
    if (m === null) {
      throw new Error("Not valid semver");
    }
    const [_, major, minor, patch, prerelease, buildmetadata] = m!;
    this.version = version;
    this.major = parseInt(major)!;
    this.minor = parseInt(minor)!;
    this.patch = parseInt(patch)!;
    this.prerelease = prerelease;
    this.buildmetadata = buildmetadata;
  }

  caret(other: Semver): boolean {
    return this.major === other.major;
  }

  eq(other: Semver): boolean {
    return this.version == other.version;
  }

  lt(other: Semver): boolean {
    if (this.major < other.major) return true;
    if (this.major > other.major) return false;

    if (this.minor < other.minor) return true;
    if (this.minor > other.minor) return false;

    if (this.patch < other.patch) return true;
    if (this.patch > other.patch) return false;

    // This is clearly wrong...
    if (this.prerelease === undefined) return false;
    if (other.prerelease === undefined) return false;
    if (this.prerelease < other.prerelease) return true;
    if (this.prerelease > other.prerelease) return false;

    if (this.buildmetadata === undefined) return false;
    if (other.buildmetadata === undefined) return false;
    if (this.buildmetadata < other.buildmetadata) return true;
    if (this.buildmetadata > other.buildmetadata) return false;

    return false;
  }

  tilde(other: Semver): boolean {
    if (this.major !== other.major) return false;
    if (this.major === 0 && other.major === 0) return true;

    if (this.minor === other.minor) return true;
    // we're not supporting prerelease and buildmetadata?
    return false;
  }

  _(token: string, other: Semver): boolean {
    switch (token) {
      case "~":
        return this.tilde(other);
      case "^":
        return this.caret(other);
      case "<":
        return this.lt(other);
      // the rest of these are superfluous...
      case "<=":
        return this.eq(other) || this.lt(other);
      case ">":
        return !(this.eq(other) || this.lt(other));
      case ">=":
        return !this.lt(other);
      case "=":
        return this.eq(other);
      default:
        throw new Error(`modifier token not recognized: ${token}`);
    }
  }
}

export function fragment(
  url: string,
  version: string,
):
  | ((other: Semver) => boolean)
  | undefined {
  const tokens = /^(~|\^|<|<=|>|>=|=)\s*(.*?)$/;
  const f = url.split("#")[1];
  if (f === undefined) return;
  const m = f.trim().match(tokens);
  if (m === null) throw new SyntaxError(`invalid semver fragment: ${f}`);
  const [_, t, v] = m;
  try {
    const s = new Semver(v || version);
    // we have to reverse this due to the way fragments work...
    return (other: Semver) => other._(t, s);
  } catch (e) {
    throw new SyntaxError(`invalid semver version: ${v || version}`);
  }
}
