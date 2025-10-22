# Inngest Contract Compilation Fixes

## Issues Identified and Fixed

### 1. **Incorrect Solc Output Parsing** ✅ FIXED
**Problem:** The original code used separate `--abi` and `--bin` flags and tried to parse the output using regex patterns that didn't match the actual solc output format.

**Solution:** 
- Changed to use `--combined-json abi,bin` which outputs a structured JSON that's much easier and more reliable to parse
- Replaced fragile regex parsing with proper JSON parsing
- Added validation to ensure both ABI and bytecode are extracted successfully

**Before:**
```bash
npx solc --abi --bin --optimize --base-path . --include-path node_modules contracts/Token.sol
```

**After:**
```bash
npx solc --combined-json abi,bin --optimize --optimize-runs 200 --base-path . --include-path node_modules contracts/Token.sol
```

### 2. **OpenZeppelin Version Compatibility** ✅ FIXED
**Problem:** The code installed `@openzeppelin/contracts` without specifying a version, which could install any version (v4 or v5), but the generated Solidity code was designed for v5.

**Solution:**
- Pinned OpenZeppelin to `^5.0.0` to ensure compatibility with generated contract code
- Added error checking for npm installation to fail early if dependencies can't be installed

**Before:**
```typescript
await sandbox.commands.run("npm install @openzeppelin/contracts");
```

**After:**
```typescript
const ozInstall = await sandbox.commands.run("npm install @openzeppelin/contracts@^5.0.0");
if (ozInstall.exitCode !== 0) {
  throw new Error(`Failed to install OpenZeppelin: ${ozInstall.stderr || 'Unknown error'}`);
}
```

### 3. **Poor Error Handling** ✅ FIXED
**Problem:** 
- npm install failures were not detected
- Solc compilation errors were not properly logged to the database
- Generic error messages didn't help identify the root cause

**Solution:**
- Added exit code checking for all npm commands
- Save compilation errors, stdout, and stderr to the database for debugging
- Added specific error messages for common failure scenarios
- Added contract verification step to ensure file was written correctly

### 4. **Missing Validation Steps** ✅ FIXED
**Problem:** No verification that dependencies were installed or contracts were written correctly before compilation.

**Solution:**
- Added OpenZeppelin installation verification
- Added contract file verification (reads first 20 lines to confirm it was written)
- Better logging at each step to identify where failures occur

### 5. **Incomplete Error Recovery** ✅ FIXED
**Problem:** When compilation failed, the error state wasn't always saved to the database, making it hard to debug.

**Solution:**
- Ensured all error paths update the BuildJob status to 'FAILED'
- Save contract code, stdout, stderr, and error messages to the artifacts field
- Added check to prevent duplicate status updates

## Key Changes to `src/inngest/functions.ts`

### Compilation Command
```typescript
// Old approach - unreliable output format
npx solc --abi --bin --optimize --base-path . --include-path node_modules contracts/Token.sol

// New approach - structured JSON output
npx solc --combined-json abi,bin --optimize --optimize-runs 200 --base-path . --include-path node_modules contracts/Token.sol
```

### Output Parsing
```typescript
// Old - fragile regex parsing
const abiMatch = output.match(/======= contracts\/Token.sol:.*? =======[\s\S]+?Contract JSON ABI[\s\S]+?(\[[\s\S]*?\])/);
const bytecodeMatch = output.match(/Binary:\s+(0x[a-fA-F0-9]+)/);

// New - robust JSON parsing
const combinedOutput = JSON.parse(result.stdout);
const contractPath = Object.keys(combinedOutput.contracts || {}).find(key => 
  key.includes('Token.sol')
);
const contractData = combinedOutput.contracts[contractPath];
abi = typeof contractData.abi === 'string' ? JSON.parse(contractData.abi) : contractData.abi;
bytecode = contractData.bin.startsWith('0x') ? contractData.bin : '0x' + contractData.bin;
```

