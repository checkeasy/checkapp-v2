# Fix: Checkout Page Reload Redirect Issue

## Problem Description

When reloading/refreshing the page while on the checkout page with URL:
```
http://localhost:8080/checkout?parcours=1760360648359x974385425027432400&checkid=check_1760366113206_rafzy6vug
```

**Expected Behavior:**
- The page should remain on the checkout page
- User's progress in the "ménage" (cleaning) workflow should be preserved

**Actual Behavior:**
- User was redirected to `/checkin-home` instead of staying on `/checkout`
- This forced the user to restart the entire workflow from the beginning
- URL parameters were preserved, but the route changed

## Root Cause

The issue was in `FRONT/src/components/RouteRestoration.tsx` at lines 200-212.

When the page reloaded:
1. If authentication was slow, `ProtectedRoute` would redirect to `/welcome` with URL params
2. `RouteRestoration` would then attempt to restore the correct route
3. **BUG**: When `savedPath` was missing or was `/welcome`, the code hardcoded a redirect to `/checkin-home` regardless of the session's `flowType`

```typescript
// ❌ BEFORE (BUGGY CODE):
if (!finalPath || finalPath === '/welcome') {
  if (sessionValidated) {
    finalPath = '/checkin-home'; // ❌ Hardcoded, ignores session flowType
    console.log('🎯 RouteRestoration: savedPath était /welcome, redirection intelligente vers:', finalPath);
  } else {
    finalPath = '/checkin-home'; // ❌ Hardcoded
    console.log('🎯 RouteRestoration: Pas de session, redirection par défaut vers:', finalPath);
  }
}
```

This meant that:
- Checkout sessions (flowType: 'checkout') were incorrectly redirected to `/checkin-home`
- The correct behavior should use `navigationStateManager.getCorrectRouteForSession(session)` to determine the appropriate route based on the session's flowType and status

## Solution

### Changes Made

**File: `FRONT/src/components/RouteRestoration.tsx`**

1. **Store the validated session** to avoid fetching it twice (line 142):
   ```typescript
   let validatedSession = null; // 🆕 Stocker la session pour éviter de la récupérer deux fois
   ```

2. **Use NavigationStateManager to determine correct route** (lines 200-219):
   ```typescript
   // ✅ AFTER (FIXED CODE):
   if (!finalPath || finalPath === '/welcome') {
     if (sessionValidated && validatedSession) {
       // 🆕 FIX: Utiliser NavigationStateManager pour déterminer la route correcte
       finalPath = navigationStateManager.getCorrectRouteForSession(validatedSession);
       console.log('🎯 RouteRestoration: savedPath était /welcome, redirection intelligente basée sur session:', {
         flowType: validatedSession.flowType,
         status: validatedSession.status,
         finalPath
       });
     } else {
       // Si pas de session valide, aller vers checkin-home par défaut
       finalPath = '/checkin-home';
       console.log('🎯 RouteRestoration: Pas de session, redirection par défaut vers:', finalPath);
     }
   }
   ```

### How It Works Now

The `navigationStateManager.getCorrectRouteForSession()` method correctly determines the route based on:

- **Session status**: `active`, `completed`, `terminated`
- **Flow type**: `checkin` or `checkout`
- **Progress state**: whether état initial is completed, exit questions are completed, etc.

For a checkout session (ménage workflow):
- If état initial not completed → `/etat-initial`
- If exit questions completed → `/checkout-home`
- If all tasks completed → `/exit-questions`
- Otherwise → `/checkout` ✅

This ensures that checkout sessions are never incorrectly redirected to `/checkin-home`.

## Testing

To verify the fix:

1. **Start a checkout/ménage workflow**:
   - Navigate to a parcours with `takePicture: 'checkOutOnly'` or `'checkInAndCheckOut'`
   - Start the checkout process
   - Navigate to `/checkout` page

2. **Reload the page**:
   - Press F5 or Ctrl+R to reload
   - Verify you stay on `/checkout` (or the correct page based on your progress)
   - Verify you do NOT get redirected to `/checkin-home`

3. **Check console logs**:
   - Look for: `🎯 RouteRestoration: savedPath était /welcome, redirection intelligente basée sur session:`
   - Verify `flowType: 'checkout'` and `finalPath: '/checkout'` (or appropriate route)

## Related Files

- `FRONT/src/components/RouteRestoration.tsx` - Main fix location
- `FRONT/src/services/navigationStateManager.ts` - Route determination logic
- `FRONT/src/components/ProtectedRoute.tsx` - Authentication redirect logic
- `FRONT/src/services/urlPersistenceService.ts` - URL parameter persistence

## Impact

- ✅ Checkout sessions now correctly restore to `/checkout` on page reload
- ✅ Checkin sessions continue to restore to `/checkin` or `/checkin-home` as appropriate
- ✅ No breaking changes to existing functionality
- ✅ Better use of existing `navigationStateManager` infrastructure
- ✅ Reduced code duplication (session fetched only once)

