# Policy Engine Module Documentation

## Overview

The **Policy Engine Module** is an internal service responsible for **evaluating content against policy rules**. It provides pattern matching capabilities (keyword and regex) to detect sensitive data, policy violations, or specific patterns in text content.

**Key Characteristics:**

- ✅ Internal service (no HTTP controller/API)
- ✅ Stateless and thread-safe
- ✅ Used by Scanner, Monitor, and other modules
- ✅ High performance with configurable limits
- ✅ Comprehensive test coverage (94%+)

---

## Architecture

```
┌─────────────────────────────────────────┐
│     Scanner/Monitor/Other Modules       │
│     (Provide content + policies)        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      PolicyEngineService                │
│  • Orchestrates evaluation              │
│  • Validates policies                   │
│  • Returns structured results           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      PolicyMatcher                      │
│  • Keyword matching                     │
│  • Regex matching                       │
│  • Context extraction                   │
│  • Line/column calculation              │
└─────────────────────────────────────────┘
```

---

## Core Concepts

### 1. **PolicyMatch**

Represents a single pattern match found in content:

```typescript
{
  policy: PolicyEntity,           // The policy that matched
  matchedText: "api_key",          // The actual matched text
  startIndex: 15,                  // Character position (0-based)
  endIndex: 22,
  lineNumber: 2,                   // Line number (1-based)
  columnNumber: 7,                 // Column number (1-based)
  contextBefore: ["line 1"],       // Lines before match
  contextAfter: ["line 3"]         // Lines after match
}
```

### 2. **PolicyEvaluationResult**

Result of evaluating content against a single policy:

```typescript
{
  policy: PolicyEntity,
  hasMatches: true,
  matchCount: 3,
  matches: PolicyMatch[],
  error?: "Invalid regex pattern"  // If evaluation failed
}
```

### 3. **PolicyEngineResult**

Complete evaluation results for multiple policies:

```typescript
{
  policiesEvaluated: 5,            // Total policies checked
  policiesMatched: 2,              // Policies with matches
  totalMatches: 7,                 // Total matches found
  results: PolicyEvaluationResult[],
  errors: [{ policyId: 3, error: "..." }]
}
```

---

## API Reference

### **PolicyEngineService**

#### **evaluate(content, policies, options?)**

Evaluate content against multiple policies.

```typescript
const service = new PolicyEngineService();

const result = service.evaluate(
  fileContent,
  [policy1, policy2, policy3],
  {
    maxMatchesPerPolicy: 100,
    contextLinesBefore: 2,
    contextLinesAfter: 2,
    caseInsensitive: false,
    includeDisabled: false,
  },
);

console.log(`Found ${result.totalMatches} matches`);
console.log(
  `${result.policiesMatched}/${result.policiesEvaluated} policies matched`,
);
```

**Parameters:**

- `content` (string) - Text content to evaluate
- `policies` (PolicyEntity[]) - Array of policies to evaluate
- `options` (optional) - Evaluation options

**Returns:** `PolicyEngineResult`

---

#### **evaluatePolicy(content, policy, options?)**

Evaluate content against a single policy.

```typescript
const result = service.evaluatePolicy(
  "const api_key = 'secret';",
  passwordPolicy,
  { caseInsensitive: true },
);

if (result.hasMatches) {
  console.log(`Found ${result.matchCount} matches`);
  result.matches.forEach((match) => {
    console.log(`  Line ${match.lineNumber}: ${match.matchedText}`);
  });
}
```

**Returns:** `PolicyEvaluationResult`

---

#### **hasAnyMatch(content, policies, options?)**

Fast check if content matches any policy (returns on first match).

```typescript
const hasSensitiveData = service.hasAnyMatch(
  fileContent,
  allPolicies,
);

if (hasSensitiveData) {
  console.log("Sensitive data detected!");
}
```

**Returns:** `boolean`

**Use Case:** Quick validation without needing detailed match information.

---

