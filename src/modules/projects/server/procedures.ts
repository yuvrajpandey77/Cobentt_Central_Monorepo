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
        }))
        .query(async ({ input }) => {
            const { limit, cursor } = input;
            
            const projects = await prisma.project.findMany({
                take: limit + 1, // Take one extra to check if there are more
                cursor: cursor ? { id: cursor } : undefined,
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
            });
                                
            await inngest.send({
                name: "Cogerphereai/runAgent",
                data: {
                    value: input.value,
                    projectId: createdProject.id,
                },
            });
            return createdProject;
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
