import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { z } from "zod";
import {generateSlug} from "random-word-slugs"
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
    getOne: baseProcedure
    .input(z.object({
        id: z.string().min(1, { message: "ID is required" }),
    }))
    .query(async ({ input }) => {
        const existingProject = await prisma.project.findUnique({
            where: {
                id: input.id,
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
    getMany: baseProcedure
        .query(async () => {
            const projects = await prisma.project.findMany({
                orderBy: {
                    updatedAt: "desc",
                },
                // include: {
                //     fragments: true,
                // },
            });
            return projects;
        }),
    create: baseProcedure
        .input(z.object({
            value: z.string().min(1, { message: "Value is required" }).max(10000, { message: "Value must be less than 10000 characters" }),
        }))
        .mutation(async ({ input }) => {

            const createdProject = await prisma.project.create({
                data: {
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


})
