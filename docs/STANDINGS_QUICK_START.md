# Quick Start Guide - Standings & Statistics

## Tính năng đã implement

### 1. Bảng xếp hạng tự động
- ✅ Tự động cập nhật sau mỗi trận đấu kết thúc
- ✅ Xếp hạng theo: Điểm → Hiệu số → Bàn thắng → Đối đầu (cuối mùa)
- ✅ 2 modes: LIVE (trong mùa) và FINAL (cuối mùa)

### 2. Thống kê cầu thủ
- ✅ Vua phá lưới (Top Scorers)
- ✅ MVP - Cầu thủ xuất sắc (Player of the Match)
- ✅ Thẻ vàng/đỏ
- ✅ Danh sách treo giò

### 3. Kỷ luật tự động
- ✅ 2 thẻ vàng → treo giò 1 trận
- ✅ 1 thẻ đỏ → treo giò 1 trận
- ✅ Check cầu thủ bị treo giò khi chọn lineup

---

## Usage

### Frontend - Xem bảng xếp hạng

```
Navigate to: /standings
```

Các thành phần hiển thị:
- Bảng xếp hạng (sortable)
- Top 10 ghi bàn
- Top 10 MVP
- Thẻ phạt và treo giò

### Backend APIs

#### Public APIs (không cần auth):

```javascript
// Get standings
GET /api/public/standings/season/:seasonId?mode=live

// Get top scorers
GET /api/public/standings/season/:seasonId/top-scorers?limit=10

// Get MVP
GET /api/public/standings/season/:seasonId/top-mvp

// Get discipline overview
GET /api/public/standings/season/:seasonId/discipline
```

#### Admin APIs (cần auth):

```javascript
// Recalculate standings
POST /api/admin/standings/season/:seasonId/calculate

// Recalculate discipline
POST /api/disciplinary/season/:seasonId/recalculate
```

---

## Workflow

### Khi nhập kết quả trận đấu:

1. Admin nhập tỷ số và các events (goals, cards, MVP)
2. Xác nhận kết quả → Match status = COMPLETED
3. **Tự động xử lý**:
   - ✅ Cập nhật điểm đội (3/1/0)
   - ✅ Cập nhật số trận, thắng/hòa/thua
   - ✅ Cập nhật bàn thắng, hiệu số
   - ✅ Tạo treo giò (nếu đủ thẻ)
   - ✅ Recalculate rankings

### Check cầu thủ treo giò:

```javascript
GET /api/disciplinary/match/:matchId/player/:seasonPlayerId/check?seasonId=1

Response:
{
  "suspended": true,
  "reason": "Thẻ đỏ",
  "suspensionId": 123
}
```

---

## Quy tắc xếp hạng

### Trong mùa (LIVE mode):
1. **Điểm** (cao → thấp)
2. **Hiệu số** (cao → thấp)
3. **Bàn thắng ghi được** (cao → thấp)

✅ **Chấp nhận 2 đội cùng hạng**

### Cuối mùa (FINAL mode):
1. **Điểm** (cao → thấp)
2. **Hiệu số** (cao → thấp)
3. **Tổng tỷ số đối đầu 2 lượt** (nhiều → ít)
4. **Rút thăm** (nếu vẫn bằng)

✅ **Không chấp nhận cùng hạng** → phải phân định rõ

---

## Troubleshooting

### Standings không đúng?
```bash
POST /api/admin/standings/season/1/calculate
```

### Suspensions không đúng?
```bash
POST /api/disciplinary/season/1/recalculate
```

### Batch process toàn bộ mùa:
```typescript
import { batchProcessSeasonMatches } from './services/matchResultProcessingService';

await batchProcessSeasonMatches(seasonId);
```

---

## Files Created/Modified

### Backend:
- ✅ `services/matchResultProcessingService.ts` (NEW)
- ✅ `routes/disciplinaryRoutes.ts` (NEW)
- ✅ `routes/publicStandingsRoutes.ts` (NEW)
- ✅ `services/matchLifecycleService.ts` (UPDATED)
- ✅ `app.ts` (UPDATED - routes registered)

### Frontend:
- ✅ `components/PlayerStatsPanel.jsx` (NEW)
- ✅ `components/DisciplinePanel.jsx` (NEW)
- ✅ `pages/StandingsPage.jsx` (UPDATED)

### Documentation:
- ✅ `docs/STANDINGS_STATISTICS_IMPLEMENTATION.md`

---

## Next Steps

1. ✅ Backend implementation - DONE
2. ✅ Frontend components - DONE
3. ⏳ Test với data thật
4. ⏳ Deploy to production
5. ⏳ Monitor performance

---

## Support

For issues or questions:
1. Check logs: `[processMatchCompletion]` prefix
2. Verify DB tables: `season_team_statistics`, `player_suspensions`
3. Review API responses
4. Check frontend console for errors

**Happy Coding! ⚽️**
