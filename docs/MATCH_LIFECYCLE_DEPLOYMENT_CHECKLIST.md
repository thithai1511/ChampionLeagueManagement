# Match Lifecycle Workflow - Deployment Checklist

## Pre-Deployment

### Database
- [ ] Backup current database
- [ ] Review migration script: `backend/src/db/migrations/003_match_lifecycle_workflow.sql`
- [ ] Run migration on staging environment first
- [ ] Verify all tables created: `matches` (updated), `supervisor_reports`, `match_lineups`, `match_lifecycle_history`
- [ ] Verify all indexes created
- [ ] Test rollback procedure

### Backend Code
- [ ] Pull latest code from repository
- [ ] Review new files:
  - [ ] `backend/src/services/matchLifecycleService.ts`
  - [ ] `backend/src/services/supervisorReportService.ts`
  - [ ] `backend/src/controllers/matchLifecycleController.ts`
  - [ ] `backend/src/routes/matchLifecycleRoutes.ts`
- [ ] Review updated files:
  - [ ] `backend/src/app.ts` (route mounting)
  - [ ] `backend/src/services/notificationService.ts` (createNotification method)
- [ ] Run `npm install` (if dependencies changed)
- [ ] Run TypeScript compiler: `npm run build`
- [ ] Fix any compilation errors
- [ ] Review ESLint warnings

### Frontend Code
- [ ] Review new components:
  - [ ] `src/apps/admin/components/MatchLifecycleManager.jsx`
  - [ ] `src/apps/admin/components/TeamMatchLineup.jsx`
  - [ ] `src/apps/admin/components/SupervisorReportForm.jsx`
  - [ ] `src/apps/admin/pages/MatchLifecycleWorkflowPage.jsx`
- [ ] Run `npm install` (if dependencies changed)
- [ ] Test components in development mode
- [ ] Build frontend: `npm run build`
- [ ] Check bundle size (should be reasonable)

## Deployment Steps

### Step 1: Database Migration
```bash
# Connect to database
sqlcmd -S your-server -d ChampionLeague -U username -P password

# Run migration
:r C:\Web\ChampionLeagueManagement\backend\src\db\migrations\003_match_lifecycle_workflow.sql
GO

# Verify tables created
SELECT name FROM sys.tables WHERE name IN ('supervisor_reports', 'match_lineups', 'match_lifecycle_history');
GO

# Verify columns added to matches
SELECT column_name FROM information_schema.columns WHERE table_name = 'matches' AND column_name LIKE '%lifecycle%';
GO
```

### Step 2: Backend Deployment
```bash
cd backend

# Install dependencies
npm install

# Build
npm run build

# Run tests (if available)
npm test

# Start server
npm start

# Or use PM2 for production
pm2 start ecosystem.config.js
pm2 save
```

### Step 3: Verify Backend APIs
Test each endpoint:

```bash
# 1. Get match details
curl -X GET http://localhost:3000/api/matches/1/details \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Get lifecycle statistics
curl -X GET http://localhost:3000/api/seasons/1/matches/lifecycle-statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Assign officials
curl -X POST http://localhost:3000/api/matches/1/assign-officials \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mainRefereeId": 5,
    "supervisorId": 6
  }'

# 4. Get matches by status
curl -X GET http://localhost:3000/api/seasons/1/matches/by-status?status=SCHEDULED \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Submit supervisor report
curl -X POST http://localhost:3000/api/matches/1/supervisor-report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationRating": 8,
    "homeTeamRating": 7,
    "awayTeamRating": 8
  }'
```

### Step 4: Frontend Deployment
```bash
# Build frontend
npm run build

# Deploy dist/ folder to web server
# Or if using same server:
npm start
```

### Step 5: Frontend Route Configuration
Add route to your router:

```jsx
// In src/apps/admin/App.jsx or router config
import MatchLifecycleWorkflowPage from './pages/MatchLifecycleWorkflowPage';

<Route 
  path="/admin/matches/lifecycle" 
  element={<MatchLifecycleWorkflowPage />} 
/>
```

### Step 6: Menu Integration
Add menu item for easy access:

```jsx
// In admin menu configuration
{
  title: "Quản lý Trận đấu",
  icon: <Calendar />,
  path: "/admin/matches/lifecycle",
  permission: "manage_matches"
}
```

## Post-Deployment Verification

### Functional Testing

#### Test Case 1: Match Creation & Officials Assignment
- [ ] Create a new match (should be SCHEDULED)
- [ ] Navigate to Match Lifecycle page
- [ ] Verify match appears in SCHEDULED tab
- [ ] Click "Phân công trọng tài"
- [ ] Select main referee (required)
- [ ] Select supervisor (optional)
- [ ] Submit form
- [ ] Verify match moves to PREPARING tab
- [ ] Check notifications sent to officials
- [ ] Check notifications sent to teams

#### Test Case 2: Lineup Submission (Team View)
- [ ] Login as team admin
- [ ] Navigate to lineup submission page
- [ ] Verify match appears (must be PREPARING status)
- [ ] Click "Nộp danh sách"
- [ ] Select 11 starting players
- [ ] Select 1-5 substitutes
- [ ] Try selecting 6 foreign players in starting 11 → Should show error
- [ ] Correct to 5 or less foreign players
- [ ] Submit lineup
- [ ] Verify status changes to SUBMITTED
- [ ] Check notification received

