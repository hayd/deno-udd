# Update Deno Dependencies

Run this script to update your dependency urls to the latest published versions.

![deno-udd](https://user-images.githubusercontent.com/1931852/76134819-37add280-5fd6-11ea-96c3-adbd57cfa68c.jpg)

Prior to updating each url, the updater optionally runs the passed --test(s)
to ensure that updating is non-breaking.

![ci-status](https://github.com/hayd/deno-udd/workflows/ci/badge.svg)

## Installation

Use deno [`install`](https://deno.land/std/manual.md#installing-executable-scripts) command:

```sh
deno install -A -f udd https://raw.githubusercontent.com/hayd/deno-udd/0.0.3/main.ts
```
_You may need to include the deno bin directory in your PATH._

## Usage

For example, suppos to update url imports inside `deps.ts` run:

```sh
udd deps.ts
```

To ensure that both `deno fetch main.ts` and `deno test` don't error:

```sh
udd deps.ts --test="deno fetch main.ts" --test="deno test"
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

## Supported domains

udd supports the following registry domains:

- https://deno.land/std
- https://deno.land/x
- https://unpkg.com
- https://denopkg.com

_Create an issue to request additional registries._

---

_Logo by [Drake Sauer](http://clipart-library.com/clipart/6ir6AMoKT.htm)._
