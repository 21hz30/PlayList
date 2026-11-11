# Zimo Sessions

A music project exploring how Zimo's taste can help people find a rhythm for focus, movement, and unwinding. This repository contains the current English-language web preview for Zimo to try and review.

## What works today

- Animated homepage with a project introduction and space for Zimo's portrait.
- Guest access to choose an activity, session duration, energy, and music, then listen to 16 browser-generated WebAudio demos.
- Admin sign-in with the username `admin`, plus the curation and Style Lab interfaces.
- Optional playback of three AI-generated samples: **Paper Window**, **Own Tempo**, and **Blue Hour**, when their external audio URLs are configured.

Admin content, preferences, and drafts are stored in the current browser. They are not shared across devices or published to other visitors. There is no shared comment system yet. The AI music API is a placeholder; generating new music is not connected.

## Run locally

Use Node.js 22 and npm. The application uses Next.js 16 and React 19.

```sh
npm ci
npm run setup:admin
npm run dev
```

The admin setup command asks for a password without displaying it. It writes the password hash and a generated session secret to two ignored files:

- `.env.local` for local development, with dollar signs escaped for the environment-file parser.
- `.env.vercel` with raw values for copying into Vercel environment variables.

Neither file should be committed or shared. The admin username is `admin`. Without the two admin environment variables, guest access still works but admin sign-in is unavailable.

To check the production build locally:

```sh
npm run build
npm start
```

## Deploy to Vercel

1. Import [`21hz30/PlayList`](https://github.com/21hz30/PlayList) into Vercel.
2. Use the **Next.js** framework preset, root directory **`./`**, and **Node.js 22**. Use `npm ci` for installation and `npm run build` for the build; keep the framework's default output directory.
3. Run `npm run setup:admin` locally if you have not already done so. In the Vercel project's environment variables, add `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` using the raw values from `.env.vercel`. Copy only each value, without its variable name, surrounding quotes, or added backslashes.
4. Add the optional audio URLs below if the samples are ready. Apply variables to each deployment environment you intend to use, such as Production or Preview.
5. Deploy. After changing environment variables, redeploy for the changes to take effect.

Open the deployed homepage and guest experience, then verify the admin login. Admin sessions use signed HttpOnly cookies; authentication secrets stay on the server.

## Music storage

Keep music files in external storage such as Vercel Blob, Cloudflare R2, or another CDN. This Git repository contains code and music metadata, not audio files.

Set these optional environment variables to public HTTPS audio URLs:

| Variable | Sample |
| --- | --- |
| `NEXT_PUBLIC_PAPER_WINDOW_URL` | Paper Window |
| `NEXT_PUBLIC_OWN_TEMPO_URL` | Own Tempo |
| `NEXT_PUBLIC_BLUE_HOUR_URL` | Blue Hour |

These URLs are visible to visitors and can be shared. Use stable public links, not private credentials or expiring download links. Configure the storage provider's CORS settings to allow playback and the homepage audio visualizer from your deployed site.

If a URL is empty, that sample's playback is disabled. Guests can still use the 16 WebAudio demos in `/app`; these demos are synthesized in the browser and do not require uploaded audio files. Public audio URL changes require a new build and deployment.

## Environment reference

`.env.example` lists the supported variables with empty values. `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` are server-only secrets. The three `NEXT_PUBLIC_*` variables contain public audio URLs only.
