# 🚀 RazorRecovery OS
**Built for the Razorpay Buildathon**

RazorRecovery is an **AI-driven Revenue Recovery Control Plane** for enterprise merchants. It doesn't just blindly chase failed payments with spam emails. It mathematically analyzes payment failures, simulates recovery strategies, and autonomously executes the most profitable action to maximize **Net Recovered Revenue**.

---

## 🧠 What It Does

When a customer's payment fails at checkout, RazorRecovery steps in instantly:
1. **Webhook Interception:** Securely catches `payment.failed` webhooks directly from Razorpay using HMAC-SHA256 validation.
2. **AI Counterfactual Analysis:** Feeds the entire customer history and checkout context into an LLM (powered by Ollama/Gemma). The AI predicts the probability of recovery using different strategies (e.g., standard Payment Link vs. Payment Link + 10% Voucher).
3. **Deterministic Execution:** The AI's decision is passed through a strict Merchant Policy Engine. If approved, RazorRecovery uses the Razorpay API to generate a targeted Payment Link and sends it to the customer.
4. **Learning & Lab:** Records the outcome to build a "Recovery Memory", ensuring the AI gets smarter over time.

---

## ⚡ Key Features

* **Recovery Autopilot:** Fully autonomous failure detection and recovery execution using the Razorpay API.
* **Counterfactual AI:** Mathematically estimates *Gross Recovery* vs *Incentive Cost* before taking action.
* **Recovery Copilot:** A built-in natural language terminal. Ask the AI: *"Why did my UPI success rate drop today?"* or *"Summarize my active revenue leaks."*
* **Recovery Lab (A/B Testing):** Safely route a small percentage of failed checkouts to experimental strategies to prove mathematical ROI before full rollout.
* **Insights Engine:** Scans the macro-funnel to find systemic revenue leaks across the entire store.
* **Local-First AI:** Built to route securely through a local Ollama cloud daemon (e.g., `gemma4:31b-cloud`) keeping merchant data private.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 16 (App Router), Tailwind CSS, Framer Motion, shadcn/ui.
* **Backend:** Next.js API Routes, Prisma ORM, SQLite.
* **AI Integration:** Native REST integration with Ollama (Local/Cloud).
* **Payments & Webhooks:** Razorpay Node SDK.
* **Networking:** Cloudflare Tunnels for live webhook interception.

---

## 🎮 How to Demo / Test

Because RazorRecovery is built for production, you cannot just test it with a standalone link. You must simulate a real e-commerce checkout loop.

1. **Start the Platform:**
   ```bash
   npm run dev
   ```

2. **Start the Webhook Tunnel (New Terminal):**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   *(Copy the generated HTTPS URL and paste it into your Razorpay Dashboard Webhooks settings).*

3. **Generate a Custom Checkout:**
   Navigate to `http://localhost:3000/demo`. Enter custom customer details and click **Generate**.

4. **Fail the Payment:**
   You will be redirected to a simulated storefront. Click **Pay**. When the Razorpay Test Modal opens, select a payment method and explicitly click **Failure**.

5. **Watch the AI Work:**
   Go to `http://localhost:3000/recoveries`. You will instantly see the AI intercept the webhook, analyze your custom checkout, and propose a live recovery plan!

---

*Designed with a "Quiet-Luxury" Fintech aesthetic for maximum clarity and control.*
