"use client";
import { useState } from "react";

export default function DemoCheckoutGenerator() {
  const [loading, setLoading] = useState(false);
  
  const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      customerPhone: formData.get("customerPhone"),
      productTitle: formData.get("productTitle"),
      amountInRupees: formData.get("amountInRupees"),
    };
    
    const res = await fetch("/api/demo/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    setLoading(false);
    
    if (result.success) {
      window.location.href = `/checkout-demo.html?orderId=${result.razorpayOrderId}&amount=${result.amountInPaise}&product=${encodeURIComponent(data.productTitle as string)}&name=${encodeURIComponent(data.customerName as string)}&email=${encodeURIComponent(data.customerEmail as string)}&phone=${encodeURIComponent(data.customerPhone as string)}`;
    } else {
      alert("Failed: " + result.error);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold mb-6">Test Checkout Generator</h2>
      <p className="text-sm text-slate-500 mb-6">Generate a custom order on the fly. You will be redirected to the Razorpay checkout simulator immediately after.</p>
      
      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <input name="customerName" required defaultValue="Arjun Singh" className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Customer Email</label>
          <input name="customerEmail" type="email" required defaultValue="arjun.s@example.com" className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Customer Phone</label>
          <input name="customerPhone" required defaultValue="+919876543210" className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Product Title</label>
          <input name="productTitle" required defaultValue="Sony WH-1000XM5 Headphones" className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price (in ₹ Rupees)</label>
          <input name="amountInRupees" type="number" required defaultValue="29990" className="w-full px-3 py-2 border rounded-md" />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-3 rounded-md mt-4 font-medium hover:bg-slate-800 transition-colors">
          {loading ? "Generating..." : "Generate & Pay ->"}
        </button>
      </form>
    </div>
  );
}
