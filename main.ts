// deno --allow-run main.ts deps.ts --test="fetch main.ts" --test=test
// perhaps --compile instead?

import { colors, parseArgs } from "./deps.ts";
import { UddOptions, UddResult, udd } from "./mod.ts";

// TODO verbosity e.g. show all versions available
// TODO quiet show little
// export let verbosity = 1;

function testsThunk(tests: string[]): () => Promise<void> {
  return async () => {
    for (const t of tests) {
      // FIXME is there a better way to split / pass arrays?
      // This fails if you wanted to pass e.g. --foo="a b"
      const p = Deno.run({
        args: t.split(" "),
        stdout: "piped",
        stderr: "piped"
      });
      const success = (await p.status()).success;
      if (!success) {
        console.log();
        await Deno.stdout.write(await p.stderrOutput());
      }
      // This close handling is cleans up resouces but is not required...
      p.close();
      p.stdout!.close();
      p.stderr!.close();
      if (!success) {
        throw new Error(t);
      }
    }
  };
}

function help() {
  console.log(`usage: udd [-h] [--dry-run] [--test TEST] file [file ...]

udd: Update Deno Dependencies

Positional arguments:
  file      \tfiles to update dependencies

Optional arguments:
 -h, --help \tshow this help text
 --dry-run  \ttest what dependencies can be updated
 --test TEST\tcommand to run after each dependency update e.g. "deno test"`);
}

export async function main(args: string[]) {
  const a = parseArgs(args);

  if (a.h || a.help) {
    return help();
  }

  const depFiles: string[] = a._;

  if (depFiles.length === 0) {
    help();
    Deno.exit(1);
  }

  let tests: string[] = [];
  if (a.test instanceof Array) {
    tests = a.test;
  } else if (a.test) {
    tests = [a.test];
  }

  const thunk = testsThunk(tests);

  // TODO verbosity/quiet argument?
  const options: UddOptions = { dryRun: a["dry-run"] };

  try {
    await thunk();
  } catch {
    console.error(
      colors.red("Tests failed prior to updating any dependencies")
    );
    Deno.exit(1);
  }

  const results: UddResult[] = [];
  for (const [i, fn] of depFiles.entries()) {
    if (i !== 0) console.log();
    console.log(colors.yellow(fn));
    results.push(...await udd(fn, thunk, options));
  }

  // TODO perhaps a table would be a nicer output?

  const alreadyLatest = results.filter(x => x.newVersion === undefined);
  if (alreadyLatest.length > 0) {
    console.log(colors.bold("\nAlready latest version:"));
    for (const a of alreadyLatest) {
      console.log(colors.dim(a.initUrl), "==", a.initVersion);
    }
  }

  const successes = results.filter(x => x.success === true);
  if (successes.length > 0) {
    console.log(
      colors.bold(
        options.dryRun ? "\nAble to update:" : "\nSuccessfully updated:"
      )
    );
    for (const s of successes) {
      console.log(colors.green(s.initUrl), s.initVersion, "->", s.newVersion);
    }
  }

  const failures = results.filter(x => x.success === false);
  if (failures.length > 0) {
    console.log(
      colors.bold(
        options.dryRun ? "\nUnable to update:" : "\nFailed to update:"
      )
    );
    for (const f of failures) {
      console.log(colors.red(f.initUrl), f.initVersion, "->", f.newVersion);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main(Deno.args);
}
