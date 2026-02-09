# mrover.org

Official website of the University of Michigan Mars Rover Team.

## Quick Start

```bash
curl -fsSL https://bun.sh/install | bash   # install Bun (if needed)
bun install                                  # install dependencies
bun run dev                                  # http://localhost:4321
```

## Build and Deploy

```bash
bun run build      # outputs to dist/
```

Push to `main` and GitHub Pages deploys automatically.

## What to Edit

| Change | File | Guide |
|--------|------|-------|
| Subteams (About page) | `src/components/about/SceneConfig.ts` | [docs/subteams.md](docs/subteams.md) |
| Sponsors | `src/data/sponsors.json` | [docs/sponsors.md](docs/sponsors.md) |
| Donors | `src/data/donors.json` | [docs/content.md](docs/content.md) |
| Rovers | `src/data/roverInfo.json` | [docs/content.md](docs/content.md) |
| Executive Board | `src/pages/contact.astro` | [docs/content.md](docs/content.md) |
| Pages and Navigation | `src/pages/*.astro` | [docs/content.md](docs/content.md) |
| 3D models and effects | `src/components/about/SceneConfig.ts` | [docs/3d-models.md](docs/3d-models.md) |
| Images | `public/images/` | [docs/content.md](docs/content.md) |
| Custom domain and HTTPS | DNS records, SSL certs | [docs/github-pages-dns.md](docs/github-pages-dns.md) |

## Project Structure

```
src/
  pages/          Page routes (file-based routing)
  components/     Reusable components
  layouts/        Page layout templates
  styles/         Global CSS
  data/           JSON data (sponsors, rovers, donors)
  hooks/          React hooks
public/
  images/         General images
  roverImages/    Rover photos by year
  sponsorImages/  Sponsor logos
  models/         3D models (.glb)
  urdf/           URDF rover models
scripts/          Model processing and utility scripts
docs/             Detailed guides
```

## Updating Packages

```bash
bun outdated       # check for updates
bun update         # update all
bun run build      # verify nothing broke
```
