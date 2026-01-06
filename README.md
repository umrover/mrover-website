# mrover.org

Official website of the University of Michigan Mars Rover Team.

## Why Bun?

This project uses [Bun](https://bun.sh) instead of npm. Bun is significantly faster for installs and script execution, and is a drop-in replacement. Install it with `curl -fsSL https://bun.sh/install | bash`.

## Setup

```bash
bun install
```

## Development

```bash
bun run dev
```

Open http://localhost:4321 in your browser. Changes auto-reload.

## Build

```bash
bun run build
```

Output goes to `/docs`. Push to GitHub and GitHub Pages auto-deploys.

## Upgrading Packages

Check for outdated packages:
```bash
bun outdated
```

Update all packages to latest versions:
```bash
bun update
```

Update a specific package:
```bash
bun update <package-name>
```

After updating, always run the build to verify nothing broke:
```bash
bun run build
```

---

## Maintenance Guide

### Project Structure

```
src/
  ├── pages/           # Page routes (index, about, rovers, etc.)
  ├── components/      # Reusable components
  ├── layouts/         # Page layout templates
  ├── styles/          # Global CSS
  ├── data/            # JSON data files (sponsors, rovers, donors)
  ├── lib/             # Utility functions
  └── hooks/           # React hooks
public/
  ├── images/          # General images (hero backgrounds, team photos)
  ├── roverImages/     # Rover photos organized by year
  ├── sponsorImages/   # Sponsor logos
  ├── logos/           # MRover brand assets
  └── urdf/            # 3D rover model files
```

---

### Modifying Team Information (About Page)

Edit `src/components/about/SceneConfig.ts`.

The `SECTION_TARGETS` array defines all subteams displayed on the about page. Each entry controls the 3D camera position and HTML content.

#### Adding a New Subteam

Add an entry to the `SECTION_TARGETS` array:

```ts
{
  name: 'unique-id',           // URL-safe identifier (used for scroll targets)
  subteam: {
    teamName: 'Software',      // Branch name: Mechanical, Science, Electrical, or Software
    name: 'Display Name',      // Shown as the subteam title
    desc: 'Description here.', // Shown below the title
    color: '#2196F3',          // Background color (match the branch)
    accent: '#BBDEFB'          // Accent color (match the branch)
  },
  camera: { x: 0, y: 100, z: 300 },  // 3D camera position
  lookAt: { x: 0, y: 20, z: 0 },     // Where the camera points
}
```

#### Branch Colors

| Branch     | color     | accent    |
|------------|-----------|-----------|
| Mechanical | `#00274C` | `#FFCB05` |
| Science    | `#4CAF50` | `#C8E6C9` |
| Electrical | `#9C27B0` | `#E1BEE7` |
| Software   | `#2196F3` | `#BBDEFB` |

#### Editing an Existing Subteam

Find the entry by its `name` field and update `subteam.name` or `subteam.desc`.

---

### Modifying Sponsors

Edit `src/data/sponsors.json`. Platinum sponsors (level 4) also appear in the footer.

See [guides/sponsors.md](guides/sponsors.md) for detailed instructions.

---

### Modifying Donor Information

Edit `src/data/donors.json`.

This is a simple array of donor names:

```json
[
  "First Last",
  "Another Donor"
]
```

---

### Modifying Rover Information

Edit `src/data/roverInfo.json`.

#### Rover Entry Format

```json
{
  "year": "2025",
  "name": "Rover Name",
  "image_path": "/roverImages/2025/main.jpg",
  "desc": [
    "First paragraph of description.",
    "Second paragraph with more details."
  ],
  "slideshow": [
    "/roverImages/2025/img1.jpg",
    "/roverImages/2025/img2.jpg"
  ]
}
```

#### Adding a New Rover

1. Create a folder: `public/roverImages/YEAR/`
2. Add rover images to that folder
3. Add an entry to `src/data/roverInfo.json`

---

### Adding Images

#### General Images (Hero Backgrounds, Team Photos)

1. Add the image to `public/images/`
2. Reference it in pages as `/images/filename.jpg`

#### Sponsor Logos

1. Add the logo to `public/sponsorImages/`
2. Reference it in `sponsors.json` as `/sponsorImages/filename.png`

#### Rover Images

1. Create or use existing folder: `public/roverImages/YEAR/`
2. Add images to that folder
3. Reference in `roverInfo.json` as `/roverImages/YEAR/filename.jpg`

#### Using Images in Astro Pages

```astro
<img src="/images/photo.jpg" alt="Description" />
```

Or with Astro's Image component for optimization:

```astro
---
import { Image } from 'astro:assets';
import photo from '../assets/photo.jpg';
---
<Image src={photo} alt="Description" />
```

---

### Modifying Executive Board (Contact Page)

Edit `src/pages/contact.astro`.

The executive board members are hardcoded in the page markup. Search for the board member section and update names, titles, and emails directly.

---

### Modifying Page Content

All pages are in `src/pages/`. Astro uses file-based routing, so the file path becomes the URL:

| File              | URL            | Page                    |
|-------------------|----------------|-------------------------|
| `index.astro`     | `/`            | Homepage                |
| `about.astro`     | `/about`       | About/Team structure    |
| `rovers.astro`    | `/rovers`      | Rover history           |
| `sponsor.astro`   | `/sponsor`     | Sponsorship info        |
| `donate.astro`    | `/donate`      | Donations page          |
| `join.astro`      | `/join`        | Join form               |
| `contact.astro`   | `/contact`     | Contact info            |
| `memory.astro`    | `/memory`      | Jackie Tardif memorial  |

To add a new page, create `src/pages/pagename.astro` and it will be available at `/pagename`.

Pages use Astro components. Edit the markup directly in the `.astro` files.

---

### Common Tasks

#### Update Hero Image on a Page

Find the hero section in the page file (usually near the top) and change the `src` attribute or background image URL.

#### Change Site Metadata

Edit `src/layouts/BaseLayout.astro` for global metadata (title template, default description).

Edit individual page frontmatter for page-specific metadata:

```astro
---
const title = "Page Title";
const description = "Page description for SEO.";
---
```

#### Modify Navigation

Edit `src/components/Header.astro` to add or remove navigation links.

#### Modify Footer

Edit `src/layouts/BaseLayout.astro` for footer content and `src/components/SponsorFooter.astro` for the sponsor display in the footer.
