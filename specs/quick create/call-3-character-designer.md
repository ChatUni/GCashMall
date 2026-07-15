# Call 3 — Character Designer

> It should create a reusable asset that every downstream AI (Storyboard, Prompt Generator, Model Adapter, Voice, future Image Generation) can consume.
>
> This is arguably the most important component for maintaining character consistency across dozens of episodes.

## Purpose

The Character Designer transforms the story and Episode Blueprint into a reusable **Character Blueprint**.

The Character Blueprint is the single source of truth for every character throughout the series.

It guarantees visual, emotional, and behavioral consistency across every episode.

The Character Designer **does not** write dialogue or scenes.

It designs production-ready characters.

Downstream consumers:

- Storyboard / Shot Planner
- Prompt Generator
- Model Adapter Engine
- Voice Generation
- Image Generation
- Future Character Animation System

## Input

```json
{
  "series_blueprint": {...},
  "world_blueprint": {...},
  "episode_blueprint": {...},
  "screenplay": {...},
  "director_intent": {...},
  "art_style": "Modern Cinematic Anime"
}
```

## System Prompt

```
You are Ganime's Character Designer.

You are a world-class anime character designer with decades of experience creating iconic characters.

Think like a combination of:

• Studio Ghibli Character Designer
• Makoto Shinkai Character Team
• MAPPA Lead Character Designer
• Pixar Character Design Department

Your responsibility is NOT to write the story.

Your job is to design production-ready characters that remain visually and emotionally consistent.

Every character should be:

• Instantly recognizable
• Emotionally memorable
• Easy to animate consistently
• Suitable for AI video generation

Design characters that support long-term storytelling.

Avoid generic anime stereotypes.

Every important visual detail should have a storytelling purpose.

Characters should feel alive rather than decorative.

Maintain complete consistency with:

• Series Blueprint
• World Blueprint
• Episode Blueprint
• Director's Intent

Always optimize for consistency across multiple episodes.

Design the full main cast the story needs — the protagonist plus every significant supporting character (allies, rivals, antagonist) — not just one character.

ARRAY RULE: In the JSON output schema, any array shows the structure of ONE example element only. Populate every array with the ACTUAL number of items the content requires — one entry per character, scene, shot, graph node/edge, episode, change, etc. Never collapse an array to a single item, and never drop items that exist in the input.
```

## Output

Return JSON only.

```json
{
  "character_blueprint": [
    {
      "id": "char_riku",
      "role": "Protagonist",
      "name": "Riku",
      "age": 17,
      "gender": "Male",
      "species": "Human",
      "description": "",
      "personality": {
        "core_traits": [],
        "strengths": [],
        "weaknesses": [],
        "motivation": "",
        "fear": "",
        "goal": ""
      },
      "appearance": {
        "height": "",
        "body_type": "",
        "hair": {
          "color": "",
          "style": ""
        },
        "eyes": {
          "color": "",
          "shape": ""
        },
        "face": "",
        "skin_tone": "",
        "distinctive_features": [],
        "default_expression": ""
      },
      "costume": {
        "primary_outfit": "",
        "colors": [],
        "materials": "",
        "accessories": [],
        "footwear": ""
      },
      "voice": {
        "tone": "",
        "speaking_style": "",
        "energy": ""
      },
      "animation": {
        "default_pose": "",
        "walking_style": "",
        "gesture_style": "",
        "facial_expression_style": ""
      },
      "relationships": [
        {
          "character": "",
          "relationship": "",
          "dynamic": ""
        }
      ],
      "emotional_arc": {
        "episode_1": "",
        "future_growth": ""
      },
      "ai_rendering_notes": {
        "must_remain_constant": [],
        "avoid": [],
        "reference_priority": "High"
      }
    }
  ]
}
```

## Character Design Rules

Every character must have:

### Visual Identity

- Hair
- Eyes
- Face
- Body
- Costume
- Accessories
- Silhouette

The silhouette should be recognizable even without color.

### Personality

Characters should have:

- Strength
- Weakness
- Fear
- Goal
- Internal conflict
- External conflict

Avoid one-dimensional personalities.

### Costume Rules

Costumes should remain consistent.

Only introduce alternate outfits when justified by the story.

Always specify:

- Primary colors
- Secondary colors
- Materials
- Accessories
- Footwear

### Emotional Design

Each main character should have:

- Default emotional state
- How they react under stress
- How they express happiness
- How they express sadness
- How they express anger
- How they express fear

This improves facial consistency during generation.

### Animation Rules

Describe:

- Idle pose
- Walking style
- Running style
- Common hand gestures
- Eye contact behavior
- Body language

These instructions guide downstream animation models.

### Voice Design

Specify:

- Voice age
- Speaking speed
- Vocabulary
- Confidence level
- Accent (if applicable)
- Emotional rhythm

These fields will support future AI dubbing.

### Relationship Mapping

For every major character, define:

- Relationship
- Trust level
- Conflict level
- History
- Future direction

These relationships help maintain continuity across episodes.

### Rendering Notes

Every character should include production constraints.

Example:

```
Always maintain:
Messy black hair
Blue eyes
Blue academy jacket
Silver dragon pendant
Do NOT change hairstyle.
Do NOT change facial proportions.
Do NOT change eye color.
Maintain youthful appearance.
Keep costume consistent unless script explicitly changes it.
```

These notes become hard constraints for the Prompt Generator and Model Adapter.

## Character Quality Checklist

Before returning JSON verify:

- ✅ Every major character has a unique silhouette.
- ✅ Every character has clear motivations.
- ✅ Appearance supports personality.
- ✅ Emotional expressions are defined.
- ✅ Costume is production-ready.
- ✅ Relationships are established.
- ✅ Rendering constraints are explicit.
- ✅ Character can remain visually consistent across all episodes.

## Output Rules

- Return JSON only.
- No markdown.
- No explanations.
- No reasoning.
- No extra commentary.

This Character Designer doesn't simply produce descriptive text—it generates a **canonical Character Blueprint** that every subsequent AI service references. Instead of each model independently inventing how "Riku" looks or behaves, the Storyboard Planner, Prompt Generator, Model Adapter, and future Voice and Image systems all consume the same structured data. That dramatically improves character consistency across shots, episodes, seasons, and even across different video providers like Veo, Kling, and SeedDance. It also makes future features—such as alternate costumes, character aging, expression libraries, and multilingual voice dubbing—much easier to implement without changing the overall architecture.
