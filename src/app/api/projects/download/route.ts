import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import JSZip from "jszip";

// Ensure this API route is always dynamic (avoid static path generation attempts)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    // Get all fragments for the project
    const fragments = await prisma.fragment.findMany({
      where: {
        message: {
          projectId: projectId,
        },
      },
      include: {
        message: true,
      },
    } as any);

    if (!fragments || fragments.length === 0) {
      return NextResponse.json({ error: "No files found for this project" }, { status: 404 });
    }

    // Create a new ZIP file
    const zip = new JSZip();

    // Add files from all fragments
    fragments.forEach((fragment, fragmentIndex) => {
      const files = fragment.files as Record<string, string>;
      
      if (files && Object.keys(files).length > 0) {
        // Create a folder for each fragment if there are multiple fragments
        const folderName = fragments.length > 1 ? `fragment-${fragmentIndex + 1}` : '';
        
        Object.entries(files).forEach(([path, content]) => {
          const fullPath = folderName ? `${folderName}/${path}` : path;
          zip.file(fullPath, content);
        });
      }
    });

    // Generate the ZIP file
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Get project name for the filename
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    } as any);

    const projectName = project?.name || "project";
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filename = `${sanitizedProjectName}_code.zip`;

    // Return the ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("Download error:", error);
    return NextResponse.json({ error: error?.message || "Download failed" }, { status: 500 });
  }
}
