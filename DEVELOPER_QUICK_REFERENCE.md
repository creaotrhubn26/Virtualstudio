# Quick Reference Guide - Production Manuscript System

## 🚀 Quick Start for Developers

### Understanding Auto-Save Flow

```
User Edits → 2-3 sec timer → Database save → Success indicator
                                    ↓
                            localStorage fallback (if offline)
```

### Key Components Added

| Component | Purpose | Location |
|-----------|---------|----------|
| errorHandler.ts | Error categorization utility | src/utils/ |
| CandidateMediaUpload | Photo/video upload component | src/components/ |
| Save Status Indicator | Visual save feedback | Toolbar & Header |
| Online/Offline Dot | Network status indicator | UI Elements |

### Common Tasks

#### Adding Auto-Save to a New Component
```typescript
const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  setSaveStatus('unsaved');
  
  autoSaveTimerRef.current = setTimeout(async () => {
    try {
      setSaveStatus('saving');
      await service.save(data);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
    }
  }, 2000);
  
  return () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
  };
}, [data]);
```

#### Handling Errors
```typescript
import { handleApiError, logError, formatErrorForUser } from '../utils/errorHandler';

try {
  await apiCall();
} catch (error) {
  const errorInfo = handleApiError(error, 'operation', isOnline);
  logError(errorInfo);
  showToast(formatErrorForUser(errorInfo), 'error');
}
```

#### Detecting Offline Status
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### API Endpoints Reference

#### Manuscript Operations
```
GET    /api/casting/manuscripts                      List all
GET    /api/casting/manuscripts/{id}                 Get one
POST   /api/casting/manuscripts                      Create
PUT    /api/casting/manuscripts/{id}                 Update
DELETE /api/casting/manuscripts/{id}                 Delete
```

#### Scene Operations
```
GET    /api/casting/manuscripts/{id}/scenes          List
POST   /api/casting/scenes                           Create/update
PUT    /api/casting/scenes/{id}                      Update
DELETE /api/casting/scenes/{id}                      Delete
```

#### Media Upload
```
POST   /api/casting/media/upload                     Upload file
```

### Save Status States

| State | Color | Meaning |
|-------|-------|---------|
| saved | 🟢 | Successfully saved to database |
| saving | 🔵 | Currently saving |
| unsaved | 🟡 | Has unsaved changes |
| error | 🔴 | Failed to save, retry needed |

### Error Codes

| Code | Type | Recovery |
|------|------|----------|
| OFFLINE | Network | Wait for connection |
| NETWORK_ERROR | Network | Retry when online |
| BAD_REQUEST | Data | Fix and retry |
| UNAUTHORIZED | Auth | Re-authenticate |
| FORBIDDEN | Auth | Check permissions |
| NOT_FOUND | Resource | Refresh view |
| CONFLICT | Sync | Resolve conflict |
| RATE_LIMITED | Rate | Wait and retry |
| SERVER_ERROR | Server | Retry later |
| PARSE_ERROR | Parse | Check data format |
| UNKNOWN | Unknown | Check logs |

### Performance Tips

1. **Use debouncing for frequent updates** (already done for auto-save)
2. **Batch multiple saves together** (scene/act auto-save batches)
3. **Load data on demand** (don't load all dialogue at once)
4. **Use localStorage for offline** (automatic fallback)
5. **Monitor API performance** (check response times)

### Common Patterns

#### Try-Catch with Fallback
```typescript
const data = await fetch(url)
  .then(r => r.json())
  .catch(() => localStorage.getItem(key));
```

#### Async Effect with Cleanup
```typescript
useEffect(() => {
  let isMounted = true;
  
  const load = async () => {
    const data = await fetch(url);
    if (isMounted) setState(data);
  };
  
  load();
  
  return () => {
    isMounted = false;
  };
}, []);
```

#### Offline Detection
```typescript
if (!navigator.onLine) {
  // Use localStorage
} else {
  // Use API
}
```

### Testing Checklist

- [ ] Auto-save triggers after inactivity
- [ ] Save status indicator shows correct state
- [ ] Offline detection works
- [ ] Error handling catches exceptions
- [ ] localStorage fallback works
- [ ] Media upload validates files
- [ ] Online/offline sync works

### Debugging Tips

1. **Check save status indicator** - Shows what's happening
2. **Open browser console** - See auto-save logs
3. **Open DevTools Network tab** - Monitor API calls
4. **Check localStorage** - See fallback data
5. **Test offline** - DevTools → Network → Offline

### Common Issues & Solutions

**Save not working?**
1. Check console for errors
2. Verify API endpoint is correct
3. Check network tab for failed requests
4. Verify data format is correct
5. Check localStorage as fallback

**Offline mode not working?**
1. Check `navigator.onLine` in console
2. Verify localStorage is enabled
3. Check that error was caught correctly
4. Verify fallback mechanism

**Status indicator not updating?**
1. Check that `setSaveStatus` is called
2. Verify save effect dependencies
3. Check timer is clearing correctly
4. Look for state mutation issues

### Performance Metrics

- Auto-save delay: 2-3 seconds (configurable)
- Max file size: 50 MB (enforced)
- API timeout: 30 seconds (default)
- localStorage limit: 5-10 MB (browser dependent)
- Max batched saves: 50 items (can adjust)

### Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE 11 (not supported)

### Resources

- [Error Handler Documentation](./src/utils/errorHandler.ts)
- [Media Upload Component](./src/components/CandidateMediaUpload.tsx)
- [Implementation Details](./IMPLEMENTATION_SUMMARY.md)
- [Feature Documentation](./IMPLEMENTATION_COMPLETE_FEATURES.md)

### Key Files Modified

1. `src/components/ScreenplayEditor.tsx` - Auto-save & indicators
2. `src/components/ManuscriptPanel.tsx` - Manuscript auto-save
3. `src/components/CallSheetGenerator.tsx` - Error handling
4. `src/utils/errorHandler.ts` - Error utilities (NEW)
5. `src/components/CandidateMediaUpload.tsx` - Media upload (NEW)
6. `src/components/index.ts` - Export updates

---

**Last Updated:** January 14, 2026  
**Status:** Production Ready ✅
