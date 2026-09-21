// Quick script to check the latest failed compilation
import prisma from '../lib/db';

async function main() {
  console.log('🔍 Fetching latest failed build job...\n');
  
  const failedJob = await prisma.buildJob.findFirst({
    where: {
      status: 'FAILED',
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      project: {
        select: {
          tokenName: true,
          tokenSymbol: true,
          contractType: true,
        },
      },
    },
  });

  if (!failedJob) {
    console.log('❌ No failed build jobs found.');
    console.log('\n💡 Try checking all build jobs:');
    const allJobs = await prisma.buildJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log(`Found ${allJobs.length} total build jobs`);
    allJobs.forEach(job => {
      console.log(`  - ${job.id}: ${job.status} (${job.currentStep})`);
    });
    return;
  }

  console.log('📋 Build Job Details:');
  console.log('━'.repeat(60));
  console.log(`ID: ${failedJob.id}`);
  console.log(`Project: ${failedJob.project.tokenName} (${failedJob.project.tokenSymbol})`);
  console.log(`Contract Type: ${failedJob.project.contractType}`);
  console.log(`Status: ${failedJob.status}`);
  console.log(`Progress: ${failedJob.progress}%`);
  console.log(`Current Step: ${failedJob.currentStep}`);
  console.log(`Created: ${failedJob.createdAt.toLocaleString()}`);
  console.log('━'.repeat(60));

  // Parse and show logs
  if (failedJob.logs) {
    try {
      const logs = JSON.parse(failedJob.logs);
      console.log('\n📝 Build Logs:');
      console.log('━'.repeat(60));
      logs.forEach((log: string) => console.log(log));
      console.log('━'.repeat(60));
    } catch {
      console.log('\n📝 Raw Logs:', failedJob.logs);
    }
  }

  // Show artifacts (contains the error details)
  if (failedJob.artifacts) {
    const artifacts = failedJob.artifacts as unknown as {
      error?: string;
      stderr?: string;
      stdout?: string;
      contractCode?: string;
      validationErrors?: string[];
    };
    
    console.log('\n🔴 Error Details:');
    console.log('━'.repeat(60));
    
    if (artifacts.error) {
      console.log('Error:', artifacts.error);
    }
    
    if (artifacts.stderr) {
      console.log('\n🚨 Compiler STDERR:');
      console.log(artifacts.stderr);
    }
    
    if (artifacts.stdout) {
      console.log('\n📤 Compiler STDOUT (first 1000 chars):');
      console.log(artifacts.stdout.substring(0, 1000));
    }
    
    if (artifacts.contractCode) {
      console.log('\n📄 Generated Contract Code:');
      console.log('━'.repeat(60));
      console.log(artifacts.contractCode);
      console.log('━'.repeat(60));
    }
    
    if (artifacts.validationErrors) {
      console.log('\n⚠️ Validation Errors:');
      artifacts.validationErrors.forEach((err: string) => console.log(`  - ${err}`));
    }
  }

  console.log('\n✅ Debug complete!');
  console.log('\n💡 To fix compilation errors:');
  console.log('1. Check the contract code above for syntax errors');
  console.log('2. Check the compiler stderr for specific error messages');
  console.log('3. Restart your dev server to load the latest fixes');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

