# mrover.org

Official website of the University of Michigan Mars Rover Team.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:4321 in your browser. Changes auto-reload.

## Build

```bash
npm run build
```

Output goes to `/docs`. Push to GitHub and GitHub Pages auto-deploys.

## Modifying Team Information

To update the 3D "About" page (team names, descriptions, or subteams), edit the `SECTION_TARGETS` array in `src/components/about/SceneConfig.ts`. Adding an entry there automatically updates the 3D camera targets, the scroll-snap behavior, and the HTML content.
