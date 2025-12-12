# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in MangaCount, please report it by emailing the maintainers or opening a confidential security advisory on GitHub. We take all security reports seriously and will respond as quickly as possible.

## Security Best Practices

### Glob CLI Command Injection Prevention

#### What is Glob CLI Command Injection?

Glob CLI command injection occurs when a CLI tool uses glob patterns to match files and then executes commands on those matched files using `shell:true` or similar unsafe execution methods. This can allow an attacker to inject malicious commands through specially crafted filenames or glob patterns.

**Example of Vulnerable Pattern:**
```javascript
// VULNERABLE - DO NOT USE
const { execSync } = require('child_process');
const glob = require('glob');

// If pattern comes from user input, this is dangerous
const files = glob.sync(userProvidedPattern);
files.forEach(file => {
  // Using shell:true with unsanitized input is dangerous
  execSync(`process-file --cmd "${file}"`, { shell: true });
});
```

**Why This is Dangerous:**
- If an attacker creates a file named `"; rm -rf / #.txt"`, the glob pattern might match it
- When executed with `shell:true`, this becomes: `process-file --cmd ""; rm -rf / #.txt"`
- The shell interprets this as multiple commands, executing the malicious `rm -rf /`

#### Secure Alternatives

**1. Never use `shell:true` with user-controlled input:**
```javascript
// SECURE - Use array form without shell
const { spawn } = require('child_process');
const glob = require('glob');

const files = glob.sync(pattern);
files.forEach(file => {
  // Pass arguments as array - no shell interpretation
  spawn('process-file', ['--cmd', file], { shell: false });
});
```

**2. Sanitize and validate all inputs:**
```javascript
// SECURE - Validate patterns before use
const path = require('path');

function isValidGlobPattern(pattern) {
  // Only allow alphanumeric, dots, slashes, and safe glob characters
  return /^[a-zA-Z0-9._\-/*?]+$/.test(pattern);
}

function processFiles(pattern) {
  if (!isValidGlobPattern(pattern)) {
    throw new Error('Invalid glob pattern');
  }
  
  const files = glob.sync(pattern);
  // ... safe processing
}
```

**3. Use allowlists instead of glob patterns when possible:**
```javascript
// SECURE - Explicit file lists
const allowedFiles = ['config.json', 'data.xml', 'settings.yaml'];

function processFiles(filename) {
  if (!allowedFiles.includes(filename)) {
    throw new Error('File not in allowlist');
  }
  // ... safe processing
}
```

### GitHub Actions Security

When using glob patterns in GitHub Actions workflows:

**✓ DO:**
- Use static, hardcoded glob patterns when possible
- Validate any dynamic paths before use
- Use GitHub Actions expressions safely
- Quote all variable expansions properly

**✗ DON'T:**
- Use unvalidated user input in glob patterns
- Execute shell commands with `shell:true` on glob results
- Trust filenames from external sources
- Use wildcards with user-controlled paths

**Example - Secure GitHub Actions Pattern:**
```yaml
- name: Process coverage files
  run: |
    # Static glob pattern - safe
    for file in ./coverage/backend/**/coverage.cobertura.xml; do
      if [ -f "$file" ]; then
        # File path is properly quoted
        reportgenerator -reports:"$file" -targetdir:./report
      fi
    done
```

### General Security Guidelines

1. **Input Validation**
   - Validate all user inputs before processing
   - Use allowlists instead of blocklists
   - Sanitize file paths and names

2. **Least Privilege**
   - Run processes with minimum required permissions
   - Avoid running commands as root/administrator
   - Use dedicated service accounts with limited access

3. **Dependency Security**
   - Regularly update dependencies to patch vulnerabilities
   - Use `npm audit` and `dotnet list package --vulnerable` 
   - Review dependencies before adding them

4. **Code Review**
   - Review all code changes for security issues
   - Use automated security scanning tools
   - Follow secure coding practices

5. **Database Security**
   - Use parameterized queries (already implemented with Dapper)
   - Never concatenate user input into SQL strings
   - Apply principle of least privilege to database users
   - Keep database credentials secure

6. **API Security**
   - Validate all API inputs
   - Use proper authentication and authorization
   - Implement rate limiting
   - Return appropriate error messages without leaking sensitive information

## Security Updates

We regularly review and update our security practices. This document will be updated as new security considerations are identified.

Last updated: December 2024
