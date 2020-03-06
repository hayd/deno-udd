# Deno deps updater

Run this script to update your dependency urls to the latest published versions.

Prior to updating, the updater runs the passed tests to ensure that updating is non-breaking.

## Usage

For example, suppose I want to update the url imports inside `deps.ts`.
I want to ensure that both `deno fetch main.ts` works and `deno test`.

```sh
$ deno -A main.ts deps.ts --test="fetch main.ts" --test="test"
```
