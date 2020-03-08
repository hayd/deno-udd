import { encode } from "./deps.ts";
const { noColor } = Deno;

const LINE_START = noColor ? "" : "\u001b[999D";

export class Progress {
  n: number;
  r: Deno.Writer;
  step: number = 0;

  constructor(n: number, r: Deno.Writer = Deno.stdout) {
    this.n = n;
    this.r = r;
  }
  async log(msg: string) {
    // we assume that msg doesn't contain \n
    const line = `${LINE_START}[${this.step + 1}/${this.n}] ${msg}`;
    const b = encode(line);
    await this.r.write(b);
  }
}
