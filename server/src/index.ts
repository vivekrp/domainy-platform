import { initTRPC, TRPCError } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';
import { 
  registerUserInputSchema, 
  loginInputSchema, 
  addDomainInputSchema, 
  updateDomainInputSchema, 
  deleteDomainInputSchema 
} from './schema';
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { addDomain } from './handlers/add_domain';
import { getDomains } from './handlers/get_domains';
import { updateDomain } from './handlers/update_domain';
import { deleteDomain } from './handlers/delete_domain';
import { whoisLookup } from './handlers/whois_lookup';

// Context type for user authentication
interface Context {
  user?: { id: string; email: string };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Domain management routes (protected)
  addDomain: protectedProcedure
    .input(addDomainInputSchema)
    .mutation(({ input, ctx }) => addDomain({ ...input, user_id: ctx.user.id })),

  getDomains: protectedProcedure
    .query(({ ctx }) => getDomains(ctx.user.id)),

  updateDomain: protectedProcedure
    .input(updateDomainInputSchema)
    .mutation(({ input, ctx }) => updateDomain({ ...input, user_id: ctx.user.id })),

  deleteDomain: protectedProcedure
    .input(deleteDomainInputSchema)
    .mutation(({ input, ctx }) => deleteDomain({ ...input, user_id: ctx.user.id })),

  // Utility routes
  whoisLookup: protectedProcedure
    .input(z.object({ domain_name: z.string() }))
    .query(({ input }) => whoisLookup(input.domain_name)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext(): Context {
      // In a real app, you'd extract user info from JWT token in headers
      return {};
    },
  });
  server.listen(port);
  console.log(`Domainy tRPC server listening at port: ${port}`);
}

start();