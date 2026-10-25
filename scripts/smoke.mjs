#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PORT = 3999;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const BUILD_ID = path.join(ROOT, ".next", "BUILD_ID");

let serverLogs = "";
let server = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasKey(name) {
  if (process.env[name]?.trim()) return true;

  for (const envFile of [".env.local", ".env"]) {
    const fullPath = path.join(ROOT, envFile);
    if (!existsSync(fullPath)) continue;
    const text = readFileSync(fullPath, "utf8");
    const match = text.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`, "m"));
    if (match) {
      const value = match[1].trim().replace(/^["']|["']$/g, "");
      if (value) return true;
    }
  }

  return false;
}

async function waitForHome() {
  const deadline = Date.now() + 40_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`next start exited early with code ${server.exitCode}.\n${serverLogs}`);
    }
    try {
      const response = await fetch(BASE_URL + "/", {
        signal: AbortSignal.timeout(1500)
      });
      if (response.ok) {
        await response.text();
        return;
      }
    } catch {
      // Server is still starting.
    }
    await sleep(400);
  }

  throw new Error(`next start did not become ready on port ${PORT}.\n${serverLogs}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;

  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    sleep(3000)
  ]);

  if (server.exitCode === null) {
    server.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      sleep(1500)
    ]);
  }
}

async function main() {
  assert(
    existsSync(path.join(ROOT, "node_modules", "next")),
    "next is not installed. Run npm install first."
  );
  assert(
    existsSync(BUILD_ID),
    "No production build found. Run npm run build before npm test."
  );

  server = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-H", "127.0.0.1", "-p", String(PORT)],
    {
      cwd: ROOT,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", PORT: String(PORT) },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  const collect = (chunk) => {
    serverLogs = (serverLogs + chunk.toString()).slice(-8000);
  };
  server.stdout.on("data", collect);
  server.stderr.on("data", collect);
  server.on("error", (error) => {
    serverLogs += `\nspawn error: ${error.message}`;
  });

  try {
    await waitForHome();

    const requestBody = {
      direction: "JP->KR",
      items: [
        { description: "Ceramic teacup (stoneware, glazed)", valueJpy: 24000 },
        { description: "Aerosol sunscreen SPF50, 90g", valueJpy: 3800 }
      ],
      weightKg: 1.2,
      address: "45 Teheran-ro, Gangnam-gu, Seoul 06132, Republic of Korea"
    };

    const planResponse = await fetch(BASE_URL + "/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60_000)
    });
    const rawPlan = await planResponse.text();

    assert(
      planResponse.status === 200,
      `POST /api/plan returned ${planResponse.status}: ${rawPlan.slice(0, 1200)}`
    );

    let plan;
    try {
      plan = JSON.parse(rawPlan);
    } catch {
      throw new Error(`POST /api/plan did not return JSON: ${rawPlan.slice(0, 500)}`);
    }

    assert(Array.isArray(plan.steps), "Plan response is missing steps[].");
    assert(plan.steps.length >= 4, `Expected at least 4 steps, got ${plan.steps.length}.`);
    assert(Array.isArray(plan.rates), "Plan response is missing rates[].");
    assert(plan.rates.length >= 1, "Expected at least one rate.");
    assert(
      plan.rates.some((rate) => rate.basis === "table"),
      "Expected at least one table-based postal rate."
    );
    const emsRate = plan.rates.find((rate) => rate.basis === "table");
    assert(
      emsRate.priceOriginal === 2500 && emsRate.currency === "JPY",
      `Expected official Japan Post EMS zone-1 price 2500 JPY for 1.2 kg, got ${emsRate.priceOriginal} ${emsRate.currency}.`
    );
    assert(
      plan.steps.every(
        (step) =>
          typeof step.model === "string" &&
          typeof step.mode === "string" &&
          typeof step.latencyMs === "number"
      ),
      "Every step must include model, mode, and latencyMs."
    );

    for (let index = 1; index < plan.rates.length; index += 1) {
      assert(
        plan.rates[index - 1].priceJpy <= plan.rates[index].priceJpy,
        "Rates are not sorted by JPY price."
      );
    }

    const llmConfigured = hasKey("NEBIUS_API_KEY");
    const easypostConfigured = hasKey("EASYPOST_API_KEY");

    if (!llmConfigured) {
      assert(
        plan.steps.every((step) => step.mode === "mock"),
        "Without NEBIUS_API_KEY, every step should report mode mock."
      );
    }
    if (!easypostConfigured) {
      assert(
        plan.rates.some((rate) => rate.basis === "mock"),
        "Without EASYPOST_API_KEY, mock carrier rates should be present."
      );
    }

    const homeResponse = await fetch(BASE_URL + "/", {
      signal: AbortSignal.timeout(10_000)
    });
    assert(homeResponse.status === 200, `GET / returned ${homeResponse.status}.`);
    const html = await homeResponse.text();
    assert(/Hakobu/i.test(html), "GET / did not contain the Hakobu UI.");

    if (!llmConfigured || !easypostConfigured) {
      assert(
        html.includes("MOCK"),
        "Missing API keys should render a visible MOCK badge on the page."
      );
    }

    console.log(`PASS  steps: ${plan.steps.length}`);
    console.log(`PASS  rates: ${plan.rates.length} (sorted, table row present)`);
    console.log(
      `PASS  modes: ${plan.steps.map((step) => `${step.step}=${step.mode}`).join(", ")}`
    );
    if (!llmConfigured || !easypostConfigured) {
      console.log("PASS  visible MOCK labels for unconfigured integrations");
    }
    console.log("PASS  GET / returned 200 with the Hakobu UI");
  } finally {
    await stopServer();
  }
}

main().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  if (serverLogs.trim()) {
    console.error("\n--- next start output ---");
    console.error(serverLogs.trim());
  }
  process.exitCode = 1;
});
