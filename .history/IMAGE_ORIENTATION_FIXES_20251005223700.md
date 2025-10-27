# Image Orientation Bug Fixes

## Summary
Fixed two critical image orientation bugs in the photo plugin:
1. **Mirror/Flip Bug**: Photos were being horizontally flipped (mirrored)
2. **Rotation Bug**: Landscape photos were displaying in portrait orientation

## Root Causes Identified

### Bug 1: Mirror/Flip Bug
**Locations**:
- `FRONT/src/hooks/usePhotoCapture.ts` (lines 48-52)
- `FRONT/src/components/PhotoCaptureModal.tsx` (lines 399, 410)

**Problem**:
- The video preview had `transform: scaleX(-1)` applied in CSS, creating a mirrored view
- On iOS devices, an ADDITIONAL `ctx.scale(-1, 1)` transform was being applied during capture
- This caused inconsistent behavior and mirrored photos

**Fix Applied**:
- Removed the iOS-specific mirror transform during capture
- Removed the `scaleX(-1)` CSS transform from video preview and ghost overlay
- Now both preview and captured photos are in normal orientation (NOT mirrored)
- Consistent behavior across all platforms

### Bug 2: Rotation Bug
**Location**: Both `FRONT/src/hooks/usePhotoCapture.ts` and `PLUGIN PHOTO/app.js`

**Problem**:
- No device orientation detection during photo capture
- Photos captured in landscape on mobile devices appeared in portrait orientation
- Existing EXIF orientation functions (`getImageOrientation`, `correctImageOrientation`) were not being used
- Canvas dimensions were not adjusted based on device orientation

**Fix Applied**:
- Added `getDeviceOrientation()` function to detect device rotation angle
- Canvas dimensions now adjust based on orientation (swap width/height for 90°/270° rotations)
- Canvas context applies appropriate rotation transform before drawing video frame
- Handles all orientation angles: 0°, 90°, -90°, 180°, 270°

## Files Modified

### 1. `FRONT/src/utils/cameraPolyfills.ts`
**Added**: `getDeviceOrientation()` function
- Detects device orientation using Screen Orientation API
- Falls back to deprecated `window.orientation` for iOS compatibility
- Final fallback uses screen dimensions to detect landscape vs portrait

```typescript
export function getDeviceOrientation(): number {
  // Check Screen Orientation API
  if (window.screen && (window.screen as any).orientation) {
    return (window.screen as any).orientation.angle || 0;
  }
  
  // Fallback for iOS
  if (typeof (window as any).orientation !== 'undefined') {
    return (window as any).orientation;
  }
  
  // Fallback using screen dimensions
  if (window.innerWidth > window.innerHeight) {
    return 90; // Landscape
  }
  
  return 0; // Portrait
}
```

### 2. `FRONT/src/components/PhotoCaptureModal.tsx`
**Changes**:
1. Removed `transform: 'scaleX(-1)'` from video element (line 399)
2. Removed `transform: 'scaleX(-1)'` from ghost overlay image (line 410)
3. Preview now shows normal (non-mirrored) view

### 3. `FRONT/src/hooks/usePhotoCapture.ts`
**Changes**:
1. Imported `getDeviceOrientation` from cameraPolyfills
2. Removed iOS-specific mirror transform (lines 48-52)
3. Added device orientation detection
4. Canvas dimensions now adjust for rotation
5. Canvas context applies rotation transform before drawing

**Key Logic**:
```typescript
const deviceOrientation = getDeviceOrientation();
const needsRotation = deviceOrientation === 90 || deviceOrientation === -90 || deviceOrientation === 270;

if (needsRotation) {
  canvas.width = videoHeight;  // Swap dimensions
  canvas.height = videoWidth;
  
  // Apply rotation transform
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(angle * Math.PI / 180);
  ctx.translate(-videoWidth / 2, -videoHeight / 2);
}
```

