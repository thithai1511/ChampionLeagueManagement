# Hệ Thống Quản Lý Giải Bóng Đá Việt Nam

Hệ thống quản lý Giải Bóng Đá Việt Nam - Full-stack application với Node.js + React

##  Documentation

- [Quick Start Guide](docs/QUICK_START.md)
- [I18N Guide](docs/I18N_GUIDE.md)
- [Awards & Discipline Implementation](docs/reports/AWARDS_DISCIPLINE_IMPLEMENTATION_REPORT.md)

##  Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
npm install
npm run dev
```

##  Project Structure

```
 backend/                # Backend API (Node.js + Express)
    src/               # Source code
       routes/        # API routes
       services/      # Business logic
       data/          # Migrations & seeds
       __tests__/     # Unit tests
    scripts/           # Utility scripts
        audit/         # Score audit scripts
        schema/        # Schema check scripts
        debug/         # Debug utilities
 src/                   # Frontend (React + Vite)
    apps/             # Multi-app structure (admin, public)
    components/       # Shared components
    i18n/            # Internationalization
 docs/                 # Documentation
    reports/         # Implementation reports
    archive/         # Old reports
 public/              # Static assets
```

##  Environment Variables

Copy .env.example to .env and configure:
- Database credentials
- JWT secret
- API keys

##  License

Private project - All rights reserved
