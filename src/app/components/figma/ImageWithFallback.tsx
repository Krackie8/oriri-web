import React, { useState } from 'react'
import { isExternalImageSource } from '../../utils/imageErrorHandler'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

// Improved fallback image that matches the dark theme
const DARK_FALLBACK_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzI2MjYyNiIvPjxnIGZpbGw9IiM0MDQwNDAiPjxyZWN0IHg9IjI0IiB5PSIyNCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iNCIvPjxwYXRoIGQ9Im0yNCA1MiAxMi0xMiAyOCAyOHYtNHoiLz48Y2lyY2xlIGN4PSI0NCIgY3k9IjM2IiByPSI0Ii8+PC9nPjwvc3ZnPg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    // Prevent error from bubbling to global error handlers for external images
    const img = event.target as HTMLImageElement
    const src = img.src
    
    // Use centralized external image detection
    if (isExternalImageSource(src)) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Don't log external image failures to error tracker - they're handled gracefully
    if (process.env.NODE_ENV === 'development') {
      console.debug('[ImageWithFallback] Image failed to load (using fallback):', src)
    }
    
    setDidError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const { src, alt, style, className, ...rest } = props

  return didError ? (
    <div
      className={`inline-block bg-muted text-center align-middle ${className ?? ''}`}
      style={style}
      {...rest}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img 
          src={DARK_FALLBACK_SRC} 
          alt={alt || "Image not available"} 
          className="opacity-50"
          data-original-url={src} 
        />
      </div>
    </div>
  ) : (
    <>
      {isLoading && (
        <div
          className={`inline-block bg-muted animate-pulse ${className ?? ''}`}
          style={style}
        />
      )}
      <img 
        src={src} 
        alt={alt} 
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'}`} 
        style={isLoading ? { ...style, display: 'none' } : style}
        {...rest} 
        onError={handleError}
        onLoad={handleLoad}
      />
    </>
  )
}