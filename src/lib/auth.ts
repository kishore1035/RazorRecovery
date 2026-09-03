// Mocked server-side authentication for the purpose of Chunk 1 foundation.
// In later stages this will use NextAuth / Jose JWT verification.
import { prisma } from "./db";

export type AuthContext = {
  userId: string;
  merchantId: string;
  role: string;
};

/**
 * Mocks getting the current authenticated user context from headers/cookies.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  // For development/Chunk 1, we return the first owner we can find.
  // In a real scenario, this would decode a JWT or session cookie.
  try {
    const user = await prisma.user.findFirst({
      where: { role: "OWNER" },
    });
    
    if (!user) return null;
    
    return {
      userId: user.id,
      merchantId: user.merchantId,
      role: user.role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Tenant Isolation Helper
 * Wraps database queries to ensure they are always scoped to the authenticated merchant.
 */
export async function withTenant<T>(
  action: (merchantId: string) => Promise<T>
): Promise<T> {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.merchantId) {
    throw new Error("Unauthorized: No active tenant context.");
  }
  
  return action(ctx.merchantId);
}
