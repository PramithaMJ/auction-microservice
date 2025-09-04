import styled from '@emotion/styled';
import Link from 'next/link';
import React from 'react';
import tw from 'twin.macro';

import { centsToDollars } from '../utils/cents-to-dollars';
import Countdown from './Countdown';
import OptimizedImage from './OptimizedImage';

interface IProps {
  name: string;
  expiresAt: string;
  price: number;
  slug: string;
  smallImage: string;
  sellerName?: string;
}

const StyledListingCard = styled.div`${tw`
	w-full
	h-full
`}`;

const StyledCardContent = styled.div`${tw`
	rounded-xl
	shadow-lg
	hover:shadow-xl
	cursor-pointer
	bg-white
	border
	border-gray-100
	transition-all
	duration-300
	hover:transform
	hover:scale-[1.02]
	overflow-hidden
	h-full
	flex
	flex-col
`}`;

const TextWrapper = styled.div`${tw`
	p-4
	flex-1
	flex
	flex-col
	justify-between
`}`;

const StyledTitle = styled.h3`${tw`
	font-semibold
	text-gray-900
	mb-2
	text-base
	leading-tight
	min-h-[3rem]
	flex
	items-start
`}
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	word-break: break-word;
`;

const StyledText = styled.div`${tw`
	text-yellow-600 
	font-medium
	mb-2
	text-sm
	flex-shrink-0
`}`;

const StyledPrice = styled.p`${tw`
	text-xl
	font-bold
	text-gray-900
	flex-shrink-0
`}`;

const StyledImageContainer = styled.div`${tw`
	w-full
	h-48
	bg-gradient-to-br from-yellow-100 to-orange-100
	rounded-t-xl
	border-b
	border-yellow-200
	overflow-hidden
	relative
	flex-shrink-0
`}`;

const StyledImage = styled.img`${tw`
	w-full
	h-full
	object-cover
	transition-transform
	duration-300
	hover:scale-110
`}`;

const StyledImageFallback = styled.div`${tw`
	w-full
	h-full
	flex
	items-center
	justify-center
	bg-gradient-to-br from-yellow-100 to-orange-100
	absolute
	top-0
	left-0
`}`;

const StyledEmojiIcon = styled.div`${tw`
	text-6xl
	opacity-80
`}`;

const StyledEmojiOverlay = styled.div`${tw`
	absolute
	bottom-2
	right-2
	text-3xl
	bg-white
	bg-opacity-90
	rounded-full
	w-12
	h-12
	flex
	items-center
	justify-center
	shadow-lg
	border-2
	border-yellow-300
	z-10
`}`;

const StyledLoadingSpinner = styled.div`${tw`
	w-8
	h-8
	border-4
	border-yellow-200
	border-t-yellow-600
	rounded-full
	animate-spin
`}`;

const StyledDebugInfo = styled.div`${tw`
	absolute
	top-2
	left-2
	bg-red-500
	text-white
	text-xs
	px-2
	py-1
	rounded
	z-10
`}`;

