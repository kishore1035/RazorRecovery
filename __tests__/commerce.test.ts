import { describe, it, expect } from "vitest";
import { CustomerSchema, ProductSchema, CheckoutEventSchema } from "../src/lib/validations";

describe("Commerce Data Model Validations", () => {
  it("should validate a correct customer", () => {
    const valid = CustomerSchema.parse({
      name: "Rahul Sharma",
      email: "rahul@example.com",
      phone: "+919876543210"
    });
    expect(valid.name).toBe("Rahul Sharma");
  });

  it("should validate a correct product with minor unit price", () => {
    const valid = ProductSchema.parse({
      name: "Nike Air Max 270",
      price: 499900, // 4999 INR
      inventoryStatus: "IN_STOCK"
    });
    expect(valid.price).toBe(499900);
  });

  it("should reject negative prices", () => {
    expect(() => ProductSchema.parse({ name: "Bad", price: -100 })).toThrow();
  });
  
  it("should validate distinct checkout events", () => {
    const abandoned = CheckoutEventSchema.parse({ eventType: "CHECKOUT_ABANDONED" });
    const failed = CheckoutEventSchema.parse({ eventType: "PAYMENT_FAILED" });
    
    // Crucial rule: PAYMENT_FAILED != CHECKOUT_ABANDONED
    expect(abandoned.eventType).not.toBe(failed.eventType);
    expect(abandoned.eventType).toBe("CHECKOUT_ABANDONED");
  });
});
