import styled from '@emotion/styled';
import Link from 'next/link';
import React from 'react';
import tw from 'twin.macro';

import { centsToDollars } from '../utils/cents-to-dollars';
import Countdown from './Countdown';

interface IProps {
  name: string;
  expiresAt: string;
  price: number;
  slug: string;
  smallImage: string;
}

const StyledListingCard = styled.div`${tw`
	w-full
	max-w-sm
	mx-auto
	mb-6
`}`;

const StyledCardContent = styled.div`${tw`
	bg-white
	rounded-2xl
	shadow-lg
	hover:shadow-2xl
	transition-all
	duration-300
	overflow-hidden
	border
	border-gray-100
	hover:border-gray-200
	transform
	hover:scale-105
	cursor-pointer
`}`;

const TextWrapper = styled.div`${tw`
	p-6
`}`;

const StyledTitle = styled.h3`${tw`
	font-bold
	text-gray-900
	mb-3
	text-lg
	leading-tight
	line-clamp-2
	min-h-[3.5rem]
`}`;

const StyledText = styled.div`${tw`
	text-orange-600 
	font-semibold
	mb-3
	text-sm
	bg-orange-50
	px-3
	py-1
	rounded-full
	inline-block
`}`;

const StyledPrice = styled.p`${tw`
	text-3xl
	font-bold
	text-green-600
	mb-2
`}`;

const StyledPriceLabel = styled.p`${tw`
	text-sm
	text-gray-500
	font-medium
`}`;

const StyledImageContainer = styled.div`${tw`
	w-full
	h-64
	bg-gradient-to-br from-blue-50 to-indigo-100
	flex
	items-center
	justify-center
	relative
	overflow-hidden
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
	bg-gradient-to-br from-blue-50 to-indigo-100
`}`;

const StyledEmojiIcon = styled.div`${tw`
	text-8xl
	opacity-90
	filter
	drop-shadow-lg
`}`;

const StyledBadge = styled.div`${tw`
	absolute
	top-4
	right-4
	bg-red-500
	text-white
	px-3
	py-1
	rounded-full
	text-xs
	font-bold
	shadow-lg
	z-10
`}`;

// Function to get emoji based on listing title
const getEmojiForListing = (title: string): string => {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('watch') || titleLower.includes('clock') || titleLower.includes('time')) return '⌚';
  if (titleLower.includes('car') || titleLower.includes('vehicle') || titleLower.includes('auto')) return '🚗';
  if (titleLower.includes('art') || titleLower.includes('paint') || titleLower.includes('canvas')) return '🎨';
  if (titleLower.includes('book') || titleLower.includes('novel') || titleLower.includes('read')) return '📚';
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
  
  // Default emojis for common auction items
  const defaultEmojis = ['🎁', '💍', '🖼️', '🎯', '🎪', '🎭', '🎊', '🎀', '🏅', '⭐'];
  return defaultEmojis[Math.floor(Math.random() * defaultEmojis.length)];
};

const ListingCard = ({ name, price, slug, smallImage, expiresAt }: IProps) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const emojiIcon = getEmojiForListing(name);
  
  // Debug logging
  React.useEffect(() => {
    console.log('ListingCard Debug:', {
      name,
      smallImage,
      hasSmallImage: !!smallImage,
      imageError,
      imageLoaded
    });
  }, [name, smallImage, imageError, imageLoaded]);
  
  const handleImageError = () => {
    console.log('Image error for:', name, 'URL:', smallImage);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('Image loaded for:', name);
    setImageLoaded(true);
  };
  
  return (
    <StyledListingCard>
      <Link href={slug}>
        <StyledCardContent>
          <StyledImageContainer>
            <StyledBadge>LIVE</StyledBadge>
            {smallImage && !imageError ? (
              <>
                <StyledImage
                  src={smallImage}
                  alt={name}
                  onError={(e) => {
                    console.error('Image failed to load:', {
                      src: smallImage,
                      name,
                      error: e
                    });
                    handleImageError();
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', name);
                    handleImageLoad();
                  }}
                  style={{ opacity: imageLoaded ? 1 : 0 }}
                />
                {!imageLoaded && (
                  <StyledImageFallback style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                    <div className="animate-pulse w-full h-full bg-gray-200 rounded-t-2xl flex items-center justify-center">
                      <div className="text-gray-400">Loading...</div>
                    </div>
                  </StyledImageFallback>
                )}
              </>
            ) : (
              <StyledImageFallback>
                <div className="text-center">
                  <StyledEmojiIcon>{emojiIcon}</StyledEmojiIcon>
                  <div className="text-gray-500 text-xs mt-2">
                    {smallImage ? 'Image failed to load' : 'No image available'}
                  </div>
                </div>
              </StyledImageFallback>
            )}
          </StyledImageContainer>
          <TextWrapper>
            <StyledTitle>{name}</StyledTitle>
            <StyledText>
              <Countdown expiresAt={expiresAt} />
            </StyledText>
            <StyledPrice>{centsToDollars(price)}</StyledPrice>
            <StyledPriceLabel>Current Bid</StyledPriceLabel>
          </TextWrapper>
        </StyledCardContent>
      </Link>
    </StyledListingCard>
  );
};

export default ListingCard;
