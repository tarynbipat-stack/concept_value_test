# My Next.js App

This is a Next.js application built with TypeScript and styled using Tailwind CSS. 

## Getting Started

To get started with this project, follow the instructions below.

### Prerequisites

Make sure you have the following installed:

- Node.js (version 14 or later)
- npm (Node package manager)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd my-nextjs-app
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

### Running the Application

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start the development server at `http://localhost:3000`.

### Building for Production

To build the application for production, run:

```bash
npm run build
```

After building, you can start the production server with:

```bash
npm start
```

## Deploying To The Web (Vercel)

This repo includes GitHub Actions for:

- CI build checks on pull requests and pushes to `main`
- Automatic production deploy to Vercel on pushes to `main`

### One-time setup

1. Create a Vercel project and connect it to this repository.
2. In your local repo, link Vercel once:

   ```bash
   npx vercel link
   ```

   This creates `.vercel/project.json` locally with your org/project IDs.

3. In GitHub, open **Settings > Secrets and variables > Actions** and add:

- `VERCEL_TOKEN`: A Vercel personal access token
- `VERCEL_ORG_ID`: Your Vercel org/team ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `DATABASE_URL`: Your production PostgreSQL connection string

4. Push to `main`.

   - CI workflow: `.github/workflows/ci.yml`
   - CD workflow: `.github/workflows/deploy-vercel.yml`

### Notes about database persistence

This app uses Prisma with PostgreSQL (`prisma/schema.prisma`).

- Use a managed PostgreSQL provider (Neon, Supabase, Railway, RDS, etc.) for production.
- Set `DATABASE_URL` in both:
   - Vercel Project Environment Variables
   - GitHub Actions Secret (`DATABASE_URL`) for the deploy workflow

### Local database setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a local or managed PostgreSQL database.
3. Apply schema:

    ```bash
    npm run db:push
    ```

### Folder Structure

- `app/`: Contains the main application files including layout and pages.
- `components/`: Contains reusable components like the Header.
- `public/`: Static assets such as images and fonts.
- `package.json`: Project metadata and dependencies.
- `tsconfig.json`: TypeScript configuration.
- `next.config.mjs`: Next.js configuration.
- `postcss.config.js`: PostCSS configuration for processing CSS.
- `tailwind.config.ts`: Tailwind CSS configuration.

### License

This project is licensed under the MIT License. See the LICENSE file for details.