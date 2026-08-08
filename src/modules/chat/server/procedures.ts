import prisma from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/models";
import { randomUUID } from "crypto";

/** Persist attachment refs ({ id, fileName, size }) onto a message row. */
async function attachRefsToMessage(
  messageId: string,
  conversationId: string,
  attachmentIds?: string[]
): Promise<void> {
  if (!attachmentIds || attachmentIds.length === 0) return;
  const atts = await prisma.attachment.findMany({
    where: { id: { in: attachmentIds }, conversationId },
    select: { id: true, fileName: true, size: true },
  });
  if (atts.length === 0) return;
  await prisma.message.update({
    where: { id: messageId },
    data: {
      attachments: atts.map((a) => ({ id: a.id, fileName: a.fileName, size: a.size })),
    },
  });
}

export const conversationsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const conversations = await prisma.conversation.findMany({
          where: { userId: ctx.auth.userId },
          take: 100,
          orderBy: [
            { isPinned: "desc" },
            { updatedAt: "desc" },
          ],
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { content: true, role: true, createdAt: true },
            },
          },
        });
        return conversations;
      } catch {
        return [];
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.id, userId: ctx.auth.userId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { fragments: true },
          },
        },
      });
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      return conversation;
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().max(255).optional(),
      initialMessage: z.string().min(1).max(10000),
      model: z.string().optional(),
      mode: z.string().optional(),
      template: z.string().optional(),
      attachmentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.create({
        data: {
          userId: ctx.auth.userId,
          title: input.title || input.initialMessage.slice(0, 100),
          mode: input.mode || "chat",
          model: input.model || DEFAULT_MODEL,
          template: input.template || null,
          messages: {
            create: {
              content: input.initialMessage,
              role: "USER",
              type: "RESULT",
              status: "COMPLETE",
            },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
      const createdMessage = conversation.messages[0];
      if (createdMessage) {
        await attachRefsToMessage(
          createdMessage.id,
          conversation.id,
          input.attachmentIds
        );
      }
      return conversation;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      title: z.string().max(255).optional(),
      isPinned: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      model: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.conversation.findFirst({
        where: { id: input.id, userId: ctx.auth.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      const conversation = await prisma.conversation.update({
        where: { id: input.id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
          ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
          ...(input.model !== undefined ? { model: input.model } : {}),
        },
      });
      return conversation;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.conversation.findFirst({
        where: { id: input.id, userId: ctx.auth.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      await prisma.conversation.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  getByMode: protectedProcedure
    .input(z.object({ mode: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const conversations = await prisma.conversation.findMany({
          where: { userId: ctx.auth.userId, mode: input.mode },
          orderBy: [
            { isPinned: "desc" },
            { updatedAt: "desc" },
          ],
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { content: true, role: true, createdAt: true },
            },
          },
        });
        return conversations;
      } catch {
        return [];
      }
    }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const q = input.query.toLowerCase();
      const conversations = await prisma.conversation.findMany({
        where: { userId: ctx.auth.userId },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { content: true, role: true, createdAt: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
      return conversations.filter((c) => {
        const titleMatch = c.title?.toLowerCase().includes(q);
        const messageMatch = c.messages.some((m) =>
          m.content?.toLowerCase().includes(q)
        );
        return titleMatch || messageMatch;
      });
    }),

  setShare: protectedProcedure
    .input(z.object({
      conversationId: z.string().min(1),
      isPublic: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, userId: ctx.auth.userId },
        select: { id: true, shareToken: true },
      });
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      const updated = await prisma.conversation.update({
        where: { id: input.conversationId },
        data: {
          isPublic: input.isPublic,
          ...(input.isPublic && !conversation.shareToken
            ? { shareToken: randomUUID() }
            : {}),
        },
        select: { isPublic: true, shareToken: true },
      });
      return updated;
    }),

  getShareStatus: protectedProcedure
    .input(z.object({ conversationId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, userId: ctx.auth.userId },
        select: { isPublic: true, shareToken: true },
      });
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      return conversation;
    }),

  // Public, token-gated read for anyone who has the share link.
  getSharedByToken: baseProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { shareToken: input.token, isPublic: true },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { fragments: true },
          },
        },
      });
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shared conversation not found" });
      }
      return conversation;
    }),

  // Signed-in users can fork a shared conversation into their own workspace.
  forkShared: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const source = await prisma.conversation.findFirst({
        where: { shareToken: input.token, isPublic: true },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shared conversation not found" });
      }
      const forked = await prisma.conversation.create({
        data: {
          userId: ctx.auth.userId,
          title: source.title ? `${source.title} (copy)` : "Shared chat copy",
          mode: source.mode || "chat",
          model: source.model || DEFAULT_MODEL,
          messages: {
            create: source.messages.map((m) => ({
              content: m.content,
              role: m.role,
              type: "RESULT",
              status: "COMPLETE",
              attachments: (m.attachments ?? undefined) as Prisma.InputJsonValue | undefined,
              thinking: (m.thinking ?? undefined) as Prisma.InputJsonValue | undefined,
            })),
          },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      return forked;
    }),
});

export const chatMessagesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ conversationId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, userId: ctx.auth.userId },
        select: { id: true },
      });
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }
      const messages = await prisma.message.findMany({
        where: { conversationId: input.conversationId },
        orderBy: { createdAt: "asc" },
        include: { fragments: true },
      });
      return messages;
    }),

  create: protectedProcedure
    .input(z.object({
      conversationId: z.string().min(1),
      content: z.string().min(1).max(10000),
      parentMessageId: z.string().optional(),
      attachmentIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, userId: ctx.auth.userId },
        select: { id: true, title: true, messages: { take: 1 } },
      });
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      const message = await prisma.message.create({
        data: {
          conversationId: input.conversationId,
          content: input.content,
          role: "USER",
          type: "RESULT",
          status: "COMPLETE",
          parentMessageId: input.parentMessageId || null,
        },
      });

      await attachRefsToMessage(message.id, input.conversationId, input.attachmentIds);

      // Auto-title: set title from first user message if not yet set
      if (!conversation.title && conversation.messages.length === 0) {
        await prisma.conversation.update({
          where: { id: input.conversationId },
          data: { title: input.content.slice(0, 100) },
        });
      }

      return message;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const message = await prisma.message.findFirst({
        where: {
          id: input.id,
          conversation: { userId: ctx.auth.userId },
        },
        select: { id: true },
      });
      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }
      await prisma.message.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  regenerate: protectedProcedure
    .input(z.object({
      conversationId: z.string().min(1),
      userMessageId: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.conversation.findFirst({
        where: { id: input.conversationId, userId: ctx.auth.userId },
        select: { id: true },
      });
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      const userMessage = await prisma.message.findFirst({
        where: { id: input.userMessageId, conversationId: input.conversationId, role: "USER" },
        select: { id: true, content: true },
      });
      if (!userMessage) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User message not found" });
      }

      // Delete any existing assistant replies branching from this user message
      await prisma.message.deleteMany({
        where: { parentMessageId: input.userMessageId, conversationId: input.conversationId },
      });

      return { userMessageContent: userMessage.content };
    }),

  feedback: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      value: z.number().int().min(-1).max(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const message = await prisma.message.findFirst({
        where: {
          id: input.id,
          conversation: { userId: ctx.auth.userId },
        },
        select: { id: true },
      });
      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }
      await prisma.message.update({
        where: { id: input.id },
        data: { feedbackValue: input.value },
      });
      return { ok: true };
    }),
});
