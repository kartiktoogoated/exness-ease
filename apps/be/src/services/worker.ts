import { startLiquidationWorker } from "./liquidationWatcher";

async function main() {
  startLiquidationWorker();
}

main().catch((err) => {
  console.error("Worker crashed:", err);
  process.exit(1);
});