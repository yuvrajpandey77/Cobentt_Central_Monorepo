import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/models";

export const conversationsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const conversations = await prisma.conversation.findMany({
        where: { userId: ctx.auth.userId },
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
