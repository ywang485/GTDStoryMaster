# GTD Story Master

An immersive productivity tool that transforms your daily todo list into an interactive text adventure. Complete real tasks, advance epic plots.

## How It Works

1. **Profile Setup** — Tell the Story Master about yourself: personality, hobbies, values
2. **Choose a World** — Pick a storyworld (fantasy, sci-fi, noir) or create your own, including fan fiction worlds
3. **Add Tasks** — Enter your real tasks with optional priority, time estimates, and dependencies
4. **AI Preparation** — The system optimizes your task order using productivity theory, then generates a plot where each task maps to a story event
5. **Play** — Experience a turn-based text adventure where completing real tasks advances the story

## Architecture

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/ai/             # AI endpoints (task optimization, plot gen, narration)
│   ├── setup/              # Preparation phase
│   └── adventure/          # Main gameplay
├── components/
│   ├── setup/              # Setup wizard components
│   ├── game/               # Gameplay components (narrative, quests, actions)
│   └── providers/          # React providers and gates
├── stores/                 # Zustand state management
├── lib/
│   ├── ai/                 # AI provider abstraction, prompts, Zod schemas
│   ├── engine/             # Pure game logic (no React dependency)
│   └── storyworlds/        # Built-in world presets
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
└── config/                 # App and AI configuration
```

### Key Design Decisions

- **AI calls only in route handlers** — Client components never import AI SDK directly
- **Game engine is pure TypeScript** — `src/lib/engine/` has zero React dependencies for testability
- **Prompts are data** — `src/lib/ai/prompts/` contains pure functions that build prompt strings
- **Structured AI output uses Zod schemas** — Task optimization and plot generation return validated JSON
- **Streaming narration** — Turn-by-turn narration streams via the Vercel AI SDK

### Productivity Theory Applied

The task optimizer considers:
- **Eat the Frog**: Aversive tasks scheduled early when willpower is highest
- **Deep Work**: High cognitive load tasks during peak focus hours
- **Minimize Context Switching**: Related tasks grouped together
- **Dependency Respect**: Tasks with dependencies ordered correctly
- **Energy Management**: Challenging and lighter tasks interspersed

## Getting Started

```bash
# Install dependencies
npm install

# Configure your AI provider
cp .env.example .env
# Edit .env with your API key (OpenAI, Anthropic, or Google)

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to begin.

## Configuration

Set your AI provider in `.env`:

```
AI_PROVIDER=openai          # openai, anthropic, or google
AI_MODEL=gpt-4o             # Primary model for narration and structured output
AI_MODEL_FAST=gpt-4o-mini   # Fast model for quick operations
```

## Future Roadmap

- **Multimedia storytelling**: Image generation, animations, sound effects via pluggable APIs
- **External app integration**: Pomodoro timers, calendar sync via `ExternalService` interface
- **Adaptive visual theming**: UI that changes based on story content and world
- **Memory system**: Track productivity patterns across sessions for personalized optimization
- **Save/load**: Persist and resume adventure sessions