#### **getSummary(result)**

Extract summary statistics from evaluation result.

```typescript
const summary = service.getSummary(result);

console.log(`Evaluated: ${summary.policiesEvaluated}`);
console.log(`Matched: ${summary.policiesMatched}`);
console.log(`Failed: ${summary.policiesFailed}`);
console.log(`Avg matches per policy: ${summary.avgMatchesPerPolicy}`);
```

---

## Evaluation Options

```typescript
interface EvaluationOptions {
  /** Max matches per policy (0 = unlimited). Default: 100 */
  maxMatchesPerPolicy?: number;

  /** Lines before match for context. Default: 2 */
  contextLinesBefore?: number;

  /** Lines after match for context. Default: 2 */
  contextLinesAfter?: number;

  /** Case-insensitive matching. Default: false */
  caseInsensitive?: boolean;

  /** Evaluate disabled policies. Default: false */
  includeDisabled?: boolean;
}
```

---

## Pattern Matching

### **Keyword Matching**

Simple string search with optional case-insensitivity.

```typescript
// Find all occurrences of "password"
const policy: PolicyEntity = {
  id: 1,
  userId: 1,
  name: "Password Keyword",
  pattern: "password",
  type: "keyword",
  isEnabled: true,
  // ...
};

const content = "const password = 'secret'; // password here";
const result = service.evaluatePolicy(content, policy);

// Result: 2 matches found
```

**Case-Insensitive:**

```typescript
const result = service.evaluatePolicy(content, policy, {
  caseInsensitive: true,
});
// Matches: "password", "Password", "PASSWORD", etc.
```

---

### **Regex Matching**

Full regular expression support with capturing groups.

```typescript
// Find email addresses
const emailPolicy: PolicyEntity = {
  id: 2,
  userId: 1,
  name: "Email Pattern",
  pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  type: "regex",
  isEnabled: true,
  // ...
};

const content = "Contact: user@example.com, admin@test.org";
const result = service.evaluatePolicy(content, emailPolicy);

// Result: 2 email addresses found
```

**Common Patterns:**

```typescript
// Credit Card (Visa/MC format)
pattern: "\\d{4}-\\d{4}-\\d{4}-\\d{4}";

// SSN
pattern: "\\d{3}-\\d{2}-\\d{4}";

// API Keys (hex format)
pattern: "[a-fA-F0-9]{32,64}";

// AWS Access Key
pattern: "AKIA[0-9A-Z]{16}";

// IP Address
pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b";
```

---

## Usage Examples

### **Example 1: File Scanning**

```typescript
import { PolicyEngineModule } from "./modules/policyEngine";
import { policyRepository } from "./modules/policy";
import fs from "fs";

// Initialize
const policyEngine = new PolicyEngineModule();
const service = policyEngine.policyEngineService;
const policyRepo = new policyRepository(DB_PATH);

// Get active policies for user
const policies = policyRepo
  .getAllPoliciesByUserId(userId)
  .filter((p) => p.isEnabled);

// Read file content
const fileContent = fs.readFileSync("/path/to/file.txt", "utf-8");

// Evaluate
const result = service.evaluate(fileContent, policies, {
  maxMatchesPerPolicy: 50,
  contextLinesBefore: 3,
  contextLinesAfter: 3,
});

// Process results
if (result.totalMatches > 0) {
  console.log(`⚠️  Found ${result.totalMatches} policy violations!`);

  for (const policyResult of result.results) {
    if (policyResult.hasMatches) {
      console.log(`\nPolicy: ${policyResult.policy.name}`);
      console.log(`Matches: ${policyResult.matchCount}`);

      policyResult.matches.forEach((match) => {
        console.log(
          `  Line ${match.lineNumber}, Col ${match.columnNumber}`,
        );
        console.log(`  Matched: "${match.matchedText}"`);
      });
    }
  }
}

// Check for errors
if (result.errors.length > 0) {
  console.error("Policy evaluation errors:");
  result.errors.forEach((err) => {
    console.error(`  Policy ${err.policyId}: ${err.error}`);
  });
}
```

