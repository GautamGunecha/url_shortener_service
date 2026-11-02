# URL Shortener Service

A Node.js URL shortener built from three services:

- **Gateway** (`:3000`) routes public API requests.
- **Write service** (`:3001`) validates and stores new URLs in MongoDB. Redis allocates unique short codes.
- **Read service** (`:3002`) redirects short links, caches URL lookups in Redis, and asynchronously persists click counts to MongoDB.

## Requirements

- Node.js 20 or newer
- MongoDB
- Redis

The write and read services must use the same MongoDB database and Redis instance.

## Local setup

Install dependencies once in each service directory:

```sh
cd gateway && npm install
cd ../write_service && npm install
cd ../read_service && npm install
```

Create local environment files from the checked-in examples:

```sh
cp gateway/.env.example gateway/.env
cp write_service/.env.example write_service/.env
cp read_service/.env.example read_service/.env
```

Edit the `MONGO_URI` values if MongoDB is not using the local default. The services expect MongoDB and Redis to be running before startup. Do not commit `.env` files.

Run each command from the repository root in a separate terminal:

```sh
npm --prefix write_service run dev
npm --prefix read_service run dev
npm --prefix gateway run dev
```

The gateway can start before its upstream services, but proxied requests return `502` until the corresponding service is available. The write service requires both MongoDB and Redis. The read service can still look up URLs from MongoDB if Redis is unavailable, but its health check reports the dependency as unavailable and click counts cannot be queued.

Run the unit tests:

```sh
npm --prefix gateway test
npm --prefix write_service test
npm --prefix read_service test
```

## API

The public base URL below assumes the gateway is running at `http://localhost:3000`.

### Health checks

```sh
curl -i http://localhost:3000/health
curl -i http://localhost:3001/health
curl -i http://localhost:3002/health
```

The gateway health endpoint checks that the gateway process is running. Write/read service health endpoints also report MongoDB and Redis connection status and return `503` if a required dependency is unavailable.

### Create a short URL

```sh
curl -i -X POST http://localhost:3000/api/urls \
  -H 'Content-Type: application/json' \
  -d '{"longUrl":"https://example.com/articles/hello-world"}'
```

Example response (`shortCode` will differ):

```json
{
  "shortCode": "100001",
  "shortUrl": "http://localhost:3000/100001"
}
```

`longUrl` must be a valid absolute HTTP or HTTPS URL, up to 2048 characters. An optional `userId` must be a 24-character MongoDB ObjectId:

```sh
curl -i -X POST http://localhost:3000/api/urls \
  -H 'Content-Type: application/json' \
  -d '{"longUrl":"https://example.com","userId":"507f1f77bcf86cd799439011"}'
```

Successful requests return `201 Created`. Invalid input returns `400 Bad Request`; malformed JSON also returns `400`.

### Redirect to the original URL

```sh
curl -i http://localhost:3000/100001
```

An existing code returns `302 Found` with a `Location` header. To follow the redirect:

```sh
curl -i -L http://localhost:3000/100001
```

Unknown codes return `404 Not Found`. Short codes contain 6–10 ASCII letters or digits.

### Read URL details and click count

```sh
curl -i http://localhost:3000/api/urls/100001
```

Example response:

```json
{
  "shortCode": "100001",
  "shortUrl": "http://localhost:3000/100001",
  "longUrl": "https://example.com/articles/hello-world",
  "clicks": 0,
  "createdAt": "2026-11-03T00:00:00.000Z"
}
```

The read service batches click updates to MongoDB every 10 seconds, so the returned count may lag recent redirects by up to one flush interval. Unknown codes return `404 Not Found`.

### Error responses

API errors use JSON, for example:

```json
{ "message": "Short URL not found" }
```

The gateway returns `502 Bad Gateway` with an `Upstream service unavailable` message when a service it needs cannot be reached.

## Configuration

| Variable | Service | Default | Description |
|---|---|---|---|
| `PORT` | All | Gateway `3000`, write `3001`, read `3002` | HTTP listening port |
| `WRITE_SERVICE_URL` | Gateway | `http://localhost:3001` | Write service upstream URL |
| `READ_SERVICE_URL` | Gateway | `http://localhost:3002` | Read service upstream URL |
| `MONGO_URI` | Write/read | — | MongoDB connection string |
| `REDIS_URL` | Write/read | `redis://localhost:6379` | Redis connection string |
| `PUBLIC_BASE_URL` | Write/read | `http://localhost:3000` | Public URL included in API responses |

Use the corresponding `.env.example` in each service directory as the starting point for local configuration.
