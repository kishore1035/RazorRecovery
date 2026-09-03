import { prisma } from "./db";
import { z } from "zod";

const OutputSchema = z.object({
  intent: z.string(),
  answer: z.string(),
  evidence: z.string().optional(),
  actions: z.array(z.object({
    requestedAction: z.string(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    parameters: z.any()
  })).optional()
});

export const CopilotService = {
  async processRequest(merchantId: string, storeId: string, userId: string, content: string, context?: any) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.merchantId !== merchantId) throw new Error("Unauthorized");

    // Broad context gathering
    const period = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const completedRecoveries = await prisma.recoveryOutcome.aggregate({
      _sum: { grossRecovered: true, incentiveCost: true, netRecovered: true },
      where: { recoveryCase: { storeId }, createdAt: { gte: period } }
    });
    const activeCases = await prisma.recoveryCase.count({
      where: { storeId, status: { notIn: ["RECOVERED", "FAILED", "STOPPED"] } }
    });
    
    // Check for active leaks
    const activeLeaks = await prisma.revenueLeak.findMany({
      where: { storeId, status: "ACTIVE" }
    });
    
    const systemPrompt = `You are RazorRecovery Copilot, an expert AI revenue recovery assistant.
    Your role is to orchestrate, explain, and summarize data for the merchant.
    
    CRITICAL SAFETY RULES:
    1. NEVER invent metrics, payment states, or customer data. Use only the provided context.
    2. NEVER claim revenue is recovered without authoritative proof.
    3. You cannot directly move money or bypass policy. You can only propose actions.
    4. Distinguish clearly between actual history and simulations/predictions.
    
    Current Store Context:
    Store ID: ${storeId}
    Total 30-day Net Recovered: ₹${((completedRecoveries._sum.netRecovered || 0) / 100).toFixed(2)}
    Active Cases: ${activeCases}
    Active Leaks: ${JSON.stringify(activeLeaks.map(l => ({ title: l.title, amount: l.affectedRevenue })))}
    
    User Page Context:
    ${JSON.stringify(context || {})}
    
    Output JSON strictly adhering to this schema:
    {
      "intent": "REVENUE_SUMMARY | EXPLAIN_CASE | SIMULATION | ACTION_REQUEST",
      "answer": "Human readable response. Be concise, professional, and evidence-first.",
      "evidence": "String summarizing exactly what data backs this up",
      "actions": [ { "requestedAction": "RECOVER", "entityType": "CUSTOMER", "entityId": "...", "parameters": {} } ] // only if the user explicitly requested an action
    }`;

    const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(process.env.AI_PROVIDER_API_KEY ? { 'Authorization': `Bearer ${process.env.AI_PROVIDER_API_KEY}` } : {})
      },
      body: JSON.stringify({
        model: "gemma4:31b-cloud",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        format: "json",
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unable to read error text");
      console.error("Ollama API Error:", response.status, errorText);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const responseText = data.message?.content;
    if (!responseText) throw new Error("AI returned empty response");
    
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) cleanJson = cleanJson.substring(7);
    else if (cleanJson.startsWith("```")) cleanJson = cleanJson.substring(3);
    if (cleanJson.endsWith("```")) cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    
    const parsed = OutputSchema.parse(JSON.parse(cleanJson.trim()));

    // Process Action Proposals
    const proposals = [];
    if (parsed.actions && parsed.actions.length > 0) {
      for (const act of parsed.actions) {
        const proposal = await prisma.copilotActionProposal.create({
          data: {
            merchantId,
            storeId,
            intent: parsed.intent,
            entityType: act.entityType,
            entityId: act.entityId,
            requestedAction: act.requestedAction,
            parameters: JSON.stringify(act.parameters),
            policyStatus: "PENDING_EVALUATION",
            approvalRequired: true,
            riskLevel: "MEDIUM",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000)
          }
        });
        proposals.push(proposal);
      }
    }

    return {
      intent: parsed.intent,
      answer: parsed.answer,
      evidence: parsed.evidence,
      proposals
    };
  }
};