---

### **Example 2: Real-Time Monitoring**

```typescript
import chokidar from "chokidar";

const service = new PolicyEngineService();
const policies = await loadActivePolicies(userId);

// Watch directory for changes
const watcher = chokidar.watch("/path/to/monitor", {
  persistent: true,
  ignoreInitial: false,
});

watcher.on("add", async (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");

  // Quick check if file contains sensitive data
  const hasSensitiveData = service.hasAnyMatch(content, policies);

  if (hasSensitiveData) {
    // Full evaluation to get details
    const result = service.evaluate(content, policies);

    // Create alert
    await alertService.create({
      severity: "high",
      message: `Sensitive data detected in ${filePath}`,
      threatCount: result.totalMatches,
    });
  }
});
```

---

### **Example 3: Batch Processing**

```typescript
const files = listFilesInDirectory("/project");
const policies = await loadPolicies(userId);

let totalMatches = 0;
const violations: Array<{ file: string; matches: number }> = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8");
  const result = service.evaluate(content, policies, {
    maxMatchesPerPolicy: 10, // Limit for performance
  });

  if (result.totalMatches > 0) {
    totalMatches += result.totalMatches;
    violations.push({
      file,
      matches: result.totalMatches,
    });
  }
}

console.log(`Scanned ${files.length} files`);
console.log(
  `Found ${totalMatches} violations in ${violations.length} files`,
);
```

---

### **Example 4: Custom Validation**

```typescript
// Validate user input before saving
async function validateUserInput(input: string): Promise<boolean> {
  const service = new PolicyEngineService();

  const forbiddenPatterns: PolicyEntity[] = [
    {
      id: 1,
      userId: 1,
      name: "SQL Injection",
      pattern: "(DROP|DELETE|INSERT|UPDATE)\\s+(TABLE|FROM|INTO)",
      type: "regex",
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      userId: 1,
      name: "XSS",
      pattern: "<script[^>]*>",
      type: "regex",
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return !service.hasAnyMatch(input, forbiddenPatterns, {
    caseInsensitive: true,
  });
}

// Usage
if (await validateUserInput(userInput)) {
  await saveToDatabase(userInput);
} else {
  throw new Error("Invalid input detected");
}
```

---

## Performance Considerations

### **Optimization Tips**

1. **Limit Matches Per Policy**

   ```typescript
   // For large files, limit matches to avoid memory issues
   const result = service.evaluate(content, policies, {
     maxMatchesPerPolicy: 50,
   });
   ```

2. **Use hasAnyMatch for Quick Checks**

   ```typescript
   // Fast check without detailed match info
   if (service.hasAnyMatch(content, policies)) {
     // Only do full evaluation if needed
     const result = service.evaluate(content, policies);
   }
   ```

3. **Filter Policies**

   ```typescript
   // Only evaluate relevant policies
   const relevantPolicies = policies.filter(
     (p) => p.isEnabled && p.type === "keyword",
   );
   ```

4. **Chunk Large Files**

   ```typescript
   // For very large files, process in chunks
   const chunkSize = 1024 * 1024; // 1MB
   let offset = 0;

   while (offset < fileContent.length) {
     const chunk = fileContent.substring(offset, offset + chunkSize);
     const result = service.evaluate(chunk, policies);
     // Process results...
     offset += chunkSize;
   }
   ```

---

## Error Handling

### **Invalid Regex Patterns**

The engine handles invalid regex gracefully:

```typescript
const badPolicy: PolicyEntity = {
  id: 1,
  userId: 1,
  name: "Bad Regex",
  pattern: "[invalid(regex", // Invalid
  type: "regex",
  isEnabled: true,
  // ...
};

const result = service.evaluatePolicy(content, badPolicy);

console.log(result.hasMatches); // false
console.log(result.error); // "Invalid regex pattern"
```

