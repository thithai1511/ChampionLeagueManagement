# 🔧 ACTION PLAN - Fix Match Lifecycle Integration

## Vấn đề hiện tại

✅ **Migration 002** (Season Registration) - OK, không conflict  
❌ **Migration 003** (Match Lifecycle) - CẦN FIX, đang tạo duplicate tables

## Đã làm

✅ Tạo `003_match_lifecycle_integration_FIXED.sql` - Migration mới không conflict:
   - Không tạo lại `match_lineups` (đã có sẵn)
   - Không tạo lại `match_official_assignments` (đã có sẵn) 
   - Chỉ thêm columns mới vào các bảng có sẵn
   - Tạo 2 bảng mới: `supervisor_reports`, `match_lifecycle_history`
   - Chuẩn hóa status values (lowercase → UPPERCASE)

## Cần làm tiếp

### 1. Refactor `matchLifecycleService.ts` ⚠️ URGENT

**Vấn đề:** Đang tự query SQL trực tiếp, duplicate logic

**Fix:**
```typescript
// ❌ ĐANG LÀM (duplicate):
export async function assignOfficials(input) {
  await query(`UPDATE matches SET main_referee_id = @id ...`);
  // Ghi trực tiếp vào matches table
}

// ✅ NÊN LÀM (reuse):
import * as matchOfficialService from './matchOfficialService';

export async function assignOfficials(input, assignedBy) {
  // Dùng service có sẵn - ghi vào match_official_assignments
  await matchOfficialService.assignOfficialToMatch(
    input.matchId,
    input.mainRefereeId,
    'referee',
    assignedBy
  );
  
  if (input.supervisorId) {
    await matchOfficialService.assignOfficialToMatch(
      input.matchId,
      input.supervisorId,
      'supervisor', // role mới
      assignedBy
    );
  }
  
  // Sau đó mới transition status
  await changeMatchStatus(input.matchId, 'PREPARING', { ... });
}
```

**Tương tự cho lineup:**
```typescript
// Dùng matchLineupService thay vì tự query
import * as matchLineupService from './matchLineupService';

// Cần extend matchLineupService với approval logic
```

### 2. Extend `matchLineupService.ts`

**Thêm functions mới:**
```typescript
// Trong matchLineupService.ts

export async function approveLineup(
  matchId: number, 
  teamType: 'home' | 'away',
  approvedBy: number
): Promise<void> {
  await query(`
    UPDATE match_lineups 
    SET approval_status = 'APPROVED',
        approved_by = @approvedBy,
        approved_at = GETDATE()
    WHERE match_id = @matchId 
    AND team_type = @teamType
  `, { matchId, teamType, approvedBy });
  
  // Check if both approved → trigger lifecycle service
  const bothApproved = await checkBothLineupsApproved(matchId);
  if (bothApproved) {
    // Import tránh circular dependency
    const { changeMatchStatus } = await import('./matchLifecycleService');
    await changeMatchStatus(matchId, 'READY', { changedBy: approvedBy });
  }
}

export async function rejectLineup(
  matchId: number,
  teamType: 'home' | 'away',
  reason: string,
  rejectedBy: number
): Promise<void> {
  await query(`
    UPDATE match_lineups
    SET approval_status = 'REJECTED',
        rejection_reason = @reason,
        approved_by = @rejectedBy,
        approved_at = GETDATE()
    WHERE match_id = @matchId 
    AND team_type = @teamType
  `, { matchId, teamType, reason, rejectedBy });
}

async function checkBothLineupsApproved(matchId: number): Promise<boolean> {
  const result = await query(`
    SELECT 
      COUNT(DISTINCT team_type) as approved_teams
    FROM match_lineups
    WHERE match_id = @matchId
    AND approval_status = 'APPROVED'
    AND team_type IN ('home', 'away')
  `, { matchId });
  
  return result.recordset[0]?.approved_teams === 2;
}
```

### 3. Fix `matchLifecycleController.ts`

**Cập nhật để dùng refactored services:**

```typescript
// ❌ XÓA direct access
export const assignOfficials = async (req, res) => {
  await matchLifecycleService.assignOfficials(...);
};

// ✅ HOẶC gọi trực tiếp matchOfficialService
export const assignOfficials = async (req, res) => {
  const { matchId } = req.params;
  const { mainRefereeId, supervisorId, ... } = req.body;
  const userId = req.user.userId;
  
  // Use existing service
  if (mainRefereeId) {
    await matchOfficialService.assignOfficialToMatch(
      matchId, mainRefereeId, 'referee', userId
    );
  }
  
  if (supervisorId) {
    await matchOfficialService.assignOfficialToMatch(
      matchId, supervisorId, 'supervisor', userId
    );
  }
  
  // Then transition
  await matchLifecycleService.changeMatchStatus(
    matchId, 'PREPARING', { changedBy: userId }
  );
  
  res.json({ success: true });
};
```

