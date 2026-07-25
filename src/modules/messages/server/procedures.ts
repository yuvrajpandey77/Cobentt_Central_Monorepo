import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { createTRPCRouter, baseProcedure, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { enforceQuota } from "@/lib/quota-enforcement";
import { estimateTokens } from "@/lib/token-estimator";

export const messagesRouter = createTRPCRouter({
    getMany: baseProcedure
        .input(z.object({
            projectId: z.string().min(1, { message: "Project ID is required" }),
        }))

        .query(async ({ input, ctx }) => {
            const project = await prisma.project.findUnique({
                where: { id: input.projectId },
                select: { userId: true, isPublic: true },
            });
            if (!project) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
            }

            const isOwner = ctx.auth?.userId && project.userId === ctx.auth.userId;
            if (!isOwner && !project.isPublic) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' });
            }

            const messages = await prisma.message.findMany({
                where: {
                    projectId: input.projectId,
                },

                include: {
                    fragments: true,
                },
                orderBy: {
                    updatedAt: "asc",
                },
            });
            return messages;
        }),
    create: protectedProcedure
        .input(z.object({
            value: z.string().min(1, { message: "Value is required" }).max(10000, { message: "Value must be less than 10000 characters" }),
            projectId: z.string().min(1, { message: "Project ID is required" }),
        }))
        .mutation(async ({ input, ctx }) => {
            const estimatedTokens = estimateTokens(input.value) + 2000;
            const quotaCheck = await enforceQuota(ctx.auth.userId, estimatedTokens);

            const existingProject = await prisma.project.findUnique({
                where: {
                    id: input.projectId,
                    userId: ctx.auth.userId,
                },
            });
            if (!existingProject) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Project not found",
                });
            }
            const createdMessage = await prisma.message.create({
                data: {
                    projectId: existingProject.id,
                    content: input.value,
                    role: "USER",
                    type: "RESULT",
                },
            });
            await inngest.send({
                name: "Cobentt/runAgent",
                data: {
                    value: input.value,
                    projectId: input.projectId,
                    userId: ctx.auth.userId,
                    messageId: createdMessage.id,
                    quotaWarnings: quotaCheck.warnings,
                },
            });
            return createdMessage;
        }),


})