#### Test Case 3: Lineup Approval (Admin View)
- [ ] Login as BTC admin
- [ ] Navigate to Match Lifecycle page
- [ ] Go to PREPARING tab
- [ ] Find match with both lineups SUBMITTED
- [ ] Expand match details
- [ ] Click "Duyệt" for home team lineup
- [ ] Click "Duyệt" for away team lineup
- [ ] Verify match automatically moves to READY tab
- [ ] Check notifications sent to teams

#### Test Case 4: Match Progression
- [ ] Change match status to IN_PROGRESS (manual)
- [ ] Change match status to FINISHED
- [ ] Verify notifications sent to referee & supervisor
- [ ] Check match appears in FINISHED tab

#### Test Case 5: Supervisor Report
- [ ] Login as supervisor
- [ ] Navigate to supervisor report page
- [ ] Find match in "Chờ báo cáo" tab
- [ ] Click "Nộp báo cáo"
- [ ] Fill in all ratings (1-10)
- [ ] Add incident report (optional)
- [ ] Check "Vi phạm nghiêm trọng"
- [ ] Check "Gửi lên Ban Kỷ luật"
- [ ] Submit report
- [ ] Verify report appears in "Đã nộp" tab
- [ ] Check notification sent to disciplinary committee
- [ ] As admin, verify report appears in disciplinary review

#### Test Case 6: Match Completion
- [ ] Ensure both referee & supervisor reports submitted
- [ ] Verify match status is REPORTED
- [ ] Admin changes status to COMPLETED
- [ ] Verify match appears in COMPLETED tab

### Performance Testing
- [ ] Test with 50+ matches in different statuses
- [ ] Verify page load time < 2 seconds
- [ ] Test concurrent lineup submissions
- [ ] Test notification delivery under load

### Security Testing
- [ ] Verify team can only submit lineup for their own matches
- [ ] Verify supervisor can only see their assigned matches
- [ ] Verify unauthorized users cannot access admin endpoints
- [ ] Test SQL injection on text inputs
- [ ] Test XSS on incident report field

## Monitoring Setup

### Application Logs
Monitor these log patterns:
```
[MatchLifecycle] Match X transitioned: SCHEDULED → PREPARING
[SupervisorReport] Serious violation flagged for match X
[Notification] Sent to user X: Title
```

### Database Queries
Set up monitoring for:
- Match status distribution
- Average time in each status
- Notification delivery rate
- Lineup submission compliance
- Supervisor report submission rate

### Alerts
Set up alerts for:
- [ ] Match stuck in PREPARING for > 7 days
- [ ] Match stuck in FINISHED for > 3 days (reports not submitted)
- [ ] High volume of lineup rejections (> 30%)
- [ ] Notification delivery failures
- [ ] Database connection errors

## Rollback Plan

If issues occur, rollback steps:

### Step 1: Stop Application
```bash
pm2 stop all
```

### Step 2: Rollback Database
```sql
-- Drop new tables
DROP TABLE IF EXISTS match_lifecycle_history;
DROP TABLE IF EXISTS match_lineups;
DROP TABLE IF EXISTS supervisor_reports;

-- Remove new columns from matches
ALTER TABLE matches DROP COLUMN IF EXISTS status;
ALTER TABLE matches DROP COLUMN IF EXISTS main_referee_id;
ALTER TABLE matches DROP COLUMN IF EXISTS supervisor_id;
-- etc.
```

### Step 3: Deploy Previous Code
```bash
git checkout <previous-commit>
npm install
npm run build
pm2 start all
```

### Step 4: Verify Rollback
- [ ] Old features still work
- [ ] Database queries succeed
- [ ] No errors in logs

## User Training

### Training Sessions Required

#### Session 1: BTC Admins (30 minutes)
- [ ] Overview of match lifecycle workflow
- [ ] How to assign officials
- [ ] How to review lineups
- [ ] How to manage match status
- [ ] How to view reports
- [ ] Q&A

#### Session 2: Team Admins (20 minutes)
- [ ] How to submit lineups
- [ ] Lineup validation rules
- [ ] How to resubmit if rejected
- [ ] Q&A

#### Session 3: Officials (20 minutes)
- [ ] How to access assigned matches
- [ ] How to submit supervisor report
- [ ] Rating guidelines
- [ ] When to flag serious violations
- [ ] Q&A

### Training Materials
- [ ] User manual (PDF)
- [ ] Video walkthrough
- [ ] FAQ document
- [ ] Quick reference guide

## Documentation Review
- [ ] Read `docs/MATCH_LIFECYCLE_IMPLEMENTATION_GUIDE.md`
- [ ] Read `docs/MATCH_LIFECYCLE_IMPLEMENTATION_SUMMARY.md`
- [ ] Review API documentation
- [ ] Review frontend component documentation

## Sign-off

### Technical Team
- [ ] Backend Developer: _________________ Date: _______
- [ ] Frontend Developer: _________________ Date: _______
- [ ] Database Administrator: _____________ Date: _______
- [ ] QA Engineer: _______________________ Date: _______

### Business Team
- [ ] Product Owner: _____________________ Date: _______
- [ ] BTC Representative: ________________ Date: _______
- [ ] Technical Lead: ____________________ Date: _______

## Post-Launch Tasks

### Week 1
- [ ] Monitor error logs daily
- [ ] Track user feedback
- [ ] Measure adoption rate
- [ ] Address critical bugs

### Week 2-4
- [ ] Analyze usage patterns
- [ ] Optimize slow queries
- [ ] Gather user feedback
- [ ] Plan Phase 2 features

### Month 2+
- [ ] Review performance metrics
- [ ] Plan enhancements
- [ ] Update documentation
- [ ] Train new users

---

**Checklist Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for deployment
