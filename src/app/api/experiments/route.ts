import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, hypothesis, controlStrategy, variantStrategy, sampleTarget, budgetLimit } = body;

    const result = await withTenant(async (merchantId) => {
      const store = await prisma.store.findFirst({ where: { merchantId } });
      if (!store) throw new Error("Store not found");

      const exp = await prisma.recoveryExperiment.create({
        data: {
          storeId: store.id,
          name,
          description: hypothesis,
          hypothesis,
          status: "RUNNING",
          controlStrategy,
          variantStrategy,
          sampleTarget: parseInt(sampleTarget, 10) || 50,
          budgetLimit: budgetLimit ? parseInt(budgetLimit, 10) * 100 : null,
          eligibilityRules: "{}",
          startAt: new Date()
        }
      });

      await prisma.recoveryExperimentArm.create({
        data: {
          experimentId: exp.id,
          name: `Control: ${controlStrategy.replace(/_/g, " ")}`,
          strategy: controlStrategy,
          allocationPercentage: 50
        }
      });

      await prisma.recoveryExperimentArm.create({
        data: {
          experimentId: exp.id,
          name: `Variant: ${variantStrategy.replace(/_/g, " ")}`,
          strategy: variantStrategy,
          allocationPercentage: 50
        }
      });

      return exp;
    });

    return NextResponse.json({ success: true, experiment: result });
  } catch (err: any) {
    console.error("Experiment creation failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
