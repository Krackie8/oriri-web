import React, { useState } from 'react';
import { ImageSource } from '../../utils/imageUtils';

interface EnhancedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageSource?: ImageSource;
  fallbackSrc?: string;
  enablePlaceholder?: boolean;
  suppressErrors?: boolean; // New prop to suppress error reporting
}

export function EnhancedImage({ 
  imageSource, 
  fallbackSrc, 
  enablePlaceholder = true,
  suppressErrors = true, // Default to true for external images
  className,
  style,
  ...props 
}: EnhancedImageProps) {
  const [currentSrc, setCurrentSrc] = useState(imageSource?.primary || props.src);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    // Prevent the error from bubbling up to global error handlers
    if (suppressErrors) {
      event.preventDefault();
      event.stopPropagation();
    }

    const img = event.target as HTMLImageElement;
    const src = img.src;

    // Only log for internal images or in development
    const isInternalImage = src.startsWith(window.location.origin) || src.startsWith('/');
    if (isInternalImage || process.env.NODE_ENV === 'development') {
      console.debug('[EnhancedImage] Image failed to load:', src);
    }

    if (currentSrc === imageSource?.primary) {
      // Try fallback from imageSource first
      if (imageSource?.fallback) {
        setCurrentSrc(imageSource.fallback);
        return;
      }
    }
    
    if (currentSrc !== fallbackSrc && fallbackSrc) {
      // Try provided fallback
      setCurrentSrc(fallbackSrc);
      return;
    }
    
    // All fallbacks failed
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Show placeholder while loading
  if (isLoading && enablePlaceholder && imageSource?.placeholder) {
    return (
      <div className="relative">
        <img
          {...props}
          src={imageSource.placeholder}
          className={`${className} opacity-50`}
          style={style}
          alt="Loading..."
        />
        <img
          {...props}
          src={currentSrc}
          className={`${className} absolute inset-0 opacity-0`}
          style={style}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    );
  }

  // Show error state if all sources failed
  if (hasError) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${className}`}
        style={style}
      >
        <div className="text-muted-foreground text-center p-2">
          <div className="text-2xl mb-1">📷</div>
          <div className="text-xs">Image unavailable</div>
        </div>
      </div>
    );
  }

  // Show the actual image
  return (
    <img
      {...props}
      src={currentSrc}
      className={className}
      style={style}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}