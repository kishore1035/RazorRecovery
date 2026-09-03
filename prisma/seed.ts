import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding base production environment...");
  
  // Clean up
  await prisma.payment.deleteMany();
  await prisma.checkoutEvent.deleteMany();
  await prisma.checkoutSession.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  
  await prisma.recoveryExperimentArm.deleteMany();
  await prisma.recoveryExperiment.deleteMany();
  await prisma.recoveryMemory.deleteMany();
  await prisma.revenueLeak.deleteMany();
  
  await prisma.recoveryAction.deleteMany();
  await prisma.recoveryPlanStep.deleteMany();
  await prisma.recoveryPlan.deleteMany();
  await prisma.policyEvaluation.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.recoveryOption.deleteMany();
  await prisma.aIDecision.deleteMany();
  await prisma.recoveryOutcome.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.recoveryCase.deleteMany();
  
  await prisma.merchantRecoveryPolicy.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.merchant.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 10);

  // 1. Merchant
  const merchant = await prisma.merchant.create({
    data: {
      name: "My Business",
      domain: "business.local",
      category: "E-Commerce",
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  // 2. Stores
  const store1 = await prisma.store.create({
    data: { merchantId: merchant.id, name: "Main Store", domain: "store.business.local", category: "E-Commerce" },
  });

  // 3. Users
  await prisma.user.create({ 
    data: { merchantId: merchant.id, name: "Admin", email: "admin@business.local", password: hashedPassword, role: "OWNER" } 
  });

  // 4. Base Policy
  await prisma.merchantRecoveryPolicy.create({
    data: { 
      merchantId: merchant.id, 
      maximumAutomaticRecoveryAmount: 1000000, 
      maximumDiscountPercent: 10, 
      maximumDiscountAmount: 50000, 
      maximumContacts: 2, 
      recoveryWindowHours: 24, 
      highValueApprovalRequired: true, 
      automaticRecoveryEnabled: true 
    }
  });

  console.log("Base environment seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
