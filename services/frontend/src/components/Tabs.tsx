import styled from '@emotion/styled';
import { FunctionComponent } from 'react';
import tw from 'twin.macro';

const StyledTabs = styled.div`${tw`
    border-b 
    border-gray-200
`}`;

const StyledTabsNav = styled.nav`${tw`
    flex 
    space-x-8
`}`;

const Tabs: FunctionComponent = ({ children }) => {
  return (
    <StyledTabs>
      <StyledTabsNav aria-label="Tabs">{children}</StyledTabsNav>
    </StyledTabs>
  );
};

export default Tabs;
