# Deno Update Dependencies

Run this script to update your dependency urls to the latest published versions.

Prior to updating, the updater runs the passed --test(s) to ensure that updating is non-breaking.

## Installation

Using deno's install command:

```sh
deno install -A dud https://raw.githubusercontent.com/hayd/deno-deps-updater/0.0.1/main.ts
```
_You may need to include the deno bin directory in your PATH._

## Usage

For example, suppose I want to update the url imports inside `deps.ts`.
I want to ensure that both `deno fetch main.ts` works and `deno test`.

```sh
dud deps.ts --test="fetch main.ts" --test="test"
```

## Example

```ts
// deps.ts (before)
export { decode } from "https://deno.land/std@v0.34.0/strings/decode.ts";
```

Running dud looks up the std versions to see that there is a more recent std release.

```ts
// deps.ts (after)
export { decode } from "https://deno.land/std@v0.35.0/strings/decode.ts";
```

## Supported domains

dud supports the following registry domains:

- https://deno.land/std
- https://deno.land/x
- https://unpkg.com
- https://denopkg.com

_Create an issue to request additional registries._
