# Releasing

This document covers how to cut a release of the optimizely-cms-skills plugin.

## How It Works

Releases are gated — not every merge to `main` is a release. A release is a specific commit blessed with a semver tag (e.g., `v0.1.0`). The marketplace pulls from the mutable `latest` tag, which the release workflow moves to the newest release.

### Release Identity

Each release has two identifiers:

- **Semver tag** (`v0.1.0`) — human-readable version
- **Release hash** — composite SHA-256 of all skill hashes, stored in `skill-deps.json` as `releaseHash`. This is a content seal: same skills produce the same hash.

### Version Source of Truth

The git tag is the source of truth. The release workflow writes the version from the tag into both `package.json` and `.claude-plugin/plugin.json`.

## Cutting a Release

1. Go to **Actions** → **Release** in the GitHub repo
2. Click **Run workflow**
3. Enter the version (e.g., `0.1.0`) — no `v` prefix
4. The workflow will:
   - Validate the version format
   - Update skill hashes and compute the release hash
   - Bump version in `package.json` and `plugin.json`
   - Generate a changelog from commits since the last tag
   - Commit the changes
   - Create the semver tag (`v0.1.0`)
   - Move the `latest` tag to the release commit
   - Create a **draft** GitHub Release with structured notes
5. Go to **Releases** → edit the draft
6. Review and polish the release notes
7. **Publish** the release

## Versioning

This project follows [Semantic Versioning](https://semver.org/). While pre-1.0:

- **Patch** (`0.1.x`): bug fixes, typo corrections, minor skill content updates
- **Minor** (`0.x.0`): new skills, significant skill content changes
- **Breaking**: removing or renaming a skill (bumps minor while pre-1.0)

## Commit Message Convention

Best-effort [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

| Type | Use |
|------|-----|
| `feat` | New skill or significant addition |
| `fix` | Bug fix or correction |
| `docs` | Documentation changes |
| `chore` | Tooling, CI, dependency updates |
| `refactor` | Restructuring without behavior change |

Conventional prefixes improve auto-generated changelogs but are not enforced.

## Release Notes Template

The auto-generated draft includes these sections when applicable:

- **New Skills** — skills added since the last release
- **Changed Skills** — skills with content updates
- **Breaking Changes** — removed or renamed skills
- **Commits** — categorized by type
- **Migration Notes** — upgrade instructions

Edit the draft before publishing to add context, highlight important changes, or clarify migration steps for customers.

## Distribution

The plugin marketplace pulls from the `latest` git tag (configured in `.claude-plugin/marketplace.json`). Users install via:

```
/install optimizely-cms-skills
```

After publishing a release, the `latest` tag points to the new version and users who install or update get it automatically.
