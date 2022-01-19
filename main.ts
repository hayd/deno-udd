// deno -A main.ts deps.ts --test="deno test"

import { colors, parseArgs } from "./deps.ts";
import { udd, UddOptions, UddResult } from "./mod.ts";
import { DenoLand } from "./registry.ts";

function testsThunk(tests: string[]): () => Promise<void> {
  return async () => {
    for (const t of tests) {
      // FIXME is there a better way to split / pass arrays?
      // This fails if you wanted to pass e.g. --foo="a b"
      const p = Deno.run({
        cmd: t.split(" "),
        stdout: "piped",
        stderr: "piped",
      });
      const success = (await p.status()).success;
      if (!success) {
        console.log();
        await Deno.stdout.write(await p.stderrOutput());
      }
      // This close handling cleans up resouces but is not required...
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
 --test TEST\tcommand to run after each dependency update e.g. "deno test"
 --upgrade  \tupdate udd to the latest version
 --version  \tprint the version of udd`);
}

function version() {
  // FIXME this might be kinda a hacky way to do it...
  const u = new DenoLand(import.meta.url);
  try {
    console.log(u.version());
  } catch (e) {
    console.error(e);
  }
}

// https://github.com/jurassiscripts/velociraptor/blob/971b7db71cf635b0c8f2de822aa4270e52cce498/src/util.ts#L22-L39
async function spawn(args: string[], cwd?: string): Promise<string> {
  const process = Deno.run({
    cmd: args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const { code } = await process.status();
  if (code === 0) {
    const rawOutput = await process.output();
    process.close();
    return new TextDecoder().decode(rawOutput);
  } else {
    const error = new TextDecoder().decode(await process.stderrOutput());
    process.close();
    throw new Error(error);
  }
}

async function upgrade() {
  const u = new DenoLand("https://deno.land/x/udd@0.x/main.ts");
  const latestVersion = (await u.all())[0];
  const url = u.at(latestVersion).url;
  console.log(url);

  // TODO support alternative name to udd if that's what's been used before.
  await spawn([Deno.execPath(), "install", "--reload", "-qAfn", "udd", url]);
}

async function main(args: string[]) {
  const a = parseArgs(args, {
    boolean: ["dry-run", "h", "help", "upgrade", "version"],
  });

  if (a.h || a.help) {
    return help();
  }
  if (a.upgrade) {
    return await upgrade();
  }
  if (a.version) {
    return version();
  }

  const depFiles: string[] = a._.map((x) => x.toString());

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
  try {
    await thunk();
  } catch {
    console.error(
      colors.red("Tests failed prior to updating any dependencies"),
    );
    Deno.exit(1);
  }

  // TODO verbosity/quiet argument?
  const options: UddOptions = { dryRun: a["dry-run"], test: thunk };

  const results: UddResult[] = [];
  for (const [i, fn] of depFiles.entries()) {
    if (i !== 0) console.log();
    console.log(colors.yellow(fn));
    results.push(...await udd(fn, options));
  }

  // TODO perhaps a table would be a nicer output?

  const alreadyLatest = results.filter((x) => x.message === undefined);
  if (alreadyLatest.length > 0) {
    console.log(colors.bold("\nAlready latest version:"));
    for (const a of alreadyLatest) {
      console.log(colors.dim(a.initUrl), "==", a.initVersion);
    }
  }

  const successes = results.filter((x) => x.success === true);
  if (successes.length > 0) {
    console.log(
      colors.bold(
        options.dryRun ? "\nAble to update:" : "\nSuccessfully updated:",
      ),
    );
    for (const s of successes) {
      console.log(colors.green(s.initUrl), s.initVersion, "->", s.message);
    }
  }

  const failures = results.filter((x) => x.success === false);
  if (failures.length > 0) {
    console.log(
      colors.bold(
        options.dryRun ? "\nUnable to update:" : "\nFailed to update:",
      ),
    );
    for (const f of failures) {
      console.log(colors.red(f.initUrl), f.initVersion, "->", f.message);
    }
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main(Deno.args);
}
