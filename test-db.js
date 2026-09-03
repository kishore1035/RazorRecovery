const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const events = await prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log("Recent Webhooks:", events.map(e => ({ type: e.eventType, status: e.processingStatus })));
  
  const cases = await prisma.recoveryCase.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { order: true } });
  console.log("Recent Cases:", cases.map(c => ({ id: c.id, status: c.status, amount: c.riskAmount })));
}
main();
