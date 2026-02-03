# Data Guard

A cross-platform desktop application built with Electron, Next.js, and Express
for comprehensive data security management.

## 🚀 Technologies

### Frontend (Renderer Process)

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development
- **React** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing

### Backend (Server)

- **Express.js** - Node.js web framework
- **TypeScript** - Type-safe server development

### Desktop Application

- **Electron** - Cross-platform desktop framework
- **Electron Forge** - Build and packaging tool
- **Webpack** - Module bundler

## 📁 Project Structure

```
data-guard/
├── src/
│   ├── renderer/          # Next.js Frontend Application
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── context/      # React context providers
│   │   └── public/       # Static assets
│   ├── server/           # Express Backend Server
│   │   └── src/         # Server source code
│   ├── main.js          # Electron main process
│   ├── preload.js       # Electron preload script
│   └── renderer.js      # Electron renderer bootstrap
├── forge.config.js      # Electron Forge configuration
├── webpack.*.config.js  # Webpack configurations
└── package.json         # Root dependencies
```

## 👨‍💻 Development Guidelines

### For Frontend Developers

**Working Directory:** `src/renderer/`

#### What You Can Edit:

- ✅ **Pages:** `src/renderer/app/**/*.tsx` - Add/modify application pages
- ✅ **Components:** `src/renderer/components/**/*.tsx` - Create/update React
  components
- ✅ **Styles:** `src/renderer/app/globals.css` - Global styles
- ✅ **Context:** `src/renderer/context/*.tsx` - State management
- ✅ **Public Assets:** `src/renderer/public/` - Images, icons, fonts

#### Commands:

```bash
# Navigate to renderer directory
cd src/renderer

# Install dependencies (if needed)
npm install

# Development mode (Next.js dev server)
npm run dev

# Build for production
npm run build
```

#### ⚠️ DO NOT MODIFY:

- ❌ `next.config.ts` - Unless coordinating with team lead
- ❌ `tsconfig.json` - TypeScript configuration
- ❌ `postcss.config.mjs` - PostCSS configuration
- ❌ `eslint.config.mjs` - Linting rules
- ❌ Root level webpack files
- ❌ Electron configuration files

### For Backend Developers

**Working Directory:** `src/server/`

#### What You Can Edit:

- ✅ **Routes & Controllers:** `src/server/src/**/*.ts` - API endpoints and
  business logic
- ✅ **Server Entry:** `src/server/src/index.ts` - Server initialization
- ✅ **Application Logic:** `src/server/src/app.ts` - Express app configuration

#### Commands:

```bash
# Navigate to server directory
cd src/server

# Install dependencies (if needed)
npm install

# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

#### ⚠️ DO NOT MODIFY:

- ❌ `tsconfig.json` - Unless coordinating with team lead
- ❌ Root level configuration files
- ❌ Electron configuration files
- ❌ Webpack configurations

### For Full-Stack Developers (Electron Integration)

**Working Directory:** Root (`./`)

#### What You Can Edit:

- ✅ **Electron Main:** `src/main.js` - Main process logic
- ✅ **Preload Script:** `src/preload.js` - Bridge between main and renderer
- ✅ **Renderer Bootstrap:** `src/renderer.js` - Renderer initialization

#### Commands:

```bash
# Install all dependencies (root + renderer + server)
npm install

# Start Electron app in development
npm run dev

# Package application
npm run package

# Create distributable
npm run make
```

#### ⚠️ DO NOT MODIFY (Without Team Discussion):

- ❌ `forge.config.js` - Electron Forge build configuration
- ❌ `webpack.*.config.js` - Build process configuration
- ❌ Root `package.json` - Core dependencies

## 🔧 Initial Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd data-guard
   ```

2. **Install root dependencies**

   ```bash
   npm install
   ```

3. **Install renderer dependencies**

   ```bash
   cd src/renderer
   npm install
   cd ../..
   ```

4. **Install server dependencies**

   ```bash
   cd src/server
   npm install
   cd ../..
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

## 📦 Building for Production

```bash
# Package the application
npm run package

# Create distributable installers
npm run make

# Publish (if configured)
npm run publish
```

## 🛡️ Best Practices

### General Rules:

1. **Stay in Your Domain:** Frontend devs work in `src/renderer/`, backend devs
   in `src/server/`
2. **Don't Touch Config Files:** Configuration files are managed by the team
   lead
3. **Use Git Branches:** Create feature branches, don't commit directly to main
4. **Test Before Committing:** Run your code locally before pushing
5. **Follow TypeScript:** Use proper typing, avoid `any`
6. **Component Structure:** Keep components small and reusable
7. **API Communication:** Use proper error handling for API calls

### Communication Between Frontend & Backend:

- Frontend communicates with backend through Electron IPC or HTTP requests
- Backend exposes RESTful API endpoints
- Coordinate API contract changes between teams

## 🐛 Troubleshooting

### Frontend Issues:

```bash
cd src/renderer
rm -rf .next node_modules
npm install
npm run dev
```

### Backend Issues:

```bash
cd src/server
rm -rf dist node_modules
npm install
npm run dev
```

### Electron Issues:

```bash
rm -rf node_modules out
npm install
npm run dev
```

## 📝 Environment Variables

Create appropriate `.env` files in:

- `src/renderer/.env.local` - Frontend environment variables
- `src/server/.env` - Backend environment variables

**Never commit `.env` files to version control!**

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes in the appropriate directory
3. Test thoroughly
4. Commit with clear messages: `git commit -m "feat: add new feature"`
5. Push and inform the techincal team lead

## 🔀 Git Workflow & Commands

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd data-guard

# Configure your identity (first time only)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Check current branch
git branch
```

