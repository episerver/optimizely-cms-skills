# Security Policy

## Reporting a Vulnerability

Please report security issues privately — do not open a public issue.

Use GitHub's **Private Vulnerability Reporting**:

1. Go to the [Security tab](https://github.com/episerver/optimizely-cms-skills/security) of this repository.
2. Click **Report a vulnerability**.
3. Fill out the advisory form.

Maintainers are notified immediately and can collaborate with you on a fix inside the private advisory before any public disclosure.

## Scope

This project ships **no runtime code**. Every skill is a Markdown document (`SKILL.md`) that an AI coding agent reads to generate code into the user's own project. Security concerns in that context look different from a typical library:

**In scope:**

- A skill that instructs an agent to install an untrusted or typosquatted package.
- A skill containing prompt-injection content that could cause a reading agent to take actions outside the user's intent (exfiltrate secrets, run destructive shell commands, open outbound connections).
- A skill that documents a pattern which leaks credentials, secrets, or sensitive data into logs, source control, or responses.
- A skill that recommends disabling a security control (CSRF, HMAC verification, TLS checks, authentication) without a bounded, security-reviewed justification.
- CI/CD workflow files (`.github/workflows/*`) that mishandle secrets, grant excessive `GITHUB_TOKEN` permissions, or run untrusted code with elevated privileges.

**Out of scope:**

- Bugs or security issues in generated code when an agent follows a skill correctly — report those against the specific target package (`@optimizely/cms-sdk`, `@optimizely/cms-cli`, etc.) upstream.
- Issues in the Optimizely CMS platform itself.
- Issues in third-party packages a skill may reference.

## Supported Versions

Only the `latest` released version of this plugin receives security fixes. The release workflow moves the `latest` tag to the newest version on publish.
