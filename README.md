# Update Deno Dependencies

Run this script to update your dependency urls to their latest published versions.
Optionally run --test(s) to ensure that each dependency update is non-breaking.

![deno-udd](https://user-images.githubusercontent.com/1931852/76134819-37add280-5fd6-11ea-96c3-adbd57cfa68c.jpg)


![ci-status](https://github.com/hayd/deno-udd/workflows/ci/badge.svg)

Note: udd is **fundamentally different** from something like npm or yarn.
Other tools do a "distributed update" i.e. _every user updates_ independently
(and potentially to untested versions/configurations of dependencies).
With udd precisely _one person updates_ (a maintainer), and they can ensure that
the new dependencies pass the test suite before commiting/releasing a new version.
With udd every user has a fixed version of the dependencies.

[Semantic versioning fragments](https://github.com/hayd/deno-udd#semantic-versioning)
are _purely_ a convenience for the maintainer, and do not affect users.

## Installation

Use deno [`install`](https://deno.land/std/manual.md#installing-executable-scripts) command:

```sh
deno install -A -f -n udd https://deno.land/x/udd@0.2.0/main.ts
```
_You may need to include the deno bin directory in your PATH._

## Usage

For example, to update url imports inside `deps.ts` run:

```sh
udd deps.ts
```

To update all the ts files in your directory:
```sh
udd *.ts
```

To ensure that `deno test` is successful when updating each dependency:

```sh
udd deps.ts --test="deno test"
```

## Semantic versioning

If you append a fragment `#${token}${version}` to your urls you can manage their update behavior:

| Token | Name | udd updates to the latest version such that |
| :---  | :--- |     ---: |
| ^ | Compatible    | major version is the same (if major=0 then same minor version) |
| ~ | Approximately | major and minor version are the same (or both major=0) |
| < | Less than     | less than the provided version |
| = | Equal         | it's exactly this version |

The version argument is optional for `^`, `~` and `=` (the version passed is the version in the url).

### Examples

```diff
-export { Application } from "https://deno.land/x/oak@v2.4.0/mod.ts#^";
+export { Application } from "https://deno.land/x/oak@v2.10.0/mod.ts#^";  // 3.x.y is not chosen

-export { decode } from "https://deno.land/std@v0.34.0/strings/decode.ts#=";
+export { decode } from "https://deno.land/std@v0.34.0/strings/decode.ts#=";  // no change

-export { Application } from "https://deno.land/x/abc@v0.1.10/mod.ts#<0.2.0";
+export { Application } from "https://deno.land/x/abc@v0.1.11/mod.ts#<0.2.0";  // 0.2.x is not chosen

-export { encode } from "https://deno.land/std@v0.34.0/strings/encode.ts#~";
+export { encode } from "https://deno.land/std@v0.36.0/strings/encode.ts#~";  // update to latest compatible
```

![udd-in-action](https://user-images.githubusercontent.com/1931852/76695958-a1675580-6642-11ea-81d1-9ed15d22965f.gif)

## Supported domains

udd supports the following registry domains:

- https://deno.land/std
- https://deno.land/x
- https://denopkg.com
- https://dev.jspm.io
- https://cdn.pika.dev
- https://unpkg.com

_Create an issue to request additional registries._

---

_Logo by [Drake Sauer](http://clipart-library.com/clipart/6ir6AMoKT.htm)._
