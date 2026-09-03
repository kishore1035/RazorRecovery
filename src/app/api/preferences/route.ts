import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withTenant } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scope, condition, preferredStrategy, disallowedStrategy, reason } = body;

    const result = await withTenant(async (merchantId) => {
      return prisma.merchantRecoveryPreference.create({
        data: {
          merchantId,
          scope,
          condition,
          preferredStrategy: preferredStrategy || null,
          disallowedStrategy: disallowedStrategy || null,
          reason,
          enabled: true
        }
      });
    });

    return NextResponse.json({ success: true, preference: result });
  } catch (err: any) {
    console.error("Preference creation failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
