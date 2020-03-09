import { encode } from "./deps.ts";
const { noColor } = Deno;

const START = noColor ? "" : "\u001b[999D";
const END = noColor ? "\n" : "";

export class Progress {
  n: number;
  w: Deno.Writer;
  step: number = -1;

  constructor(n: number, w: Deno.Writer = Deno.stdout) {
    this.n = n;
    this.w = w;
  }
  async log(msg: string) {
    // We expect but don't enforce that msg doesn't contain \n.
    const line = `${START}[${this.step + 1}/${this.n}] ${msg}${END}`;
    const b = encode(line);
    await this.w.write(b);
  }
}
