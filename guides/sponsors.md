# Managing Sponsors

Sponsors appear in two places:
- **Sponsor Page** (`/sponsor`) - All sponsors grouped by tier
- **Footer** - Only Platinum sponsors (level 4)

## Sponsor Levels

| Level | Tier     | Appears in Footer? |
|-------|----------|--------------------|
| 4     | Platinum | Yes                |
| 3     | Gold     | No                 |
| 2     | Silver   | No                 |
| 1     | Bronze   | No                 |

## Adding a Sponsor

1. Save the logo as a PNG to `public/sponsorImages/` (use lowercase, no spaces)
2. Open `src/data/sponsors.json` and add an entry:

```json
{
  "name": "Company Name",
  "image_path": "sponsorImages/companyname.png",
  "rurl": "https://company-website.com",
  "level": 3
}
```

3. Run `bun run dev` to verify

## Editing a Sponsor

Open `src/data/sponsors.json`, find the sponsor by name, and update values:
- Change tier: update `level` (1-4)
- Update website: change `rurl`
- Replace logo: add new image to `public/sponsorImages/` and update `image_path`

## Removing a Sponsor

1. Delete the sponsor entry from `src/data/sponsors.json`
2. Optionally delete the logo from `public/sponsorImages/`

## Footer Display

The footer (`src/components/SponsorFooter.astro`) automatically shows all level 4 sponsors. To add a sponsor to the footer, set their level to 4.