### Creating and Switching Branches

```bash
# Create a new branch
git branch feature/new-feature

# Switch to the branch
git checkout feature/new-feature

# Create and switch in one command (recommended)
git checkout -b feature/new-feature

# List all branches
git branch -a

# Switch back to main branch
git checkout main
```

### Branch Naming Conventions

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/user-authentication`)
- `fix/` - Bug fixes (e.g., `fix/login-error`)
- `hotfix/` - Urgent production fixes (e.g., `hotfix/security-patch`)
- `refactor/` - Code refactoring (e.g., `refactor/api-structure`)
- `docs/` - Documentation updates (e.g., `docs/api-guide`)
- `test/` - Adding tests (e.g., `test/unit-tests`)

### Making Changes

```bash
# Check status of your changes
git status

# View differences
git diff

# Stage specific files
git add src/renderer/app/page.tsx
git add src/server/src/app.ts

# Stage all changes
git add .

# Stage only modified files (not new/deleted)
git add -u

# Unstage a file
git restore --staged <file>

# Discard changes in working directory
git restore <file>
```

### Committing Changes

```bash
# Commit with message
git commit -m "feat: add user dashboard page"

# Commit with detailed message
git commit -m "feat: add user dashboard" -m "- Added dashboard layout
- Integrated security metrics
- Added responsive design"

# Amend last commit (if you forgot something)
git add forgotten-file.tsx
git commit --amend --no-edit

# Amend commit message
git commit --amend -m "feat: corrected commit message"
```

### Commit Message Best Practices

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding/updating tests
- `chore:` - Maintenance tasks

**Examples:**

```bash
git commit -m "feat(frontend): add alerts page"
git commit -m "fix(backend): resolve authentication error"
git commit -m "docs: update README with Git workflow"
git commit -m "refactor(components): simplify Table component"
```

### Pushing Changes

```bash
# Push to remote repository (first time for new branch)
git push -u origin feature/new-feature

# Push subsequent changes
git push

# Force push (use with caution!)
git push --force

# Push all branches
git push --all
```

### Pulling Updates

```bash
# Pull changes from current branch
git pull

# Pull with rebase (cleaner history)
git pull --rebase

# Pull from specific branch
git pull origin main
```

### Viewing History

```bash
# View commit history
git log

# View compact history
git log --oneline

# View history with graph
git log --oneline --graph --all

# View changes in a commit
git show <commit-hash>

# View file history
git log --follow <file>
```

## 🎯 Git Best Practices

### ✅ DO:

1. **Commit Often** - Make small, logical commits
2. **Write Clear Messages** - Follow conventional commit format
3. **Pull Before Push** - Always sync with remote before pushing
4. **Use Branches** - Never work directly on main/master
5. **Test Before Commit** - Ensure code works before committing
6. **Review Your Changes** - Use `git diff` before committing
7. **Keep Commits Focused** - One logical change per commit
8. **Sync Regularly** - Pull from main frequently to avoid conflicts
9. **Use .gitignore** - Don't commit node_modules, .env, or build files
10. **Backup Your Work** - Push your branches to remote regularly

### ❌ DON'T:

1. **Don't Commit Secrets** - Never commit API keys, passwords, or tokens
2. **Don't Force Push** - Especially not to main or shared branches
3. **Don't Commit Large Files** - Use Git LFS for large assets
4. **Don't Mix Concerns** - Keep frontend and backend changes separate when
   possible
5. **Don't Skip Testing** - Always test before committing
6. **Don't Use `git add .` Blindly** - Review what you're staging
7. **Don't Rewrite Public History** - No force push to shared branches
8. **Don't Leave Branches Hanging** - Delete merged/abandoned branches
9. **Don't Commit Generated Files** - Build outputs should be in .gitignore
10. **Don't Work on Main** - Always use feature branches

### 📋 Pre-Commit Checklist:

- [ ] Code runs without errors
- [ ] Tests pass (if applicable)
- [ ] No console.logs or debug code
- [ ] No commented-out code
- [ ] Proper TypeScript types used
- [ ] Files properly formatted
- [ ] No sensitive data included
- [ ] Commit message is clear and follows conventions

### 🚀 Pull Request Best Practices:

1. **Update Your Branch** - Sync with main before creating PR
2. **Write Description** - Explain what changes and why
3. **Link Issues** - Reference related issue numbers
4. **Request Reviews** - Tag appropriate team members
5. **Respond to Feedback** - Address review comments promptly
6. **Keep PRs Small** - Easier to review and merge
7. **Test on Your Branch** - Ensure everything works
8. **Update Documentation** - If you changed behavior

### 🔄 Daily Workflow Example:

```bash
# Start of day - sync with main
git checkout main
git pull origin main

# Create/switch to your feature branch
git checkout -b feature/new-dashboard

# Make changes, test, commit
git add src/renderer/app/dashboard/
git commit -m "feat(frontend): add dashboard layout"

# Sync with main regularly
git checkout main
git pull origin main
git checkout feature/new-dashboard
git merge main

# Push your work
git push -u origin feature/new-dashboard

# End of day - ensure everything is pushed
git push
```

## 📄 License

[Add your license here]

## 👥 Team

- **Frontend Team:** Work in `src/renderer/`
- **Backend Team:** Work in `src/server/`
- **DevOps/Lead:** Manages configuration and Electron integration

---

**Remember:** When in doubt about modifying a configuration file, ask the team
lead first! 🚨
