import { z } from "zod";

export const MerchantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  logo: z.string().url().optional().or(z.literal("")),
  domain: z.string().min(3).optional(),
  category: z.string().optional(),
  currency: z.string().default("INR"),
  timezone: z.string().default("Asia/Kolkata"),
});

export const StoreSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  category: z.string().optional(),
  productUrlBase: z.string().url().optional().or(z.literal("")),
});

export const UserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

export const CustomerSchema = z.object({
  externalCustomerId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

export const ProductSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  sku: z.string().optional(),
  category: z.string().optional(),
  price: z.number().int().nonnegative(),
  currency: z.string().default("INR"),
  productUrl: z.string().url().optional().or(z.literal("")),
  inventoryStatus: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "UNKNOWN"]).default("UNKNOWN"),
});

export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const CheckoutEventSchema = z.object({
  eventType: z.enum([
    "PRODUCT_VIEWED", "ADDED_TO_CART", "CHECKOUT_STARTED", 
    "DETAILS_COMPLETED", "ADDRESS_COMPLETED", "PAYMENT_METHOD_SELECTED", 
    "PAYMENT_ATTEMPTED", "PAYMENT_FAILED", "PAYMENT_COMPLETED", "CHECKOUT_ABANDONED"
  ]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const PaymentAttemptSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().default("INR"),
  method: z.enum(["UPI", "CARD", "NETBANKING", "WALLET", "OTHER", "UNKNOWN"]).default("UNKNOWN"),
});
