import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import {generateSlug} from "random-word-slugs"
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
    getOne: protectedProcedure
    .input(z.object({
        id: z.string().min(1, { message: "ID is required" }),
    }))
    .query(async ({ input, ctx }) => {
        const existingProject = await prisma.project.findUnique({
            where: {
                id: input.id,
                userId: ctx.auth.userId,
            },
            
        });
        if (!existingProject) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Project not found",
            });
        }
        return existingProject;
    }),
    getMany: protectedProcedure
        .query(async ({ ctx }) => {
            const projects = await prisma.project.findMany({
                where: {
                    userId: ctx.auth.userId,
                },
                orderBy: {
                    updatedAt: "desc",
                },
                include: {
                    messages: {
                        take: 1,
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
            });
            return projects;
        }),
    getAll: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(20).default(20),
            cursor: z.string().nullish(),
            projectType: z.enum(['webapp', 'contract']).optional(),
        }))
        .query(async ({ input }) => {
            const { limit, cursor, projectType } = input;
            
            // Map frontend values to database values
            const dbProjectType = projectType === 'webapp' ? 'WEBSITE' : 'DAPP';
            
            const projects = await prisma.project.findMany({
                take: limit + 1, // Take one extra to check if there are more
                cursor: cursor ? { id: cursor } : undefined,
                where: projectType ? { projectType: dbProjectType } : {},
                orderBy: {
                    updatedAt: "desc",
                },
                include: {
                    messages: {
                        take: 1,
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (projects.length > limit) {
                const nextItem = projects.pop();
                nextCursor = nextItem?.id;
            }

            return {
                projects,
                nextCursor,
            };
        }),
    create: protectedProcedure
        .input(z.object({
            value: z.string().min(1, { message: "Value is required" }).max(10000, { message: "Value must be less than 10000 characters" }),
        }))
        .mutation(async ({ input, ctx }) => {

            const createdProject = await prisma.project.create({
                data: {
                    userId: ctx.auth.userId,
                    name: generateSlug(2, {
                        format: "title",
                    }),
                    messages: {
                        create: {
                            content: input.value,
                            role: "USER",
                            type: "RESULT",
                        },
                    }
                },
                include: {
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { id: true },
                    },
                },
            });
                                
            await inngest.send({
                name: "Cogerphereai/runAgent",
                data: {
                    value: input.value,
                    projectId: createdProject.id,
                    userId: ctx.auth.userId,
                    messageId: createdProject.messages[0]?.id,
                },
            });
            return createdProject;
        }),

    createDapp: protectedProcedure
        .input(z.object({
            value: z.string().min(1, { message: "Value is required" }).max(10000, { message: "Value must be less than 10000 characters" }),
            blockchain: z.enum(['ETHEREUM', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'SOLANA']),
            contractType: z.enum(['ERC20', 'ERC721', 'ERC1155', 'PAYMENT_SPLITTER', 'CUSTOM']),
            tokenName: z.string().optional(),
            tokenSymbol: z.string().optional(),
            tokenSupply: z.string().optional(),
            decimals: z.string().optional(),
            network: z.enum(['MAINNET', 'TESTNET']),
            features: z.array(z.string()).default([]),
            // Enhanced configuration fields
            aiConfiguration: z.any().optional(),
            gasOptimizations: z.array(z.string()).default([]),
            securityRecommendations: z.array(z.string()).default([]),
            complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
            reasoning: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            console.log('🔥 createDapp mutation called with input:', input);
            
            const createdProject = await prisma.project.create({
                data: {
                    userId: ctx.auth.userId,
                    name: generateSlug(2, {
                        format: "title",
                    }),
                    projectType: 'DAPP',
                    blockchain: input.blockchain,
                    contractType: input.contractType,
                    tokenName: input.tokenName,
                    tokenSymbol: input.tokenSymbol,
                    tokenSupply: input.tokenSupply,
                    decimals: input.decimals,
                    network: input.network,
                    features: input.features,
                    // Enhanced configuration fields
                    aiConfiguration: input.aiConfiguration,
                    gasOptimizations: input.gasOptimizations,
                    securityNotes: input.securityRecommendations,
                    messages: {
                        create: {
                            content: input.value,
                            role: "USER",
                            type: "RESULT",
                        },
                    }
                },
            });

            // Create BuildJob for tracking progress
            const buildJob = await prisma.buildJob.create({
                data: {
                    projectId: createdProject.id,
                    type: 'GENERATE',
                    status: 'PENDING',
                    progress: 0,
                    currentStep: 'Queued for generation...',
                },
            });

            // Trigger contract generation with buildJobId
            console.log('📤 Sending Inngest event for contract generation:', {
                buildJobId: buildJob.id,
                projectId: createdProject.id,
                contractType: input.contractType,
            });
            
            await inngest.send({
                name: "contract/generate",
                data: {
                    buildJobId: buildJob.id,
                    projectId: createdProject.id,
                    userId: ctx.auth.userId, // Add userId for token tracking
                    contractType: input.contractType,
                    tokenName: input.tokenName,
                    tokenSymbol: input.tokenSymbol,
                    tokenSupply: input.tokenSupply,
                    decimals: input.decimals,
                    features: input.features,
                    // Enhanced configuration fields
                    aiConfiguration: input.aiConfiguration,
                    gasOptimizations: input.gasOptimizations,
                    securityRecommendations: input.securityRecommendations,
                    complexity: input.complexity,
                    reasoning: input.reasoning,
                },
            });

            return createdProject;
        }),

    getBuildJobs: protectedProcedure
        .input(z.object({
            projectId: z.string().min(1),
        }))
        .query(async ({ input, ctx }) => {
            const buildJobs = await prisma.buildJob.findMany({
                where: {
                    projectId: input.projectId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            return buildJobs;
        }),

    // Backfill/recapture screenshot for a single project
    captureScreenshot: protectedProcedure
        .input(z.object({
            projectId: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            // Ensure the project belongs to the user
            const project = await prisma.project.findFirst({
                where: { id: input.projectId, userId: ctx.auth.userId },
                select: { id: true },
            });
            if (!project) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
            }

            // Find latest fragment with sandboxUrl for this project
            const latestWithFragment = await prisma.message.findFirst({
                where: { projectId: input.projectId },
                orderBy: { createdAt: "desc" },
                include: { fragments: true },
            });
            const sandboxUrl = latestWithFragment?.fragments?.sandboxUrl;
            if (!sandboxUrl) {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No sandbox available for screenshot" });
            }

            try {
                const { chromium } = await import("playwright");
                const sharp = (await import("sharp")).default;
                const browser = await chromium.launch({ args: ["--no-sandbox"] });
                const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
                try {
                    await page.goto(sandboxUrl, { waitUntil: "networkidle", timeout: 60000 });
                    await page.waitForTimeout(1500);
                    const raw = await page.screenshot({ fullPage: true, type: "png" });
                    const jpeg = await sharp(raw).resize({ width: 1200 }).jpeg({ quality: 70 }).toBuffer();
                    await prisma.project.update({
                        where: { id: input.projectId },
                        data: { screenshot: jpeg, screenshotMime: "image/jpeg" } as any,
                    });
                } finally {
                    await page.close();
                    await browser.close();
                }
                return { ok: true } as const;
            } catch (err) {
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Screenshot failed" });
            }
        }),


})
