"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createVoucher(formData: FormData) {
  const authContext = await getAuthContext();
  if (!authContext) throw new Error("Unauthorized");
  
  const merchantId = authContext.merchantId;
  const store = await prisma.store.findFirst({
    where: { merchantId }
  });
  
  if (!store) throw new Error("Store not found");

  const code = formData.get("code") as string;
  const discountType = formData.get("discountType") as string;
  const discountValue = parseInt(formData.get("discountValue") as string, 10);
  
  const minOrderValueRaw = formData.get("minimumOrderValue");
  const minimumOrderValue = minOrderValueRaw ? parseInt(minOrderValueRaw as string, 10) * 100 : null; // to minor units if INR

  const maxDiscountRaw = formData.get("maximumDiscount");
  const maximumDiscount = maxDiscountRaw ? parseInt(maxDiscountRaw as string, 10) * 100 : null;
  
  const actualDiscountValue = discountType === "FIXED" ? discountValue * 100 : discountValue; // fixed is in rupees, percentage is just value

  await prisma.voucher.create({
    data: {
      storeId: store.id,
      code: code.toUpperCase(),
      discountType,
      discountValue: actualDiscountValue,
      maximumDiscount,
      minimumOrderValue,
      status: "ACTIVE"
    }
  });

  redirect("/settings/incentives");
}
