# Call 4 — Production Storyboard Architect

> I actually think this should become **the most technically sophisticated AI in Ganime**.
>
> This AI is **not a storyboard artist**.
>
> It is the **Production Architect**.
>
> Its job is to convert the creative vision into a **production graph** that every downstream AI can execute.
>
> Think of it as Unreal Engine's Blueprint system combined with Pixar's production planning.
>
> It should generate **four graphs simultaneously**:
>
> 1. **Story Graph** – Narrative relationships and story progression.
> 2. **Shot Graph** – Visual production plan.
> 3. **Production Graph** – AI rendering dependency graph.
> 4. **Episode State Graph** – Tracks production lifecycle and resumability.
>
> This makes Ganime fundamentally different from a simple prompt pipeline.

## Purpose

The Production Storyboard Architect transforms the Episode Blueprint into a production-ready execution plan.

It does **not** generate prompts for video models.

It creates structured production graphs that downstream systems execute.

It is responsible for:

- Story continuity
- Shot planning
- Production dependencies
- Rendering order
- Episode state management

Downstream consumers:

- Prompt Generator
- Model Adapter Engine
- Rendering Orchestrator
- Production Monitor
- My Studio

## Input

```json
{
  "series_blueprint": {...},
  "world_blueprint": {...},
  "character_blueprint": {...},
  "episode_blueprint": {...},
  "screenplay": {...},
  "director_intent": {...},
  "episode_length_seconds": 60
}
```

## System Prompt

```
You are Ganime's Production Storyboard Architect.

You are responsible for converting an approved screenplay into a complete production plan.

Think like a combination of:

• Pixar Storyboard Department
• MAPPA Production Manager
• DreamWorks Layout Department
• Unreal Engine Blueprint Architect

Your responsibility is NOT to write the story.

Your job is to create a production-ready blueprint that every downstream AI system can execute.

Your outputs must be deterministic, structured, and internally consistent.

Every shot must have a purpose.

Every production dependency must be explicit.

Every rendering task must know its inputs and outputs.

Maintain complete consistency with:

• Series Blueprint
• World Blueprint
• Character Blueprint
• Episode Blueprint
• Director's Intent

Optimize for:

• Story clarity
• Rendering efficiency
• Character consistency
• Scene continuity
• Parallel rendering where possible

ARRAY RULE: In the JSON output schema, any array shows the structure of ONE example element only. Populate every array with the ACTUAL number of items the content requires — one entry per character, scene, shot, graph node/edge, episode, change, etc. Never collapse an array to a single item, and never drop items that exist in the input.

Return JSON only.
```

## Output

Return JSON only.

```json
{
  "story_graph": {},
  "shot_graph": {},
  "production_graph": {},
  "episode_state_graph": {}
}
```

### Output 1 — Story Graph

The Story Graph represents **why the story moves forward**.

```json
{
  "nodes": [
    { "id": "story_01", "type": "Hook", "title": "Dragon Egg Awakens" },
    { "id": "story_02", "type": "Conflict", "title": "Students Shocked" },
    { "id": "story_03", "type": "Reveal", "title": "Dragon Chooses Riku" }
  ],
  "edges": [
    { "from": "story_01", "to": "story_02", "relationship": "causes" },
    { "from": "story_02", "to": "story_03", "relationship": "leads_to" }
  ]
}
```

The Story Graph is used later for:

- Story validation
- Continuity checking
- AI Story Critic
- Future season planning

### Output 2 — Shot Graph

Every shot becomes a production node. Produce **one shot object per planned shot — 5 to 8 shots** that together cover the whole episode (the example below shows 6). Do **not** return just one or two shots, and never leave a shot as a bare stub: every shot must be fully specified.

```json
{
  "shots": [
    {
      "shot_id": "shot_001",
      "scene": 1,
      "duration_seconds": 10,
      "purpose": "Establish the Dragon Academy",
      "camera": "Wide Aerial",
      "emotion": "Wonder",
      "characters": ["Riku"],
      "location": "Academy Gate",
      "continuity_notes": "Golden morning light; Riku in blue academy jacket",
      "depends_on": []
    },
    {
      "shot_id": "shot_002",
      "scene": 1,
      "duration_seconds": 8,
      "purpose": "Reveal the sealed dragon egg",
      "camera": "Slow Push-In",
      "emotion": "Mystery",
      "characters": ["Riku"],
      "location": "Egg Chamber",
      "continuity_notes": "Egg glows faintly; same jacket and hairstyle",
      "depends_on": ["shot_001"]
    },
    {
      "shot_id": "shot_003",
      "scene": 2,
      "duration_seconds": 10,
      "purpose": "Introduce Riku among the other students",
      "camera": "Medium",
      "emotion": "Anticipation",
      "characters": ["Riku", "Luna"],
      "location": "Main Hall",
      "continuity_notes": "Luna's first appearance; consistent character design",
      "depends_on": ["shot_001"]
    },
    {
      "shot_id": "shot_004",
      "scene": 3,
      "duration_seconds": 8,
      "purpose": "The egg cracks in reaction to Riku",
      "camera": "Close-Up",
      "emotion": "Shock",
      "characters": ["Riku"],
      "location": "Egg Chamber",
      "continuity_notes": "Match lighting from shot_002; keep eye color consistent",
      "depends_on": ["shot_002", "shot_003"]
    },
    {
      "shot_id": "shot_005",
      "scene": 3,
      "duration_seconds": 10,
      "purpose": "The dragon awakens and chaos erupts",
      "camera": "Dynamic Tracking",
      "emotion": "Danger",
      "characters": ["Riku", "Luna"],
      "location": "Egg Chamber",
      "continuity_notes": "Debris and dust; costumes unchanged",
      "depends_on": ["shot_004"]
    },
    {
      "shot_id": "shot_006",
      "scene": 3,
      "duration_seconds": 9,
      "purpose": "The dragon chooses Riku (cliffhanger)",
      "camera": "Low-Angle Hero",
      "emotion": "Awe",
      "characters": ["Riku"],
      "location": "Egg Chamber",
      "continuity_notes": "Final beat; Riku looks up at the dragon, jacket and pendant visible",
      "depends_on": ["shot_005"]
    }
  ]
}
```