### Error Handling
```typescript
// Added comprehensive error logging
if (result.exitCode !== 0) {
  await prisma.buildJob.update({
    where: { id: buildJobId },
    data: {
      status: 'FAILED',
      progress: 0,
      currentStep: 'Compilation failed',
      artifacts: {
        error: errorOutput,
        stdout: result.stdout,
        stderr: result.stderr,
        contractCode: contractCode, // Save the failing contract for debugging
      },
    },
  });
  throw new Error(`Solc compilation failed with exit code ${result.exitCode}: ${errorOutput.substring(0, 200)}`);
}
```

### Validation Steps
```typescript
// Verify dependencies installed
const lsResult = await sandbox.commands.run("ls -la node_modules/@openzeppelin/contracts/token/ERC20/ 2>&1 || echo 'Directory not found'");

// Verify contract was written correctly
const catResult = await sandbox.commands.run("cat contracts/Token.sol | head -20");
console.log('Contract file preview:', catResult.stdout);
```

## Testing the Fixes

To verify these fixes work:

1. **Test successful compilation:**
   - Create a new contract build job
   - Check that it completes successfully
   - Verify the ABI and bytecode are extracted correctly

2. **Test error scenarios:**
   - Invalid Solidity syntax → Should save error with line numbers in database
   - Missing dependencies → Should fail early with clear error message
   - Sandbox timeout → Should save timeout error to database

3. **Check database artifacts:**
   ```sql
   SELECT artifacts FROM "BuildJob" WHERE status = 'FAILED';
   ```
   Should contain: error message, stdout, stderr, and contractCode

## Potential Remaining Issues

1. **Sandbox timeout:** Long compilation times (>5 minutes) might timeout
   - **Solution:** The current implementation should handle this gracefully

2. **E2B API rate limits:** Heavy usage might hit rate limits
   - **Solution:** Add retry logic with exponential backoff (future enhancement)

3. **Large contracts:** Very large contracts might exceed sandbox memory
   - **Solution:** Monitor and add limits if this becomes an issue

## How to Debug Future Compilation Errors

When a compilation error occurs:

1. **Check the console logs:** The error is logged with full details
2. **Query the database:**
   ```typescript
   const job = await prisma.buildJob.findUnique({
     where: { id: buildJobId }
   });
   console.log(job.artifacts);
   ```
3. **Review the saved contract code:** The failing contract is saved in artifacts.contractCode
4. **Check stdout/stderr:** Full compiler output is saved for analysis

## New Features Added

### Contract Syntax Validation ✅
Added a `validateContractSyntax()` function that runs **before** compilation to catch common errors:
- Missing SPDX license identifier
- Invalid or missing pragma statement
- Missing contract declaration
- Mismatched braces or parentheses
- Invalid import statements
- Missing Ownable initialization (OpenZeppelin v5 requirement)

This pre-validation step saves time and resources by catching obvious errors before spinning up an E2B sandbox.

## Summary

The main issue was **unreliable parsing of solc output** using regex patterns. By switching to `--combined-json` output format, we get a structured JSON response that can be reliably parsed. Additional improvements include:

- ✅ Better error handling at each step with exit code checking
- ✅ Pinned OpenZeppelin version (v5.x) for consistency
- ✅ Pre-compilation syntax validation to catch errors early
- ✅ Comprehensive error logging to database (contract code, stdout, stderr)
- ✅ Contract verification before compilation
- ✅ Dependency verification steps
- ✅ Improved error messages for common failure scenarios

These changes should eliminate the "Contract compilation failed: exit status 1" error you were seeing, or at least provide much better debugging information when it does occur.

## Quick Test

To test these fixes, try creating a contract with the DApp Studio:

1. **Test ERC20 with all features:**
   ```typescript
   {
     contractType: 'ERC20',
     tokenName: 'TestToken',
     tokenSymbol: 'TEST',
     tokenSupply: '1000000',
     decimals: '18',
     features: ['mintable', 'burnable', 'pausable', 'permit']
   }
   ```

2. **Monitor the build progress:**
   - Check the console for detailed logging
   - Watch the progress percentage update
   - Review the logs in the database

3. **Verify the output:**
   - Successful compilation should have ABI and bytecode in artifacts
   - Failed compilation should have error, stdout, stderr, and contractCode in artifacts

4. **Check error scenarios:**
   - The validation will catch basic syntax errors before compilation
   - The compilation will catch Solidity-specific errors with full error messages saved

