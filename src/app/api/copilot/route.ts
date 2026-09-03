import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CopilotService } from "@/lib/copilot";

export async function POST(req: NextRequest) {
  try {
    const { content, conversationId, context } = await req.json();
    
    const user = await prisma.user.findFirst();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const store = await prisma.store.findFirst({ where: { merchantId: user.merchantId } });
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
    
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.copilotConversation.create({
        data: { merchantId: user.merchantId, storeId: store.id, userId: user.id, title: "New Conversation" }
      });
      convId = conv.id;
    }

    await prisma.copilotMessage.create({
      data: { conversationId: convId, role: "USER", content }
    });

    const response = await CopilotService.processRequest(user.merchantId, store.id, user.id, content, context);

    const message = await prisma.copilotMessage.create({
      data: {
        conversationId: convId,
        role: "ASSISTANT",
        content: response.answer,
        structuredData: JSON.stringify({ intent: response.intent, evidence: response.evidence, proposals: response.proposals })
      }
    });

    return NextResponse.json({ conversationId: convId, message });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
