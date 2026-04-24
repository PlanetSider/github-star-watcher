# Github-Star-Watcher

Watch updates from your GitHub starred repositories, push notifications through Server酱, and expose a private RSS feed for any RSS client.

## Features

- Sync your GitHub starred repositories
- Detect repository code updates via `pushed_at`
- Detect new releases via latest release changes
- Filter monitored repositories with blacklist / whitelist modes
- Push aggregated notifications through Server酱
- Expose private RSS feeds for all events or per event type
- Ship as Docker and publish images with GitHub Actions + GHCR

## API

- `GET /health`
- `GET /stats`
- `GET /settings`
- `POST /settings/filter-mode`
- `GET /settings/rss`
- `POST /settings/rss/regenerate-token`
- `POST /sync/starred`
- `POST /poll/run`
- `GET /repos`
- `GET /repos/:repoId`
- `POST /repos/:repoId/blacklist`
- `POST /repos/:repoId/whitelist`
- `POST /repos/:repoId/clear-list`
- `GET /events`
- `GET /feeds/:token/rss.xml`
- `GET /feeds/:token/code-updated.xml`
- `GET /feeds/:token/releases.xml`

## Development

1. Copy `.env.example` to `.env`
2. Install dependencies
3. Run Prisma generate and migrations
4. Start the app

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Required environment variables

- `API_AUTH_TOKEN`
- `DATABASE_URL`
- `GITHUB_TOKEN`
- `POLL_CRON`
- `BASE_URL`

Optional:

- `CORS_ORIGIN`
- `SERVERCHAN_SENDKEY` (ServerChan 3 sendkey, e.g. `sctp123456t...`)
- `RSS_ENABLED`
- `RSS_FEED_TOKEN`
- `RSS_FEED_LIMIT`

## Authentication

All JSON API endpoints except `GET /health` require:

```http
Authorization: Bearer <API_AUTH_TOKEN>
```

RSS endpoints remain protected by their feed token.

## Docker

```bash
docker build -t github-star-watcher .
docker run -d \
  --name github-star-watcher \
  -p 3000:3000 \
  -e API_AUTH_TOKEN=change-me \
  -e DATABASE_URL=file:./data/app.db \
  -e GITHUB_TOKEN=xxx \
  -e POLL_CRON='*/30 * * * *' \
  -e SERVERCHAN_SENDKEY=sctp123456t... \
  -e RSS_ENABLED=true \
  -e RSS_FEED_TOKEN=your-token \
  -e BASE_URL=https://example.com \
  -v ./data:/app/data \
  github-star-watcher
```

If you do not want Server酱 notifications yet, omit `SERVERCHAN_SENDKEY` and rely on RSS only.
