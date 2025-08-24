import styled from '@emotion/styled';
import tw from 'twin.macro';

const StyledLogo = styled.div`${tw`
	flex-shrink-0 
	flex items-center
`}`;

const StyledMobileLogo = styled.img`${tw`
	block 
	lg:hidden 
	h-8 
	w-auto
`}`;

const StyledDesktopLogo = styled.img`${tw`
	hidden 
	lg:block 
	h-8 
	w-auto
`}`;

const Logo = () => {
  return (
    <StyledLogo>
      <StyledMobileLogo
        src="/images/small-logo.svg"
        alt="Auction Website Logo"
      />
      <StyledDesktopLogo
        src="/images/large-logo.svg"
        alt="Auction Website Logo"
      />
    </StyledLogo>
  );
};

export default Logo;
