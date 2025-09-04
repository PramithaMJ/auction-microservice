import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import tw from 'twin.macro';

// Styled components
const ImageContainer = styled.div`${tw`
  relative
  w-full
  h-full
  overflow-hidden
`}`;

const StyledImage = styled.img`${tw`
  w-full
  h-full
  object-cover
  transition-all
  duration-300
`}`;

const ImagePlaceholder = styled.div`${tw`
  absolute
  top-0
  left-0
  w-full
  h-full
  bg-gradient-to-br
  from-yellow-100
  to-orange-100
  flex
  items-center
  justify-center
`}`;

const BlurredBackground = styled.div`${tw`
  absolute
  top-0
  left-0
  w-full
  h-full
  bg-center
  bg-cover
  filter
  blur-md
  transform
  scale-105
  opacity-70
  transition-opacity
  duration-300
`}`;

const LoadingSpinner = styled.div`${tw`
  w-10
  h-10
  border-4
  border-yellow-200
  border-t-yellow-600
  rounded-full
  animate-spin
`}`;

const FallbackIcon = styled.div`${tw`
  text-6xl
  opacity-80
`}`;

interface OptimizedImageProps {
  src: string;
  alt: string;
  fallbackIcon: React.ReactNode;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({ 
  src, 
  alt, 
  fallbackIcon,
  className = '',
  onLoad,
  onError
}) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [placeholderLoaded, setPlaceholderLoaded] = useState(false);
  
  // Validate image URL format and handle special cases
  const isValidImageUrl = src && 
                         typeof src === 'string' && 
                         src.startsWith('http') && 
                         src !== 'PROCESSING';
  
  // Handle the special "PROCESSING" state
  const isProcessing = src === 'PROCESSING';
  
  // Function to generate a smaller placeholder URL
  const getPlaceholderUrl = (url: string): string => {
    // Add quality and size parameters to URL if it's an S3 URL
    if (url.includes('amazonaws.com')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}quality=10&size=50`;
    }
    return url;
  };

  useEffect(() => {
    // Handle special "PROCESSING" state
    if (isProcessing) {
      setLoadState('loading');
      return;
    }
    
    // Handle invalid image URLs
    if (!isValidImageUrl) {
      setLoadState('error');
      if (onError) onError();
      return;
    }

    setLoadState('loading');
    
    // Load placeholder image first for better visual experience
    const placeholderImg = new Image();
    placeholderImg.onload = () => {
      setPlaceholderLoaded(true);
    };
    placeholderImg.src = getPlaceholderUrl(src);
    
    // Then preload main image
    const mainImg = new Image();
    
    mainImg.onload = () => {
      setLoadState('loaded');
      if (onLoad) onLoad();
    };
    
    mainImg.onerror = () => {
      // Try to retry loading a few times with exponential backoff
      if (retryCount < maxRetries) {
        const delay = 1000 * Math.pow(2, retryCount);
        
        console.log(`[Image] Retry ${retryCount + 1}/${maxRetries} for ${alt} in ${delay/1000}s`);
        
        const timer = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          
          // Force reload with cache busting
          mainImg.src = `${src}${src.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`;
        }, delay);
        
        return () => clearTimeout(timer);
      } else {
        console.log(`[Image] Failed to load ${alt} after ${maxRetries} retries`);
        setLoadState('error');
        if (onError) onError();
      }
    };
    
    // Start loading the main image with a slight delay to allow the placeholder to load first
    setTimeout(() => {
      mainImg.src = src;
    }, 50);
  }, [src, retryCount, maxRetries, isValidImageUrl, isProcessing, onLoad, onError, alt]);

  // Reset retry count when src changes
  useEffect(() => {
    setRetryCount(0);
  }, [src]);

  return (
    <ImageContainer className={className}>
      {/* Special handling for "PROCESSING" state */}
      {isProcessing && (
        <ImagePlaceholder>
          <FallbackIcon>{fallbackIcon}</FallbackIcon>
          <div style={{ 
            position: 'absolute', 
            bottom: '10px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            fontSize: '12px',
            color: '#666',
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: '4px 8px',
            borderRadius: '4px'
          }}>
            Image Processing...
          </div>
        </ImagePlaceholder>
      )}
      
      {/* Regular image handling logic */}
      {!isProcessing && (
        <>
          {/* Low quality placeholder while loading */}
          {isValidImageUrl && loadState === 'loading' && placeholderLoaded && (
            <BlurredBackground style={{ backgroundImage: `url(${getPlaceholderUrl(src)})` }} />
          )}
          
          {/* Main image */}
          {isValidImageUrl && (
            <StyledImage 
              src={src} 
              alt={alt} 
              style={{ opacity: loadState === 'loaded' ? 1 : 0 }}
            />
          )}
          
          {/* Loading indicator */}
          {loadState === 'loading' && (
            <ImagePlaceholder>
              <LoadingSpinner />
            </ImagePlaceholder>
          )}
          
          {/* Error fallback */}
          {loadState === 'error' && (
            <ImagePlaceholder>
              <FallbackIcon>{fallbackIcon}</FallbackIcon>
            </ImagePlaceholder>
          )}
        </>
      )}
    </ImageContainer>
  );
};

export default OptimizedImage;