Each shot must include:

- Story purpose
- Camera
- Characters
- Location
- Emotion
- Continuity notes
- Dependency

The number of shots equals the number of planned beats for the episode (5–8). This array becomes the Prompt Generator's input, so every shot here becomes exactly one shot prompt in Call 6.

### Output 3 — Production Graph

This is Ganime's execution graph.

Instead of narrative relationships, it describes **rendering dependencies**.

```json
{
  "nodes": [
    { "id": "generate_character_refs", "type": "ImageGeneration" },
    { "id": "render_shot_001", "type": "VideoGeneration" },
    { "id": "render_shot_002", "type": "VideoGeneration" },
    { "id": "compose_episode", "type": "VideoComposition" }
  ],
  "edges": [
    { "from": "generate_character_refs", "to": "render_shot_001" },
    { "from": "generate_character_refs", "to": "render_shot_002" },
    { "from": "render_shot_001", "to": "compose_episode" },
    { "from": "render_shot_002", "to": "compose_episode" }
  ]
}
```

This graph enables:

- Parallel rendering
- Retry individual shots
- Resume failed jobs
- GPU scheduling
- Cost estimation

### Output 4 — Episode State Graph

This graph tracks production status.

```json
{
  "states": [
    "Planning",
    "Story Approved",
    "Characters Ready",
    "Storyboard Ready",
    "Prompt Ready",
    "Rendering",
    "Compositing",
    "Review",
    "Published"
  ],
  "transitions": [
    { "from": "Planning", "to": "Story Approved" },
    { "from": "Rendering", "to": "Compositing" },
    { "from": "Review", "to": "Published" }
  ]
}
```

The Episode State Graph allows:

- Save and resume production
- Show progress in My Studio
- Retry failed stages
- Collaborative editing
- Future multi-user workflows

## Storyboard Rules

Scale the number of shots to the episode length, and make the shot durations **sum to exactly `episode_length_seconds`**:

- **30-second episode → 4–5 shots** (~6–8s each)
- **60-second episode → 7–8 shots** (~7–9s each)

Keep every shot between roughly **5 and 10 seconds** — video models render short clips reliably, so never plan a single shot longer than ~10s (split it into two instead). The shot count is driven by runtime, not by the number of scenes: one scene may become one shot or several.

Each shot should:

- Advance the story
- Introduce only one primary idea
- Have one dominant emotion
- Have one camera language
- Transition naturally to the next shot

Avoid repetitive camera angles.

Alternate between:

- Wide
- Medium
- Close-up
- Dynamic tracking
- Establishing shots

Maintain visual rhythm.

## Production Rules

Optimize for:

- Parallel rendering where dependencies allow
- Character consistency
- Location reuse
- Efficient GPU utilization
- Reduced rendering cost
- Easy regeneration of individual shots

Never require rerendering the entire episode if only one shot changes.

## Quality Checklist

Before returning JSON verify:

- ✅ Story Graph contains a complete narrative flow.
- ✅ Every shot has a clear purpose.
- ✅ Shot dependencies are valid.
- ✅ Production Graph contains no circular dependencies.
- ✅ Episode State Graph is resumable.
- ✅ Every shot supports downstream prompt generation.
- ✅ Character continuity is preserved.
- ✅ Rendering can be parallelized whenever possible.

## Output Rules

- Return valid JSON only.
- No markdown.
- No explanations.
- No reasoning.
- No additional commentary.

This is where Ganime stops being "an AI video generator" and becomes **an AI production operating system**.

Instead of passing prompts from one LLM to another, every stage produces a structured graph that downstream services can validate, cache, retry, visualize, and optimize.

- **Story Graph** ensures narrative coherence.
- **Shot Graph** becomes the canonical source for every video prompt.
- **Production Graph** enables scalable orchestration, distributed rendering, and cost optimization.
- **Episode State Graph** powers My Studio, resumable production, collaboration, and future enterprise workflows.

These four graphs become Ganime's internal production language, making the platform extensible and robust as you add new AI models, rendering providers, and collaborative production features over time. This graph-based architecture is one of the strongest technical differentiators Ganime can build.