// Function to get emoji based on listing title
const getEmojiForListing = (title: string): string => {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('watch') || titleLower.includes('clock') || titleLower.includes('time')) return '⌚';
  if (titleLower.includes('car') || titleLower.includes('vehicle') || titleLower.includes('auto')) return '🚗';
  if (titleLower.includes('art') || titleLower.includes('paint') || titleLower.includes('canvas')) return '🎨';
  if (titleLower.includes('book') || titleLower.includes('novel') || titleLower.includes('read')) return '';
  if (titleLower.includes('music') || titleLower.includes('guitar') || titleLower.includes('piano')) return '🎵';
  if (titleLower.includes('camera') || titleLower.includes('photo') || titleLower.includes('lens')) return '📷';
  if (titleLower.includes('jewelry') || titleLower.includes('ring') || titleLower.includes('necklace')) return '💎';
  if (titleLower.includes('phone') || titleLower.includes('mobile') || titleLower.includes('smartphone')) return '📱';
  if (titleLower.includes('computer') || titleLower.includes('laptop') || titleLower.includes('pc')) return '💻';
  if (titleLower.includes('vintage') || titleLower.includes('antique') || titleLower.includes('classic')) return '🏺';
  if (titleLower.includes('sports') || titleLower.includes('ball') || titleLower.includes('game')) return '⚽';
  if (titleLower.includes('furniture') || titleLower.includes('chair') || titleLower.includes('table')) return '🪑';
  if (titleLower.includes('fashion') || titleLower.includes('clothes') || titleLower.includes('dress')) return '👗';
  if (titleLower.includes('electronics') || titleLower.includes('gadget') || titleLower.includes('device')) return '🔌';
  if (titleLower.includes('collectible') || titleLower.includes('rare') || titleLower.includes('limited')) return '🏆';
  if (titleLower.includes('coffee') || titleLower.includes('bottle')) return '☕';
  if (titleLower.includes('gaming') || titleLower.includes('mouse')) return '🖱️';
  if (titleLower.includes('spectacle') || titleLower.includes('glasses')) return '👓';
  
  // Default emojis for common auction items
  const defaultEmojis = ['🎁', '💍', '', '', '🎪', '🎭', '🎊', '🎀', '🏅', '⭐'];
  return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
};

const ListingCard = ({ name, price, slug, smallImage, expiresAt, sellerName }: IProps) => {
  const [imageStatus, setImageStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');
  const emojiIcon = getEmojiForListing(name);
  
  // Log useful information about the image for debugging
  React.useEffect(() => {
    console.log('ListingCard:', {
      name,
      smallImage: smallImage ? `${smallImage.substring(0, 50)}...` : 'NONE',
      hasValidImage: smallImage && smallImage.trim() !== '' && smallImage.startsWith('http'),
      imageLength: smallImage?.length || 0,
      status: imageStatus
    });
  }, [name, smallImage, imageStatus]);
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${name}`);
    setImageStatus('loaded');
  };

  const handleImageError = () => {
    console.log(`Image failed to load: ${name}`);
    setImageStatus('error');
  };
  
  // Determine if we have a valid image URL to display
  const hasValidImage = smallImage && smallImage.trim() !== '' && smallImage.startsWith('http');
  
  return (
    <StyledListingCard>
      <Link href={slug}>
        <StyledCardContent>
          <StyledImageContainer>
            {/* Debug info - only in development */}
            {typeof window !== 'undefined' && window.location?.hostname === 'localhost' && (
              <StyledDebugInfo>
                IMG: {hasValidImage ? '✓' : '✗'} | EMOJI: {emojiIcon}
              </StyledDebugInfo>
            )}
            
            {hasValidImage ? (
              <>
                {/* Use our optimized image component for better loading and error handling */}
                <OptimizedImage
                  src={smallImage}
                  alt={name}
                  fallbackIcon={emojiIcon}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
                
                {/* Emoji overlay shows on successful image load */}
                {imageStatus === 'loaded' && (
                  <StyledEmojiOverlay>
                    {emojiIcon}
                  </StyledEmojiOverlay>
                )}
              </>
            ) : (
              /* Fallback to large emoji when no valid image URL */
              <StyledImageFallback>
                <StyledEmojiIcon>{emojiIcon}</StyledEmojiIcon>
                {/* Show "Image Loading" text for newly created listings */}
                {smallImage === 'PROCESSING' && (
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
                )}
              </StyledImageFallback>
            )}
          </StyledImageContainer>
          <TextWrapper>
            <div>
              <StyledTitle>{name}</StyledTitle>
              {sellerName && (
                <div className="text-gray-500 text-xs mb-1">
                  by {sellerName}
                </div>
              )}
              <StyledText>
                <Countdown expiresAt={expiresAt} />
              </StyledText>
            </div>
            <StyledPrice>{centsToDollars(price)}</StyledPrice>
          </TextWrapper>
        </StyledCardContent>
      </Link>
    </StyledListingCard>
  );
};

export default ListingCard;
