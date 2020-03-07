// deno --allow-run main.ts deps.ts --test="fetch main.ts" --test=test
// perhaps --compile instead?

import { parseArgs } from "./deps.ts";
import { update } from "./update.ts";

function testsThunk(tests: string[]): () => Promise<boolean> {
  return async () => {
    for (const t of tests) {
      // FIXME is there a better way to split / pass arrays?
      // This fails if you wanted to pass e.g. --foo="a b"
      const p = Deno.run({ args: t.split(" ") });
      if (!(await p.status()).success) {
        return true;
      }
    }
    return false;
  };
}

export async function main(args: string[]) {
  const a = parseArgs(args);

  const depFiles: string[] = a._;
  // TODO verbosity/quiet argument?

  let tests: string[] = [];
  if (a.test instanceof Array) {
    tests = a.test;
  } else if (a.test) {
    tests = [a.test];
  }

  const thunk = testsThunk(tests);

  for (const fn of depFiles) {
    await update(fn, thunk);
  }
}

if (import.meta.main) {
  await main(Deno.args);
}
