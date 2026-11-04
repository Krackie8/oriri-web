// Image utilities for handling fallbacks and placeholders

export interface ImageSource {
  primary: string;
  fallback: string;
  placeholder: string;
}

// Generate colored gradient placeholders for different content types
export function generatePlaceholder(
  width: number, 
  height: number, 
  type: 'tech' | 'wellness' | 'business' | 'creative' | 'default' = 'default'
): string {
  const colors = {
    tech: { primary: '#3B82F6', secondary: '#1E40AF' }, // Blue
    wellness: { primary: '#10B981', secondary: '#059669' }, // Green
    business: { primary: '#F59E0B', secondary: '#D97706' }, // Orange
    creative: { primary: '#8B5CF6', secondary: '#7C3AED' }, // Purple
    default: { primary: '#6B7280', secondary: '#4B5563' } // Gray
  };

  const color = colors[type];
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color.secondary};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <g fill="white" opacity="0.3">
        <circle cx="${width/2}" cy="${height/2 - 10}" r="15"/>
        <rect x="${width/2 - 20}" y="${height/2 + 10}" width="40" height="4" rx="2"/>
        <rect x="${width/2 - 15}" y="${height/2 + 18}" width="30" height="3" rx="1.5"/>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Create image sources with fallbacks
export function createImageSource(
  primaryUrl: string,
  type: 'tech' | 'wellness' | 'business' | 'creative' | 'default' = 'default',
  dimensions: { width: number; height: number } = { width: 300, height: 200 }
): ImageSource {
  return {
    primary: primaryUrl,
    fallback: generatePlaceholder(dimensions.width, dimensions.height, type),
    placeholder: generatePlaceholder(dimensions.width, dimensions.height, 'default')
  };
}

// Common fallback images for different podcast categories
export const fallbackImages = {
  tech: generatePlaceholder(300, 200, 'tech'),
  wellness: generatePlaceholder(300, 200, 'wellness'),
  business: generatePlaceholder(300, 200, 'business'),
  creative: generatePlaceholder(300, 200, 'creative'),
  default: generatePlaceholder(300, 200, 'default')
};

// Episode-specific image sources with proper fallbacks
export const episodeImages = {
  '1': createImageSource(
    'https://images.unsplash.com/photo-1544719576-904e2d01e057?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwcG9kY2FzdCUyMG1pY3JvcGhvbmV8ZW58MXx8fHwxNzU3Mzk5MzQ2fDA&ixlib=rb-4.1.0&q=80&w=300&utm_source=figma&utm_medium=referral',
    'tech',
    { width: 300, height: 200 }
  ),
  '2': createImageSource(
    'https://images.unsplash.com/photo-1665950865910-733277270459?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpdGF0aW9uJTIwd2VsbG5lc3MlMjBtb3JuaW5nfGVufDF8fHx8MTc1NzM5OTM1Mnww&ixlib=rb-4.1.0&q=80&w=300&utm_source=figma&utm_medium=referral',
    'wellness',
    { width: 300, height: 200 }
  ),
  '3': createImageSource(
    'https://images.unsplash.com/photo-1650444684006-a10f2c99bf27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwYnVzaW5lc3MlMjBlbnRyZXByZW5ldXJ8ZW58MXx8fHwxNzU3Mzk5MzU1fDA&ixlib=rb-4.1.0&q=80&w=300&utm_source=figma&utm_medium=referral',
    'business',
    { width: 300, height: 200 }
  ),
  '4': createImageSource(
    'https://images.unsplash.com/photo-1544719576-904e2d01e057?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwcG9kY2FzdCUyMG1pY3JvcGhvbmV8ZW58MXx8fHwxNzU3Mzk5MzQ2fDA&ixlib=rb-4.1.0&q=80&w=120&utm_source=figma&utm_medium=referral',
    'tech',
    { width: 120, height: 120 }
  ),
  '5': createImageSource(
    'https://images.unsplash.com/photo-1752649937457-af0349fc2161?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMGFydHMlMjBzdHVkaW98ZW58MXx8fHwxNzU3MzM4NDQ2fDA&ixlib=rb-4.1.0&q=80&w=120&utm_source=figma&utm_medium=referral',
    'creative',
    { width: 120, height: 120 }
  ),
  '6': createImageSource(
    'https://images.unsplash.com/photo-1544719576-904e2d01e057?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwcG9kY2FzdCUyMG1pY3JvcGhvbmV8ZW58MXx8fHwxNzU3Mzk5MzQ2fDA&ixlib=rb-4.1.0&q=80&w=160&utm_source=figma&utm_medium=referral',
    'tech',
    { width: 160, height: 160 }
  ),
  '7': createImageSource(
    'https://images.unsplash.com/photo-1665950865910-733277270459?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpdGF0aW9uJTIwd2VsbG5lc3MlMjBtb3JuaW5nfGVufDF8fHx8MTc1NzM5OTM1Mnww&ixlib=rb-4.1.0&q=80&w=160&utm_source=figma&utm_medium=referral',
    'wellness',
    { width: 160, height: 160 }
  ),
  '8': createImageSource(
    'https://images.unsplash.com/photo-1650444684006-a10f2c99bf27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwYnVzaW5lc3MlMjBlbnRyZXByZW5ldXJ8ZW58MXx8fHwxNzU3Mzk5MzU1fDA&ixlib=rb-4.1.0&q=80&w=160&utm_source=figma&utm_medium=referral',
    'business',
    { width: 160, height: 160 }
  ),
  '9': createImageSource(
    'https://images.unsplash.com/photo-1752649937457-af0349fc2161?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMGFydHMlMjBzdHVkaW98ZW58MXx8fHwxNzU3MzM4NDQ2fDA&ixlib=rb-4.1.0&q=80&w=160&utm_source=figma&utm_medium=referral',
    'creative',
    { width: 160, height: 160 }
  )
};

// Enhanced ImageWithFallback props
export interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  placeholderSrc?: string;
}

// Utility to get image with fallback based on episode ID
export function getEpisodeImage(episodeId: string): ImageSource {
  return episodeImages[episodeId as keyof typeof episodeImages] || {
    primary: fallbackImages.default,
    fallback: fallbackImages.default,
    placeholder: fallbackImages.default
  };
}