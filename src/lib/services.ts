import { prisma } from "./db";
import { withTenant } from "./auth";

// --- Customer Service ---
export const CustomerService = {
  async list(page = 1, pageSize = 20) {
    return withTenant(async (merchantId) => {
      // Find all stores for this merchant to restrict customer query
      const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
      const storeIds = stores.map(s => s.id);

      const [data, total] = await Promise.all([
        prisma.customer.findMany({
          where: { storeId: { in: storeIds } },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: {
            orders: { select: { total: true, status: true } },
          }
        }),
        prisma.customer.count({ where: { storeId: { in: storeIds } } }),
      ]);
      return { data, total, page, pageSize };
    });
  },
  
  async get(customerId: string) {
    return withTenant(async (merchantId) => {
      const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
      const storeIds = stores.map(s => s.id);
      
      return prisma.customer.findFirst({
        where: { id: customerId, storeId: { in: storeIds } },
        include: {
          orders: {
            orderBy: { createdAt: "desc" },
            include: { payments: true }
          }
        }
      });
    });
  },
};

// --- Product Service ---
export const ProductService = {
  async list(page = 1, pageSize = 20) {
    return withTenant(async (merchantId) => {
      const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
      const storeIds = stores.map(s => s.id);

      const [data, total] = await Promise.all([
        prisma.product.findMany({
          where: { storeId: { in: storeIds } },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" }
        }),
        prisma.product.count({ where: { storeId: { in: storeIds } } }),
      ]);
      return { data, total, page, pageSize };
    });
  },
};

// --- Order Service ---
export const OrderService = {
  async list(page = 1, pageSize = 20) {
    return withTenant(async (merchantId) => {
      const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
      const storeIds = stores.map(s => s.id);

      const [data, total] = await Promise.all([
        prisma.order.findMany({
          where: { storeId: { in: storeIds } },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
          include: { customer: true, items: true }
        }),
        prisma.order.count({ where: { storeId: { in: storeIds } } }),
      ]);
      return { data, total, page, pageSize };
    });
  },
};

// --- Journey Service ---
export const JourneyService = {
  async getCustomerJourney(customerId: string) {
    return withTenant(async (merchantId) => {
      const stores = await prisma.store.findMany({ where: { merchantId }, select: { id: true } });
      const storeIds = stores.map(s => s.id);
      
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, storeId: { in: storeIds } }
      });
      if (!customer) throw new Error("Customer not found or unauthorized");

      // Fetch checkout sessions with events
      const checkoutSessions = await prisma.checkoutSession.findMany({
        where: { customerId },
        include: {
          events: { orderBy: { timestamp: "asc" } },
          order: {
            include: { payments: { orderBy: { createdAt: "asc" } }, items: true }
          }
        },
        orderBy: { createdAt: "asc" }
      });

      return checkoutSessions;
    });
  }
};
