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
	lg:w-1/5
  sm:w-1/3
	px-2
	mb-4
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
	hover:scale-105
`}`;

const TextWrapper = styled.div`${tw`
	p-4
`}`;

const StyledTitle = styled.h3`${tw`
	font-semibold
	text-gray-900
	mb-2
	text-lg
	leading-tight
`}`;

const StyledText = styled.div`${tw`
	text-yellow-600 
	font-medium
	mb-2
	text-sm
`}`;

const StyledPrice = styled.p`${tw`
	text-2xl
	font-bold
	text-gray-900
`}`;

const StyledImageContainer = styled.div`${tw`
	w-full
	h-48
	bg-gradient-to-br from-yellow-100 to-orange-100
	flex
	items-center
	justify-center
	rounded-t-xl
	border-b
	border-yellow-200
	overflow-hidden
	relative
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
`}`;

const StyledEmojiIcon = styled.div`${tw`
	text-6xl
	opacity-80
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
  
  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };
  
  return (
    <StyledListingCard>
      <Link href={slug}>
        <StyledCardContent>
          <StyledImageContainer>
            {smallImage && !imageError ? (
              <>
                <StyledImage
                  src={smallImage}
                  alt={name}
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{ opacity: imageLoaded ? 1 : 0 }}
                />
                {!imageLoaded && (
                  <StyledImageFallback style={{ position: 'absolute', top: 0, left: 0 }}>
                    <div className="animate-pulse">
                      <div className="w-full h-full bg-gray-200 rounded"></div>
                    </div>
                  </StyledImageFallback>
                )}
              </>
            ) : (
              <StyledImageFallback>
                <StyledEmojiIcon>{emojiIcon}</StyledEmojiIcon>
              </StyledImageFallback>
            )}
          </StyledImageContainer>
          <TextWrapper>
            <StyledTitle>{name}</StyledTitle>
            <StyledText>
              <Countdown expiresAt={expiresAt} />
            </StyledText>
            <StyledPrice>{centsToDollars(price)}</StyledPrice>
          </TextWrapper>
        </StyledCardContent>
      </Link>
    </StyledListingCard>
  );
};

export default ListingCard;