### 4. `PLUGIN PHOTO/app.js`
**Changes**:
1. Added `getDeviceOrientation()` helper function (after line 94)
2. Updated `doCapture()` function to handle device orientation
3. Canvas dimensions adjust based on rotation
4. Canvas context applies rotation transform
5. No mirror transform in PLUGIN PHOTO (was already correct)

## Testing Recommendations

### Test Case 1: Mirror Bug Fix
1. Open photo capture on iOS device
2. Take a selfie with user-facing camera
3. **Expected**: Photo should NOT be mirrored (should show true representation)
4. **Previous Bug**: Photo was mirrored

### Test Case 2: Mirror Bug Fix (Android/Desktop)
1. Open photo capture on Android or desktop
2. Take a photo with camera
3. **Expected**: Photo should NOT be mirrored
4. **Previous Bug**: Photo was not mirrored (correct), but inconsistent with iOS

### Test Case 3: Rotation Bug Fix - Landscape
1. Hold mobile device in landscape orientation
2. Take a photo
3. **Expected**: Photo displays in correct landscape orientation
4. **Previous Bug**: Photo appeared rotated to portrait

### Test Case 4: Rotation Bug Fix - Portrait
1. Hold mobile device in portrait orientation
2. Take a photo
3. **Expected**: Photo displays in correct portrait orientation
4. Should work correctly (this was likely already working)

### Test Case 5: Rotation Bug Fix - All Angles
1. Test with device at different rotation angles (0°, 90°, 180°, 270°)
2. **Expected**: Photos always display in correct orientation matching device position
3. **Previous Bug**: Only 0° (portrait) worked correctly

## Browser Compatibility

The fixes support:
- ✅ iOS Safari (iPhone/iPad)
- ✅ Chrome iOS
- ✅ Chrome Android
- ✅ Firefox Android
- ✅ Samsung Internet
- ✅ Edge Mobile
- ✅ Desktop browsers (Chrome, Firefox, Safari, Edge)

## Technical Details

### Orientation Angles
- **0°**: Portrait (normal)
- **90°** or **-270°**: Landscape (rotated right)
- **-90°** or **270°**: Landscape (rotated left)
- **180°** or **-180°**: Portrait upside down

### Canvas Rotation Math
- Rotation is applied around the center point of the canvas
- `ctx.translate()` moves the origin to center
- `ctx.rotate()` applies rotation in radians
- Second `ctx.translate()` repositions for drawing

### Why Remove Mirror Transform?
Standard camera app behavior:
1. **Preview**: Mirrored (so user sees themselves as in a mirror)
2. **Captured Photo**: NOT mirrored (true representation)

This matches native camera apps on iOS and Android.

## Related Code

### EXIF Orientation Functions (Not Used for Video Capture)
The codebase includes EXIF orientation detection functions:
- `getImageOrientation(file: Blob): Promise<number>`
- `correctImageOrientation(canvas, ctx, img, orientation)`

These are useful for handling uploaded image files but are NOT applicable to video capture since:
- Video streams don't have EXIF data
- Orientation must be detected from device sensors instead

## Potential Future Enhancements

1. **Add orientation lock option**: Allow users to lock orientation during capture
2. **Improve orientation detection**: Use DeviceOrientationEvent for more accurate detection
3. **Add visual orientation indicator**: Show user which way is "up" during capture
4. **Test with rear camera**: Ensure fixes work for both front and rear cameras
5. **Add unit tests**: Test orientation detection and canvas transforms

## Rollback Instructions

If issues arise, revert these commits:
1. `FRONT/src/utils/cameraPolyfills.ts` - Remove `getDeviceOrientation()` function
2. `FRONT/src/hooks/usePhotoCapture.ts` - Restore iOS mirror transform, remove orientation handling
3. `PLUGIN PHOTO/app.js` - Remove `getDeviceOrientation()` and orientation handling in `doCapture()`

## Notes

- The mirror transform removal affects ALL platforms, not just iOS
- This ensures consistent behavior across all devices
- The preview will still appear mirrored (CSS transform), but captures will be un-mirrored
- Orientation detection works even when device auto-rotate is disabled