### 4. Fix Frontend Components

**TeamMatchLineup.jsx:**
```jsx
// ❌ Endpoint không tồn tại:
await api.post(`/matches/${matchId}/submit-lineup`, { ... });

// ✅ Endpoint đúng (đã có):
await api.post(`/match-detail/${matchId}/lineups`, [
  // Array of lineup items
  { seasonTeamId, seasonPlayerId, isStarting, ... }
]);
```

**MatchLifecycleManager.jsx:**
```jsx
// Khi approve lineup:
const handleApproveLineup = async (matchId, teamType) => {
  // Gọi endpoint mới
  await api.post(`/matches/${matchId}/lineup-status`, {
    teamType,
    status: 'APPROVED'
  });
};
```

### 5. Migration Plan

**Thứ tự chạy:**

1. ✅ **Run 002_update_season_registrations_workflow.sql**
   - Không conflict, chạy trước để test

2. ❌ **KHÔNG chạy 003_match_lifecycle_workflow.sql** 
   - File cũ có conflict

3. ✅ **Run 003_match_lifecycle_integration_FIXED.sql**
   - File mới đã fix conflict

4. ✅ **Verify:**
   ```sql
   -- Check new columns
   SELECT TOP 1 * FROM matches;
   SELECT TOP 1 * FROM match_lineups;
   SELECT TOP 1 * FROM match_official_assignments;
   
   -- Check new tables
   SELECT COUNT(*) FROM supervisor_reports;
   SELECT COUNT(*) FROM match_lifecycle_history;
   
   -- Check status values
   SELECT DISTINCT status FROM matches;
   ```

## Files cần sửa

### Backend
- [ ] `backend/src/services/matchLifecycleService.ts` - Refactor assignOfficials, updateLineupStatus
- [ ] `backend/src/services/matchLineupService.ts` - Thêm approveLineup, rejectLineup
- [ ] `backend/src/controllers/matchLifecycleController.ts` - Cập nhật logic
- [ ] `backend/src/routes/matchLifecycleRoutes.ts` - Có thể cần adjust endpoints

### Frontend
- [ ] `src/apps/admin/components/TeamMatchLineup.jsx` - Fix submit endpoint
- [ ] `src/apps/admin/components/MatchLifecycleManager.jsx` - Verify endpoints

### Migration
- [x] `backend/src/db/migrations/003_match_lifecycle_integration_FIXED.sql` - ĐÃ TẠO
- [ ] Xóa hoặc rename file cũ: `003_match_lifecycle_workflow.sql`

## Ước tính thời gian

- Refactor services: 2-3 giờ
- Fix controllers: 1 giờ
- Fix frontend: 1 giờ
- Testing: 1-2 giờ
- **Tổng: 5-7 giờ**

## Prioritization

### HIGH PRIORITY (Làm ngay)
1. ✅ Fix migration file (done)
2. ⚠️ Refactor `matchLifecycleService.ts`
3. ⚠️ Extend `matchLineupService.ts`

### MEDIUM PRIORITY (Sau khi test basic flow)
4. Fix controllers
5. Fix frontend endpoints

### LOW PRIORITY (Nice to have)
6. Optimize queries
7. Add more validation
8. Error handling improvements

## Testing Checklist

### Unit Tests
- [ ] matchLifecycleService.changeMatchStatus()
- [ ] matchLifecycleService.assignOfficials() - now uses matchOfficialService
- [ ] matchLineupService.approveLineup()
- [ ] matchLineupService.rejectLineup()

### Integration Tests
- [ ] SCHEDULED → assign officials → PREPARING
- [ ] PREPARING → approve both lineups → READY
- [ ] FINISHED → submit reports → REPORTED
- [ ] REPORTED → admin confirms → COMPLETED

### Database Tests
- [ ] Migration runs without errors
- [ ] No duplicate tables created
- [ ] Foreign keys work correctly
- [ ] Indexes created properly

## Next Steps

**Bước 1:** Bạn confirm approach này OK?

**Bước 2:** Tôi sẽ refactor files theo thứ tự:
1. `matchLifecycleService.ts` (core logic)
2. `matchLineupService.ts` (extend)
3. `matchLifecycleController.ts` (endpoints)
4. Frontend components

**Bước 3:** Test & deploy

---

**Status:** 🟡 Đang chờ confirmation  
**Estimate:** 5-7 hours work  
**Risk:** 🟢 Low (vì chưa chạy migration, dễ rollback)
