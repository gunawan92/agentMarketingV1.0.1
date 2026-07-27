# Marketing AI Agent Ecosystem

Express.js backend for a multi-agent marketing campaign workflow. It supports a synchronous six-agent pipeline for prototypes and a persistent PostgreSQL Campaign API for production wizard flows.

## Run locally

```bash
npm install
copy .env.development.example .env.development
# Configure a valid OpenRouter key in .env.development
npm run db:create
npm run db:migrate
npm run dev
```

## API modes

- `POST /api/generate-campaign` runs the complete six-agent pipeline as a draft.
- `POST /api/wizard/*` runs individual stateless stages for prototyping.
- `POST /api/campaigns` and related routes persist campaign state, approvals, attempts, and errors in PostgreSQL. Use this mode for the frontend production wizard.

## Documentation

- [API reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Frontend integration handoff](docs/FRONTEND_INTEGRATION.md)
- [Persistent wizard architecture](docs/PERSISTENCE_ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)
