# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Code Quality
- [ ] All tests pass (`npm run test:all`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] No console errors or warnings
- [ ] Code reviewed and approved

### Database
- [ ] Migrations tested on staging/preview
- [ ] Migration rollback plan documented
- [ ] Database backup created (for major changes)
- [ ] Migration SQL reviewed
- [ ] No breaking schema changes without migration path

### Environment Variables
- [ ] All required env vars set in Vercel (Production)
- [ ] Sensitive vars encrypted
- [ ] Preview env vars tested
- [ ] No hardcoded values

### Testing
- [ ] Preview deployment tested
- [ ] Critical user flows tested
- [ ] API endpoints tested
- [ ] Database connections verified
- [ ] Error handling tested

### Documentation
- [ ] CHANGELOG.md updated
- [ ] Breaking changes documented
- [ ] Migration steps documented
- [ ] Rollback steps documented

## Deployment

### Git
- [ ] All changes committed
- [ ] Branch merged to `main`
- [ ] Git tags created (if version bump)

### Vercel
- [ ] Deployment triggered (automatic on push)
- [ ] Build logs reviewed
- [ ] Deployment successful
- [ ] Health check passes (`/api/health`)

### Post-Deployment

### Verification
- [ ] Production site loads correctly
- [ ] Critical features work
- [ ] Database migrations applied
- [ ] No errors in Vercel logs
- [ ] Performance metrics normal

### Monitoring
- [ ] Vercel logs checked
- [ ] Error tracking checked (if using Sentry)
- [ ] Database performance normal
- [ ] API response times normal

### Communication
- [ ] Team notified of deployment
- [ ] Users notified (if breaking changes)
- [ ] Status page updated (if applicable)

## Rollback Plan

If issues occur:

1. [ ] Identify issue severity
2. [ ] Check Vercel logs for errors
3. [ ] Check Supabase logs for database issues
4. [ ] Rollback code if needed (Vercel Dashboard)
5. [ ] Rollback database if needed (run rollback SQL)
6. [ ] Notify team of rollback
7. [ ] Document issue and resolution

## Emergency Contacts

- **Vercel Support:** support.vercel.com
- **Supabase Support:** supabase.com/support
- **On-Call Engineer:** [Your contact]

---

**Last Updated:** January 2025
