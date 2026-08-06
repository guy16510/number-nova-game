# Number Nova Gameplay Polish Plan

## Goal

Turn the existing feature-rich prototype into a coherent, readable, performance-safe space battle for children ages 4 to 7 without coupling presentation concerns to the game engine.

## SOLID boundaries

- `GameEngine` remains responsible for game rules and immutable snapshots.
- `EntityVisualPresenter` maps domain entities to presentation-only visual models.
- `RenderBudgetPolicy` owns entity and effect budgets independently of rendering.
- `GameCanvasLite` renders visual models but contains no gameplay decisions.
- New visual behavior is deterministic and unit tested without React Native.

## Delivery phases

1. Combat readability
   - Recognizable ship and enemy silhouettes
   - Warning rings and lock indicators
   - Enemy health bars and boss damage states
   - Stronger projectile, shield, explosion, and collectible treatments

2. Visual depth and feedback
   - Multi-layer parallax star field
   - Nebula and planet silhouettes
   - Ship banking and engine thrust
   - Screen shake and damage vignette
   - Laser glow and impact flashes

3. Performance protection
   - Explicit entity and effect budgets
   - Deterministic culling priority
   - Memoized entities and static scenery
   - Tests that fail when budgets or presenter mappings regress

4. Existing gameplay integration
   - Preserve manual firing, bosses, hazards, power-ups, campaign missions, adaptive math, rewards, audio, and parent reporting
   - Improve presentation without changing curriculum or collision rules

5. Verification
   - Strict TypeScript
   - Unit tests
   - Deterministic simulation
   - Android and iOS production exports
   - Existing native and render-smoke CI workflows

## Acceptance criteria

- Enemies are distinguishable without reading labels.
- Warning, lock, health, shield, projectile, and explosion states are visible.
- The renderer obeys a deterministic entity budget.
- No new gameplay logic enters React components.
- Existing validation and CI remain green.
