import { createAuthMiddleware } from "better-auth/api";

// Login alias approved by the account owner; this does not grant any role.
export const adminLoginAlias = createAuthMiddleware(async context => {
  if (context.path !== "/sign-in/email" || typeof context.body?.email !== "string") return;
  if (context.body.email.trim().toLowerCase() !== "admin") return;
  return { context: { ...context, body: { ...context.body, email: "jerrymross@gmail.com" } } };
});
