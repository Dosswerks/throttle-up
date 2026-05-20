# Throttle Up

A browser-based, runway-themed sequencing game framework for employee onboarding. Players drag process steps into the correct order — correct placements accelerate the plane, incorrect placements slow it down. Once all steps are correctly sequenced and full speed is reached, the plane takes off.

## Project Structure

```
throttle-up/
├── engine/                    # Game Engine (vanilla HTML/CSS/JS, static files)
│   ├── index.html             # Entry point
│   ├── css/
│   │   └── styles.css         # Game styles
│   ├── js/                    # JS modules (loaded via script tags)
│   │   ├── event-emitter.js
│   │   ├── config-manager.js
│   │   ├── sequence-loader.js
│   │   ├── game-state-machine.js
│   │   ├── game-logic.js
│   │   ├── persistence-manager.js
│   │   ├── audio-manager.js
│   │   ├── animation-manager.js
│   │   ├── accessibility-manager.js
│   │   ├── renderer.js
│   │   ├── drag-manager.js
│   │   ├── input-manager.js
│   │   └── main.js
│   ├── lang/
│   │   └── en.json            # English UI strings
│   └── assets/
│       ├── images/            # Logo, plane sprite, backgrounds
│       └── audio/             # SFX (engine, correct, incorrect, takeoff)
├── sample-sequence.json       # Sample sequence file (GIDS Ad Authoring)
└── README.md
```

## Game Engine

The engine runs entirely client-side with zero server dependencies. Serve the `engine/` folder from any static host or open `index.html` locally. It loads a JSON sequence file and manages the full game lifecycle.

### Quick Start

1. Open `engine/index.html` in a browser (or serve via any HTTP server)
2. The game loads `sample-sequence.json` by default
3. Point to a different sequence file by passing its path to `ThrottleUp.init()`

### Game Mechanics

- Steps are presented as draggable cards in random order
- Players drag steps into numbered sequence slots
- Correct placement: +20% speed, green highlight, plane accelerates
- Incorrect placement: -10% speed, shake feedback, plane decelerates
- Speed is capped at 0% (minimum) and 100% (takeoff threshold)
- Once all steps are correct and speed hits 100%, the plane takes off

### JSON Format

```json
{
  "game_id": "gids-ad-authoring",
  "version": "1.0.0",
  "config": {
    "title": "THROTTLE UP",
    "subtitle": "GIDS Ad Authoring Process",
    "logo": "assets/images/logo.png",
    "primaryColor": "#1e3a5f",
    "accentColor": "#e8873d",
    "speedIncrement": 20,
    "speedDecrement": 10,
    "takeoffThreshold": 100,
    "showExplanations": true,
    "audioEnabled": true
  },
  "sequences": [
    {
      "id": "gids-authoring",
      "title": "Authoring a GIDS Airport Screen Ad",
      "category": "GIDS Operations",
      "steps": [
        { "id": "step_1", "text": "Receive creative brief", "order": 1, "hint": "Everything starts with the request" },
        { "id": "step_2", "text": "Verify asset specs", "order": 2 },
        { "id": "step_3", "text": "Upload to CMS", "order": 3 }
      ]
    }
  ]
}
```

## Theming

Colors and branding are driven by the JSON config:
- `primaryColor` — Navy blue (#1e3a5f) used for backgrounds and UI chrome
- `accentColor` — Orange (#e8873d) used for highlights, progress, and CTAs
- `logo` — Displayed on the start screen

## Accessibility

- Full keyboard support for reordering (arrow keys + Enter/Space)
- ARIA live regions for speed announcements
- Reduced motion support
- Minimum 44px touch targets
- Screen reader compatible drag-and-drop alternative
