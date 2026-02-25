# Versa CI/CD Pipelines

We use **GitHub Actions** for Continuous Integration and Continuous Deployment. Workflows are defined in `.github/workflows/`.

## Branching Strategy

- **`dev`**: Persistent development branch. All feature work is merged here first.
- **`main`**: Production branch. Only receives merges from `dev`.

## Workflows

### 1. `deploy-dev.yml` (Dev Environment)

Triggers on: **Pull Request to `main`** (only from the `dev` branch).

**Jobs:**
1. **Test & Coverage**: Runs unit tests (Backend, Infra), Linting, and E2E tests. Posts coverage summary to the PR.
2. **Cost Estimate**: Runs Infracost to estimate monthly spend impact. Posts cost breakdown to the PR.
3. **Deploy**:
   - Sets `STAGE_NAME=dev`.
   - Deploys Infrastructure (`cdk deploy`) using `VersaInfraStack-dev` / `VersaAuthStack-dev`.
   - Builds and deploys Frontend to the NonProd S3 bucket under `/dev`.
   - Generates & publishes API Docs.

**Auth**: AWS access key / secret key (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).

### 2. `deploy-prod.yml` (Production Environment)

Triggers on: **Push to `main`** (fires when a `dev` -> `main` PR is merged).

**Jobs:**
1. **Release** (parallel with Test): Runs `semantic-release` to create a version tag and GitHub release. Does not fail the workflow if there's nothing to release.
2. **Test & Coverage** (parallel with Release): Runs unit tests (Backend, Infra) and Linting.
3. **Deploy** (depends on both Release and Test):
   - Sets `STAGE_NAME=prod`.
   - Deploys Infrastructure (`cdk deploy`) using `VersaInfraStack-prod` / `VersaAuthStack-prod`.
   - Builds and deploys Frontend to the Prod S3 bucket at root.
   - Generates & publishes API Docs.

**Auth**: OIDC role assumption (`AWS_ROLE_ARN_PROD`).

## Stack Naming

All stacks use the `Versa` prefix:

| Stack | Dev | Prod |
|---|---|---|
| Infrastructure | `VersaInfraStack-dev` | `VersaInfraStack-prod` |
| Auth | `VersaAuthStack-dev` | `VersaAuthStack-prod` |
| Frontend | `VersaFrontendStack` | `VersaFrontendStack` |

The Frontend stack is shared across environments (prod and non-prod buckets + CloudFront distributions are defined within it).

## Environment Variables / Secrets

Required GitHub Secrets:

| Secret | Used By | Purpose |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Dev deploy | Deployer credentials |
| `AWS_SECRET_ACCESS_KEY` | Dev deploy | Deployer secret |
| `AWS_ROLE_ARN_PROD` | Prod deploy | OIDC role for production |
| `AWS_ACCOUNT_ID` | Dev deploy | Account ID for CDK synth |
| `INFRACOST_API_KEY` | Dev deploy | Cost estimation |
| `GITHUB_TOKEN` | Prod deploy | Semantic-release (auto-provided) |

## Deployment Logic (`infra/bin/infra.ts`)

The CDK app determines the `stageName` with this priority:
1. `STAGE_NAME` env var (set explicitly by CI workflows)
2. `GITHUB_HEAD_REF` or `GITHUB_REF_NAME` (fallback for CI)
3. Defaults to `dev` (local development)
