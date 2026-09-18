import type { FullResult, Reporter, Suite } from "@playwright/test/reporter";

export default class DemoNoSkipsReporter implements Reporter {
  private suite?: Suite;
  onBegin(_config: unknown, suite: Suite) { this.suite = suite; }
  async onEnd(result: FullResult) {
    const tests = this.suite?.allTests() ?? [];
    const incomplete = tests.filter(test => !test.results.length || test.results.some(r => r.status === "skipped" || r.status === "interrupted"));
    if (!tests.length || incomplete.length) {
      console.error(`Demo certification refused: ${incomplete.length} skipped/interrupted/unrun tests.`);
      return { status: "failed" as const };
    }
    return { status: result.status };
  }
}
