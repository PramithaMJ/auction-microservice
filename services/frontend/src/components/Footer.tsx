import styled from '@emotion/styled';
import tw from 'twin.macro';

const StyledFooter = styled.footer`
	${tw`py-4 text-center`}
`;

const StyledText = styled.span`
	${tw`block md:inline-block mb-4 md:mb-0 mx-3`}
`;

const StyledLink = styled.a`
	${tw`inline-block text-blue-900 hover:text-indigo-600`}
`;

const Footer = () => {
  return (
    <StyledFooter>
      <StyledText>
        © 2025 Cloud Web App
      </StyledText>
    </StyledFooter>
  );
};

export default Footer;
