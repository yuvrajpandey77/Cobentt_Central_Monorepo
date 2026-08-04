import { projectsRouter } from '@/modules/projects/server/procedures';
import {  createTRPCRouter } from '../init';
import { messagesRouter } from '@/modules/messages/server/procedures';
import { usageRouter } from './usage';
import { adminRouter } from './admin';
import { settingsRouter } from './settings';
import { conversationsRouter, chatMessagesRouter } from '@/modules/chat/server/procedures';

export const appRouter = createTRPCRouter({
  messages: messagesRouter,
  projects: projectsRouter,
  usage: usageRouter,
  admin: adminRouter,
  settings: settingsRouter,
  conversations: conversationsRouter,
  chatMessages: chatMessagesRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;