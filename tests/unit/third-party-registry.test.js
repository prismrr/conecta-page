const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

function runNode(args) {
  return spawnSync("node", args, {
    cwd: resolve(__dirname, "../.."),
    encoding: "utf-8"
  });
}

describe("third-party governance inventory", () => {
  test("should validate third-party registry and produce report", () => {
    const run = runNode(["scripts/third_party_inventory_check.js"]);

    expect(run.status).toBe(0);

    const report = JSON.parse(readFileSync(resolve(__dirname, "../../logs/third-party-governance-report.json"), "utf-8"));
    expect(report.status).toBe("pass");
    expect(report.thirdPartyCount).toBeGreaterThanOrEqual(3);
    expect(report.thirdParties.map((party) => party.id)).toEqual(
      expect.arrayContaining(["prism_registration_provider", "observability_loki", "github_actions_artifacts"])
    );
  });
});