# Epic AI

AI-powered marketing platform combining social media management and voice AI agents.

## Features

- **Social Media Management** - Schedule and publish to 20+ platforms
- **Voice AI Agents** - Automated phone calls with AI
- **Lead Management** - Unified lead hub from all channels
- **Flywheel Automations** - Connect social to voice to leads

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Python Flask
- **Database**: PostgreSQL + Prisma
- **Cache**: Redis (Upstash)
- **Voice**: LiveKit, OpenAI, Deepgram

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local

# Start local services (PostgreSQL, Redis)
docker-compose up -d

# Push database schema
pnpm db:push

# Run development server
pnpm dev
```

## Project Structure

```
epic-ai/
├── apps/
│   ├── web/              # Next.js frontend
│   └── voice-service/    # Python voice backend
├── packages/
│   ├── database/         # Prisma schema
│   ├── shared/           # Shared utilities
│   └── ui/               # Shared components
└── docs/                 # Documentation
```

## License

Private - All rights reserved
