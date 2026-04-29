# pauline-neo

## Website

The current public deployment for this source tree is <https://new.pauline-upb.de>.

## Deployments and previews

- `main` is built by the GitHub Actions CI workflow and deployed to <https://new.pauline-upb.de> after CI succeeds.
- Pull requests from branches in this repository get an isolated preview after CI succeeds. The preview URL is `https://<branch-slug>.preview.new.pauline-upb.de`.
- The branch slug is the branch name lowercased with every non-`a-z0-9` character replaced by `-`, repeated dashes collapsed, leading/trailing dashes removed, and then truncated to 63 characters for the deployed preview label.
- Preview deployment comments are posted on the PR once the preview is available. Fork PRs do not receive previews because they do not have access to the preview deployment credentials.
- Closing a PR removes its preview container and database. Reopening a PR redeploys a preview after CI passes again. A scheduled cleanup also prunes previews older than seven days.
- The "Scrape and upload PAUL data" workflow uploads scraped data to `new`; when manually dispatching it, `preview_url` can also be set to upload the same data to a specific preview such as `https://feature-abc.preview.new.pauline-upb.de`.

## Prerequisites

- Nix with flakes enabled
- Docker with the Compose plugin (`docker compose`)

## First-time setup

```sh
# Enter dev shell (provides uv, python, node, psql)
nix develop

# Install Python deps
cd backend && uv sync && cd ..

# Get the DB dump from Eli, then place it at:
#   data/pauline-dump.sql
#
# Then load it into a local postgres container:
setup-db
```

`setup-db` starts a postgres container via `docker-compose.dev.yml`, loads the dump, and writes `backend/.env` from `backend/.env.sample` if it doesn't exist yet.

To reset the DB from scratch:

```sh
docker compose -f docker-compose.dev.yml down -v
setup-db
```

## Run

```sh
nix develop
run-dev
```

Opens at <http://localhost:8000>. The backend spawns the Vite dev server internally and proxies all frontend requests through it.
