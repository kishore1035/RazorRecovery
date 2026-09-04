import { prisma } from "../src/lib/db";
import { RazorpayService } from "../src/lib/razorpay";
import { RevenueLeakDetector, PaymentDegradationController } from "../src/lib/leak-detector";

async function main() {
  const store = await prisma.store.findFirst();
  if (!store) {
    console.log("No store found");
    return;
  }

  console.log("Syncing live transactions from Razorpay...");
  await RazorpayService.syncLiveTransactions(store.id);

  console.log("Running Leak Detector on new data...");
  await RevenueLeakDetector.analyzePaymentMethods(store.id);

  const health = await PaymentDegradationController.getHealth(store.id);
  console.log("Current Payment Health Status:", health.status);
  console.log("Active Leaks Detected:", health.activeLeaks.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
