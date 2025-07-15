# Claude Code Instructions - Volleyball Team Manager PWA

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

## Remember
- This is a production application with active users
- Downtime affects real teams and players
- Every change should be minimal and focused
- Always preserve existing functionality
- Ask before any git push operation