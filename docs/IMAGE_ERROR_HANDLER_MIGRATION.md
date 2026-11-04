# Image Error Handler Migration Guide

## Overview
All image error handling utilities have been consolidated into a single, unified module: `/utils/imageErrorHandler.ts`

## What Changed

### Before (Multiple Files)
- `/utils/imageErrorSuppression.ts` - Complex version with multiple methods
- `/utils/simpleImageSuppression.ts` - Simpler version
- `/utils/immediateImageSuppression.ts` - Immediate suppression version

### After (Single File)
- `/utils/imageErrorHandler.ts` - Unified, efficient implementation

## Migration Steps

### 1. Update Imports

**Old:**
```typescript
import { setupImageErrorSuppression } from './utils/simpleImageSuppression';
import './utils/immediateImageSuppression';
```

**New:**
```typescript
import './utils/imageErrorHandler';
// That's it! Auto-initializes on import
```

### 2. Update Component Usage

**Old (in ImageWithFallback):**
```typescript
const isExternalImage = src && (
  src.includes('unsplash.com') ||
  src.includes('pexels.com') ||
  // ... manual checks
);
```

**New:**
```typescript
import { isExternalImageSource } from '../../utils/imageErrorHandler';

// Use centralized detection
if (isExternalImageSource(src)) {
  // Handle external image
}
```

## Available Functions

### Auto-Initialization
```typescript
import './utils/imageErrorHandler';
// Automatically sets up global error suppression
```

### Manual Functions
```typescript
import { 
  isExternalImageSource,
  suppressImageError,
  suppressAllImageErrors,
  createSafeImage,
  configureImageErrorHandler,
  setupAdvancedSuppression
} from './utils/imageErrorHandler';

// Check if an image URL is external
if (isExternalImageSource('https://images.unsplash.com/photo.jpg')) {
  // It's external
}

// Suppress errors on a specific image
const img = document.querySelector('img');
suppressImageError(img);

// Suppress errors on all images in document
suppressAllImageErrors();

// Create an image with built-in error handling
const safeImg = createSafeImage('https://example.com/image.jpg', 'Alt text');

// Configure behavior
configureImageErrorHandler({
  logLevel: 'none', // 'none' | 'errors' | 'debug'
  suppressExternalErrors: true
});

// Enable advanced features (MutationObserver)
setupAdvancedSuppression();
```

## Debugging

The utility provides global debugging tools:

```javascript
// In browser console
window.imageErrorHandler.isExternalImageSource('https://images.unsplash.com/photo.jpg')
// Returns: true

window.imageErrorHandler.getConfig()
// Returns: { externalDomains: [...], logLevel: 'errors', ... }

window.imageErrorHandler.suppressAllImageErrors()
// Applies error suppression to all current images
```

## Benefits of Consolidation

1. **Single Source of Truth**: One place to manage all image error logic
2. **Better Performance**: No duplicate handlers or overlapping logic
3. **Easier Maintenance**: Update in one place instead of three
4. **Consistent Behavior**: Same error handling across entire app
5. **Smaller Bundle**: Eliminated redundant code
6. **Better Debugging**: Centralized logging and configuration

## Configuration Options

```typescript
const CONFIG = {
  // External domains to suppress errors for
  externalDomains: [
    'unsplash.com',
    'pexels.com',
    'pixabay.com',
    'ui-avatars.io',
    // ... add more as needed
  ],
  
  // Logging level
  logLevel: 'errors', // 'none' | 'errors' | 'debug'
  
  // Whether to suppress all external image errors
  suppressExternalErrors: true,
};
```

## Files That Were Updated

1. ✅ `/main.tsx` - Now imports only `imageErrorHandler`
2. ✅ `/components/figma/ImageWithFallback.tsx` - Uses `isExternalImageSource()`
3. ✅ All old utilities can now be safely deleted

## Files to Delete (After Verification)

Once you've verified everything works:
- ❌ `/utils/imageErrorSuppression.ts` (old complex version)
- ❌ `/utils/simpleImageSuppression.ts` (old simple version)
- ❌ `/utils/immediateImageSuppression.ts` (old immediate version)

## Testing Checklist

- [ ] App loads without image errors in console
- [ ] External images (Unsplash, etc.) fail gracefully
- [ ] Internal image errors are logged properly
- [ ] ImageWithFallback component works correctly
- [ ] No duplicate error suppression
- [ ] Console shows only one initialization message

## Rollback Plan

If issues arise, revert to old setup:

1. Restore old files from git
2. Update `main.tsx`:
   ```typescript
   import './utils/immediateImageSuppression';
   import { setupImageErrorSuppression } from './utils/simpleImageSuppression';
   setupImageErrorSuppression();
   ```
3. Revert `ImageWithFallback.tsx` to use inline checks

## Questions?

The new unified handler is designed to be a drop-in replacement with enhanced features. All previous functionality is preserved and improved.
