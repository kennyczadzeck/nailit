# NailIt - AI-Powered Renovation Project Management

NailIt helps homeowners monitor their renovation project communications and automatically flags important changes in pricing, scope, and schedule. Stay protected and in control of your project.

## 🚀 Current Status: Phase 1 - Foundation & Core UI ✅ COMPLETE

### ✅ Completed
- [x] Next.js 15 project setup with TypeScript
- [x] Tailwind CSS + design system components
- [x] Open Sans font integration (brand typography)
- [x] NailIt brand colors (#34A853 green, #1A73E8 blue)
- [x] Core UI components (Button, Card, Navigation)
- [x] Welcome page with value proposition
- [x] Dashboard page with project overview
- [x] Basic routing structure
- [x] Timeline page with project context header
- [x] Flagged items list page with detailed review modal
- [x] Settings pages (global + project-specific)
- [x] Authentication pages (signup/signin)
- [x] How It Works page
- [x] Mobile responsive navigation
- [x] Working button routing and navigation
- [x] **NEW**: Project creation workflow with team management
- [x] **NEW**: Detailed flagged item review modal with confirmation email generation
- [x] **NEW**: Gmail connection page with security features
- [x] **NEW**: Enhanced user story alignment

### 🎯 Ready for Phase 2
All Phase 1 objectives complete! The app now has:
- ✅ Complete navigable interface with realistic mock data
- ✅ Professional design system with NailIt branding
- ✅ All core pages accessible and functional
- ✅ Protection-first messaging throughout
- ✅ Demo authentication flow (redirects to dashboard)
- ✅ **User story-aligned workflows** for core renovation protection features

## 🚀 Current Status: Phase 2 - Authentication & Project Management

### 🎯 Next Steps (Phase 2 Completion)
- [ ] Supabase authentication setup
- [ ] Google OAuth integration
- [ ] Project creation/editing
- [ ] Team member management
- [ ] Protected routes

## 📋 Development Roadmap

### Phase 1: Foundation & Core UI (Week 1-2) - IN PROGRESS
**Goal**: Build the basic app structure with navigation and static screens

**User Stories**: US1 (Welcome), US2 (Project setup), US16 (Settings)

**Key Features**:
- ✅ Navigation system with NailIt branding
- ✅ Welcome page with protection-first messaging
- ✅ Dashboard with project overview
- 🔄 All static screens accessible
- 🔄 Responsive design system

### Phase 2: Authentication & Project Management (Week 3-4)
**Goal**: User accounts and basic project CRUD

**User Stories**: US13 (Account), US14 (Projects), US15 (Team management)

**Key Features**:
- [ ] Supabase authentication setup
- [ ] Google OAuth integration
- [ ] Project creation/editing
- [ ] Team member management
- [ ] Protected routes

### Phase 3: Gmail Integration (Week 5-6)
**Goal**: Connect to Gmail and sync emails

**User Stories**: US3 (Gmail connection), US4 (Monitoring), US5 (Sync)

**Key Features**:
- [ ] Gmail API OAuth flow
- [ ] Email fetching and storage
- [ ] Contact/thread identification
- [ ] Real-time sync with webhooks

### Phase 4: Change Detection & Classification (Week 7-8)
**Goal**: AI-powered email analysis and flagging

**User Stories**: US6 (Auto detection), US7 (Manual flagging), US8 (Classification)

**Key Features**:
- [ ] OpenAI integration for NLP
- [ ] Change detection algorithms
- [ ] Flag management system
- [ ] Timeline visualization

### Phase 5: Review & Action Flows (Week 9-10)
**Goal**: User review and confirmation workflows

**User Stories**: US9 (Review), US10 (Confirmations), US11 (Audit trail)

**Key Features**:
- [ ] Review interface for flagged items
- [ ] Confirmation email templates
- [ ] Action tracking and audit trail
- [ ] PDF export functionality

### Phase 6: Notifications & Summaries (Week 11-12)
**Goal**: Proactive notifications and reporting

**User Stories**: US12 (Summaries), US17 (Notifications), US18 (Export)

**Key Features**:
- [ ] Email notification system
- [ ] Weekly summary generation
- [ ] Advanced export options
- [ ] Notification preferences

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Open Sans font
- **UI Components**: Custom design system with NailIt branding
- **Backend**: Supabase (planned)
- **Authentication**: Google OAuth 2.0 (planned)
- **AI/NLP**: OpenAI API (planned)
- **Email**: Gmail API (planned)
- **Deployment**: AWS App Runner (Docker-based)
- **Infrastructure**: AWS CDK, ECR, Secrets Manager
- **CI/CD**: GitHub Actions

## 🎨 Design System

### Colors
- **Primary Green**: #34A853 (protection, success)
- **Secondary Blue**: #1A73E8 (trust, reliability)
- **Light Gray**: #E9ECEF (backgrounds)
- **Text**: #1F2937 (primary), #6B7280 (muted)

### Typography
- **Font**: Open Sans (400, 600, 700 weights)
- **Headers**: Open Sans Bold
- **Body**: Open Sans Regular

### Components
- Consistent border radius (rounded-md, rounded-lg)
- Shadow system (shadow-sm for cards)
- Button variants (primary, secondary, outline, ghost)
- Card layouts with proper spacing

## 🚀 Getting Started

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Visit the app**:
   Open [http://localhost:3000](http://localhost:3000)

### Deployment

The application uses Docker-based deployment on AWS App Runner with GitHub Actions for CI/CD.

**Environment URLs**:
- **Development**: https://u9eack5h4f.us-east-1.awsapprunner.com (develop branch)
- **Staging**: https://ubfybdadun.us-east-1.awsapprunner.com (staging branch)  
- **Production**: https://ijj2mc7dhz.us-east-1.awsapprunner.com (main branch)

**Deployment Process**:
1. Push to develop/staging/main branches
2. GitHub Actions builds Docker image with proper environment variables
3. Image pushed to ECR
4. App Runner automatically deploys new image

**Infrastructure Management**:
```bash
cd infrastructure

# Deploy Docker-based infrastructure
npm run deploy:docker:dev
npm run deploy:docker:staging
npm run deploy:docker:prod

# Legacy source code deployment (fallback)
npm run deploy:source:dev
```

**Documentation**:
- [Docker Migration Plan](docs/deployment/DOCKER_MIGRATION_PLAN.md)
- [Quick Start Guide](docs/deployment/DOCKER_MIGRATION_QUICKSTART.md)

## 📁 Project Structure

```
app/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── Navigation.tsx # Main navigation
│   ├── Timeline.tsx   # Timeline component
│   └── ExportDropdown.tsx
├── lib/
│   └── utils.ts      # Utility functions
├── welcome/          # Landing page
├── dashboard/        # Main dashboard
├── timeline/         # Project timeline (planned)
├── flagged/          # Flagged items (planned)
├── settings/         # Settings pages (planned)
├── layout.tsx        # Root layout
├── page.tsx          # Home redirect
└── globals.css       # Global styles
```

## 🔐 Environment Variables (Planned)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=
```

## 📝 User Stories Mapping

19 user stories mapped across 6 development phases:
- **Setup & Integration**: 3 stories (US1-3)
- **Change Detection**: 4 stories (US4-7) 
- **Review & Action**: 3 stories (US8-10)
- **Project Management**: 3 stories (US11-13)
- **Settings & Control**: 3 stories (US14-16)
- **Security & Privacy**: 3 stories (US17-19)

## 🎯 Success Metrics

- **Phase 1**: All screens navigable, responsive design
- **Phase 2**: User registration and project creation working
- **Phase 3**: Gmail emails visible in timeline
- **Phase 4**: AI successfully flags test changes
- **Phase 5**: Complete review-to-confirmation flow
- **Phase 6**: Automated weekly summaries sent

---

**Protection-First Approach**: Every feature designed to help homeowners stay informed and protected during their renovation projects.
# Force deployment after env var changes

## 🎉 Development Workflow Test

This line was added to test the 3-environment development workflow:
- Feature branch → Development → Staging → Production
- Testing smart amplify.yml environment detection
- Verifying database migration strategies work correctly

**Workflow Status**: ✅ All environments operational

## 🔐 Environment Variables Updated
- NextAuth secrets configured for all environments
- Environment variables moved from Secrets Manager to standard env vars
- DIRECT_URL variables added to all environments
- Ready for authentication re-enablement

<!-- Test PR workflow validation - can be removed after testing -->

## 🧪 Testing Strategy

### Testing Layer Separation

**📧 Email Testing (Foundation Layer)**
- **Purpose**: Validate email infrastructure without AI processing
- **Cost**: Free (no AI processing costs)
- **Scope**: Database setup → OAuth → Email generation → Gmail ingestion → Validation
- **Commands**: `npm run test:email:master`, `npm run test:email:foundation`

**🤖 E2E Testing (Extension Layer)**  
- **Purpose**: AI processing and visualization on top of email foundation
- **Cost**: ~$0.08-0.16 per test (AI processing)
- **Scope**: Email foundation → AI analysis → Flagged items → Timeline
- **Commands**: `npm run test:e2e:ai-basic`, `npm run test:e2e:complete`

**Key Principle**: Email testing must pass before E2E testing can run. E2E testing extends email testing but never replaces it.

### Testing Commands

```bash
# Email Testing Foundation (Free)
npm run test:email:master           # Complete email workflow
npm run test:email:foundation       # Foundation validation
npm run test:oauth-status          # OAuth verification

# E2E Testing Extensions (AI Processing Costs)
npm run test:e2e:ai-basic          # Email + AI processing
npm run test:e2e:complete          # Full E2E workflow

# OAuth Management
npm run test:oauth-setup homeowner  # Setup homeowner OAuth
npm run test:oauth-setup contractor # Setup contractor OAuth
```

### Development Workflow

```bash
# Daily development: Free foundation testing
npm run test:email:foundation

# Feature development: Add AI processing
npm run test:e2e:ai-basic

# Pre-deployment: Complete validation
npm run test:e2e:complete
```
