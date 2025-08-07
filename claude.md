# Claude Code Instructions - Volleyball Team Manager PWA

## Initial Setup Instructions

### 🤖 IMMEDIATE ACTION REQUIRED
When starting any session with this project:

1. **FIRST**: Read this CLAUDE.md file completely
2. **SECOND**: Automatically read the `project-status.json` file to understand current project state
3. **THIRD**: Based on the task type, use the appropriate specialized agent:

### Agent Selection Guide

Choose the correct agent based on the task:

- **general-purpose**: For codebase exploration, complex searches, or multi-step analysis tasks
- **test-automator**: For implementing tests, test coverage, or automated testing (Note: Currently no tests exist)
- **security-auditor**: For authentication, JWT issues, security reviews, or OWASP compliance
- **render-deployment-specialist**: For deployment issues, build problems, or Render.com configuration
- **react-query-optimizer**: For data fetching optimization, caching issues, or TanStack React Query problems
- **react-performance-optimizer**: For React performance issues, slow rendering, or bundle optimization
- **pwa-specialist**: For PWA features, service worker issues, or offline functionality
- **mongodb-database-specialist**: For database schema changes, query optimization, or Mongoose issues
- **material-ui-designer**: For UI component design, theming, or responsive layouts
- **api-developer**: For Express.js backend development, API endpoints, or server-side functionality
- **notion-backlog-manager**: For project management and task tracking (if Notion integration needed)
- **notification-system-expert**: For push notifications, web-push implementation, or notification scheduling

### Quick Agent Selection Examples:
- "Fix slow loading dashboard" → **react-performance-optimizer**
- "Add new API endpoint" → **api-developer** 
- "Database query optimization" → **mongodb-database-specialist**
- "PWA not working offline" → **pwa-specialist**
- "UI component styling issue" → **material-ui-designer**
- "Deploy to Render failing" → **render-deployment-specialist**

## Critical Guidelines

### 🚨 MOST IMPORTANT RULE
**ONLY implement the requested changes. DO NOT modify unrelated code, functionality, or layouts.**

When making changes to existing files:
- **ADD or MODIFY** code at the specific locations needed
- **PRESERVE** all existing functionality and layout
- **DO NOT** create new versions of files - edit in place
- **MAINTAIN** the current code structure and organization

## Project Overview
A Progressive Web App for managing volleyball teams with youth player integration. Deployed on Render.com with separate frontend (React) and backend (Node.js/Express).

## Architecture
```
volleyball-app/
├── client/                 # React Frontend (PWA)
│   ├── public/            # Static files, manifest.json
│   ├── src/               # React source code
│   └── package.json       # Frontend dependencies
├── server/                # Node.js/Express Backend
│   ├── controllers/       # API controllers
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   └── package.json      # Backend dependencies
├── package.json          # Root package.json for scripts
└── render.yaml          # Render deployment config
```

## Environment Details
- **OS**: Windows
- **Terminal**: PowerShell
- **Node.js**: 18.17.0 LTS recommended
- **Database**: MongoDB Atlas
- **Deployment**: Render.com

## Git Workflow Rules

### Before Any Push
**ALWAYS ASK BEFORE PUSHING TO GIT**

### Branch Strategy
- **Small changes**: Push directly to `main` branch
- **Large changes**: Create and push to a test branch (e.g., `feature/test-feature-name`)
- **Reason**: Avoid downtime for users since code is NOT tested locally

### Git Commands
```powershell
# For small changes (after approval)
git add .
git commit -m "fix: small description"
git push origin main

# For large changes (after approval)
git checkout -b feature/test-feature-name
git add .
git commit -m "feat: detailed description"
git push origin feature/test-feature-name
```

## Development Rules

### Package Management
- Use `npm ci` for production installs
- Check existing packages before adding new ones
- Avoid duplicate functionality
- Prefer built-in APIs over external packages

### Code Modifications
1. **Locate** the exact file and section to modify
2. **Preserve** surrounding code and functionality
3. **Add/Modify** only what's necessary
4. **Test** mentally for side effects
5. **Maintain** existing code style

### API Development
- All routes start with `/api`
- Follow RESTful conventions
- Include error handling
- Maintain consistent response format

## Environment Variables

### Backend (Runtime - changes take effect on restart)
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=[secure-key]
CORS_ORIGIN=https://inteamfe.onrender.com
```

### Frontend (Build-time - requires rebuild!)
```
REACT_APP_API_URL=https://inteam.onrender.com/api
```

## Test Environment
**Current Testing Configuration:**
- **Test Backend**: https://inteam-test-backend-2.onrender.com
- **Test Frontend**: https://inteam-test.onrender.com  
- **Test API URL**: `REACT_APP_API_URL=https://inteam-test-backend-2.onrender.com/api`

Use the test environment for development and testing before deploying to production.

## Common Tasks

### Adding a New Feature
1. Identify files that need modification
2. Make minimal, targeted changes
3. Preserve all existing functionality
4. Commit with descriptive message
5. Ask before pushing

### Fixing Bugs
1. Locate the specific issue
2. Fix only the problematic code
3. Don't refactor unrelated parts
4. Test the fix mentally
5. Ask before pushing

### Updating Dependencies
1. Check compatibility first
2. Update package.json
3. Run `npm install`
4. Verify no breaking changes
5. Ask before pushing

## Deployment URLs
- **Frontend**: https://inteamfe.onrender.com
- **Backend**: https://inteam.onrender.com

## Key Features to Preserve
- PWA functionality (offline support)
- Multiple team management
- Youth player integration
- Role-based permissions (Trainer/Player/Youth)
- Mobile-responsive UI

## Response Format
When implementing changes:
1. Identify the file(s) to modify
2. Explain what changes will be made
3. Show the specific modifications
4. Confirm no unrelated code is affected
5. Ask for permission before git operations

## Project Status Tracking

### After Every Feature/Code Change
**MANDATORY**: Update the project-status.json file after implementing any feature or making code changes:

1. **Read** the existing project-status.json file
2. **Analyze** what has changed in the codebase since the last update
3. **Update** the following sections:
   - Increment version if appropriate (patch for fixes, minor for features)
   - Update `lastAnalyzed` timestamp to current ISO 8601 format
   - Move any completed in-progress items to completed features
   - Add any new features found in the code to `implementedFeatures`
   - Add a new entry to `recentChanges` with:
     * Current timestamp
     * List of modified/added/deleted files
     * Summary of changes made
     * Impact of changes on the application
   - Update `codeStatistics` (file counts, lines of code)
   - Update `completionPercentage` if significant progress made
4. **Preserve** the change history (keep previous entries in recentChanges)
5. **Scan** for new TODO/FIXME comments and add to `knownIssues` if found

### Status Update Command Template
```bash
# Count files and lines after changes
find client/src -name "*.js" -type f | wc -l
find server -name "*.js" -type f | wc -l
find client/src -name "*.js" -type f -exec wc -l {} + | tail -n 1
find server -name "*.js" -type f -exec wc -l {} + | tail -n 1
```

### Version Increment Rules
- **Patch (1.0.x)**: Bug fixes, small improvements, configuration changes
- **Minor (1.x.0)**: New features, significant enhancements
- **Major (x.0.0)**: Breaking changes, major architectural updates

## Remember
- This is a production application with active users
- Downtime affects real teams and players
- Every change should be minimal and focused
- Always preserve existing functionality
- Ask before any git push operation
- The UI language is German, so also use German time
- **Always update project-status.json after making changes**