### **Multiple Policy Errors**

Errors are tracked per policy:

```typescript
const result = service.evaluate(content, policies);

if (result.errors.length > 0) {
  result.errors.forEach((err) => {
    console.error(`Policy ${err.policyId}: ${err.error}`);
    // Notify admin, log to file, etc.
  });
}
```

---

## Testing

### **Running Tests**

```bash
# Run all policy engine tests
npm test -- policyEngine.service.test

# With coverage
npm test -- --coverage policyEngine.service.test
```

### **Test Coverage**

**Current Coverage: 94%+**

- ✅ Keyword matching (case-sensitive and insensitive)
- ✅ Regex matching with complex patterns
- ✅ Multiple matches per policy
- ✅ Context extraction
- ✅ Line/column calculation
- ✅ Invalid regex handling
- ✅ Disabled policy filtering
- ✅ Options validation
- ✅ Edge cases (empty content, no matches, etc.)

---

## Integration with Other Modules

### **Scanner Module**

The Scanner uses the Policy Engine to scan files:

```typescript
// In scanner.service.ts
import { PolicyEngineModule } from "../policyEngine";

const policyEngine = new PolicyEngineModule();
const fileContent = fs.readFileSync(filePath, "utf-8");

const result = policyEngine.policyEngineService.evaluate(
  fileContent,
  policies,
);

// Create threat records for each match
for (const policyResult of result.results) {
  for (const match of policyResult.matches) {
    await threatRepository.create({
      scanId,
      policyId: match.policy.id,
      filePath,
      lineNumber: match.lineNumber,
      matchedContent: match.matchedText,
      // ...
    });
  }
}
```

### **Monitor Module**

Real-time file monitoring with auto-evaluation:

```typescript
// In monitor.watcher.ts
watcher.on("change", async (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");

  if (policyEngineService.hasAnyMatch(content, monitorPolicies)) {
    const result = policyEngineService.evaluate(
      content,
      monitorPolicies,
    );
    await createThreatAlert(result);
  }
});
```

---

## Best Practices

### ✅ **DO**

1. **Filter policies before evaluation**

   ```typescript
   const activePolicies = policies.filter((p) => p.isEnabled);
   ```

2. **Set reasonable limits**

   ```typescript
   {
     maxMatchesPerPolicy: 100;
   } // Prevents memory issues
   ```

3. **Handle errors gracefully**

   ```typescript
   if (result.errors.length > 0) {
     logErrors(result.errors);
   }
   ```

4. **Use hasAnyMatch for quick validation**
   ```typescript
   if (service.hasAnyMatch(content, policies)) {
     // Only proceed if matches found
   }
   ```

### ❌ **DON'T**

1. **Don't evaluate disabled policies by default**

   ```typescript
   // Bad
   service.evaluate(content, allPolicies, { includeDisabled: true });

   // Good
   service.evaluate(content, allPolicies); // Skips disabled
   ```

2. **Don't ignore regex validation errors**

   ```typescript
   // Bad
   const result = service.evaluatePolicy(content, policy);
   // Always check result.error

   // Good
   if (result.error) {
     console.error(`Policy ${policy.id}: ${result.error}`);
   }
   ```

3. **Don't process unlimited matches in production**

   ```typescript
   // Bad - Can cause OOM
   {
     maxMatchesPerPolicy: 0;
   }

   // Good
   {
     maxMatchesPerPolicy: 100;
   }
   ```

---

## Future Enhancements

- [ ] **Parallel evaluation** for multiple files
- [ ] **Caching** for compiled regex patterns
- [ ] **Custom matchers** for specific data types (credit cards, SSNs)
- [ ] **Performance metrics** (evaluation time, matches/second)
- [ ] **Streaming API** for very large files
- [ ] **Context highlighting** in results

---

## License

Part of the Data Guard project

---

**Last Updated:** February 13, 2026  
**Module Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Test Coverage:** 94%+
