/**
 * Simple helper to measure execution time of a code block
 */
export class Measure {
  private _label: string;
  private _start: number;

  constructor(label: string) {
    this._label = label;
    this._start = Date.now();
  }

  public end() {
    const end = Date.now();
    const duration = Number(((end - this._start) / 1000).toFixed(3));
    console.log(`${this._label} took ${duration}s`);
  }
}
