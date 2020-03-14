import { encode } from "./deps.ts";
const { noColor } = Deno;

const START = noColor ? "" : "\x1b[999D\x1b[K";
const END = noColor ? "\n" : "";

export class Progress {
  n: number;
  step: number = -1;
  writer: Deno.Writer;

  constructor(n: number, writer: Deno.Writer = Deno.stdout) {
    this.n = n;
    this.writer = writer;
  }
  async log(msg: string) {
    // We expect but don't enforce that msg doesn't contain \n.
    const line = `${START}[${this.step + 1}/${this.n}] ${msg}${END}`;
    const b = encode(line);
    await this.writer.write(b);
  }
}

export class SilentProgress extends Progress {
  async log(msg: string) {}
}
