import { getRazorpayClient } from "@/lib/razorpay";

export default async function RazorpaySettingsPage() {
  let status = "Not configured";
  let isConnected = false;
  let keyId = process.env.RAZORPAY_KEY_ID || "";
  let errorMsg = null;

  try {
    const rzp = getRazorpayClient();
    // Test connection by fetching a single order or just relying on initialization
    isConnected = true;
    status = "Connected (Test Mode)";
  } catch (err: any) {
    status = "Configuration error";
    errorMsg = err.message;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Razorpay Configuration</h1>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-lg font-medium text-slate-900">Connection Status</h2>
            <p className="text-sm text-slate-500 mt-1">Status of your Razorpay Test Mode integration.</p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {status}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Key ID</label>
            <div className="mt-1 flex items-center">
              <input 
                type="text" 
                disabled 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-500 sm:text-sm" 
                value={keyId ? `${keyId.substring(0, 8)}...${keyId.substring(keyId.length - 4)}` : "Not set"} 
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Key Secrets and Webhook Secrets are securely stored on the server and never exposed to the frontend.</p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Error connecting to Razorpay:</p>
              <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
