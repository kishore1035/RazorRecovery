import { CustomerService } from "@/lib/services";
import Link from "next/link";

export default async function CustomersPage() {
  const result = await CustomerService.list(1, 50);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Orders</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {result.data.map((customer) => (
              <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/customers/${customer.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {customer.name || "Guest"}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-900">{customer.email ? customer.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "N/A"}</div>
                  <div className="text-xs text-slate-500">{customer.phone ? customer.phone.replace(/(\+\d{2})(\d{5})(\d{5})/, "$1*****$3") : ""}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {customer.orders.length}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
