# Update Deno Dependencies

Run this script to update your dependency urls to the latest published versions.

![deno-udd](https://user-images.githubusercontent.com/1931852/76134819-37add280-5fd6-11ea-96c3-adbd57cfa68c.jpg)

Prior to updating each url, the updater optionally runs the passed --test(s)
to ensure that updating is non-breaking.

![ci-status](https://github.com/hayd/deno-udd/workflows/ci/badge.svg)

## Installation

Use deno [`install`](https://deno.land/std/manual.md#installing-executable-scripts) command:

```sh
deno install -A -f udd https://deno.land/x/udd@0.1.0/main.ts
```
_You may need to include the deno bin directory in your PATH._

## Usage

For example, suppos to update url imports inside `deps.ts` run:

```sh
udd deps.ts
```

To ensure that `deno test` doesn't error before updating each dependency:

```sh
udd deps.ts --test="deno test"
```

## Example

```ts
// deps.ts (before)
export { decode } from "https://deno.land/std@v0.34.0/strings/decode.ts";
```

Running udd looks up the std versions to see that there is a more recent std release.

```ts
// deps.ts (after)
export { decode } from "https://deno.land/std@v0.35.0/strings/decode.ts";
```

## Semantic version notation

If you append a fragment `#${token}${version}` to your urls you can manage their update behavior:

| Token | Name | udd updates to the latest version such that |
| :---  | :--- |     ---: |
| ^ | Compatible    | major version is the same (if major=0 then same minor version) |
| ~ | Approximately | major and minor version are the same |
| < | Less than     | less than the provided version |
| = | Equal         | it's exactly this version |

The version argument is options for `^`, `~` and `=` (the version passed is the version in the url).

### Examples

```ts
// deps.ts (before)
export { Application } from "https://deno.land/x/oak@v2.4.0/mod.ts#^";
export { decode } from "https://deno.land/std@v0.34.0/strings/decode.ts#=";
export { Application } from "https://deno.land/x/abc@v0.1.10/mod.ts#<0.2.0";
export { encode } from "https://deno.land/std@v0.34.0/strings/encode.ts#~";
```

Running udd:

```ts
// deps.ts (after)
export { Application } from "https://deno.land/x/oak@v2.10.0/mod.ts#^";
export { decode } from "https://deno.land/std@v0.34.0/strings/decode.ts#=";
export { Application } from "https://deno.land/x/abc@v0.1.11/mod.ts#<0.2.0";
export { encode } from "https://deno.land/std@v0.35.0/strings/encode.ts#~";
```

## Supported domains

udd supports the following registry domains:

- https://deno.land/std
- https://deno.land/x
- https://unpkg.com
- https://denopkg.com

_Create an issue to request additional registries._

---

_Logo by [Drake Sauer](http://clipart-library.com/clipart/6ir6AMoKT.htm)._
