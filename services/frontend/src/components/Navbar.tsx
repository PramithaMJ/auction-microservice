import styled from '@emotion/styled';
import React, { useContext, useState } from 'react';
import tw from 'twin.macro';

import buildClient from '../api/base-client';
import AppContext from '../context/app-context';
import CloseIcon from './CloseIcon';
import HamburgerMenuIcon from './HamburgerMenuIcon';
import Logo from './Logo';
import NavbarTab from './NavbarTab';
import SearchBar from './SearchBar';
import DesktopUserMenu from './UserMenu';

const StyledNavbar = styled.nav`
  ${tw`
    bg-white 
    shadow
`}
`;

const StyledDesktopContentContainer = styled.div`
  ${tw`
    max-w-7xl 
    mx-auto 
    px-2 
    sm:px-4 
    lg:px-8
`}
`;

const StyledDesktopContent = styled.div`
  ${tw`
    flex 
    justify-between 
    h-16
`}
`;

const StyledDesktopNavigationTabsContainer = styled.div`
  ${tw`
    flex 
    px-2 
    lg:px-0
`}
`;

const StyledDesktopNavigationTabs = styled.div`
  ${tw`
    hidden 
    lg:ml-6 
    lg:flex 
    lg:space-x-8
`}
`;

const StyledMobileHamburgerMenuContainer = styled.div`
  ${tw`
    flex 
    items-center 
    lg:hidden
`}
`;

const StyledMobileHamburgerMenuButton = styled.button`
  ${tw`
    inline-flex 
    items-center 
    justify-center 
    p-2 
    rounded-md 
    text-gray-400 
    hover:text-gray-500 
    hover:bg-gray-100 
    focus:outline-none 
    focus:ring-2 
    focus:ring-inset 
    focus:ring-indigo-500
`}
`;

const StyledSpan = styled.span`
  ${tw`
    sr-only
`}
`;

const StyledNavbarButtonsContainer = styled.div`
  ${tw`
    hidden 
    lg:ml-4 
    lg:flex 
    lg:items-center
`}
`;

const StyledMobileNavContainer = styled.div`
  ${tw`
    lg:hidden
`}
`;

const StyledMobileNavigationTabsContainer = styled.div`
  ${tw`
    pt-2 
    pb-3 
    space-y-1
`}
`;

const StyledInformationContainer = styled.div`
  ${tw`
    ml-3
`}
`;

const StyledProfileImgContainer = styled.div`
  ${tw`
    flex-shrink-0
`}
`;

const StyledProfileImg = styled.img`
  ${tw`
    h-10 
    w-10 
    rounded-full
`}
`;

const StyledName = styled.div`
  ${tw`
    text-base 
    font-medium 
    text-gray-800
`}
`;

const StyledEmail = styled.div`
  ${tw`
    text-sm 
    font-medium 
    text-gray-500
`}
`;

const StyledSignOutButton = styled.button`
  ${tw`
    border-transparent 
    text-gray-600 
    hover:bg-gray-50 
    hover:border-gray-300 
    hover:text-gray-800 
    block 
    pl-3 
    pr-4 
    py-2 
    border-l-4 
    text-base 
    font-medium
`}
`;

const StyledMobileContent = styled.div`
  ${tw`
    pt-4 
    pb-3 
    border-t 
    border-gray-200
`}
`;

const StyledProfileInformation = styled.div`
  ${tw`
    flex 
    items-center 
    px-4
`}
`;

const Navbar = (): JSX.Element => {
  const {
    auth: { isAuthenticated, currentUser },
    setAuth,
  } = useContext(AppContext);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const onClick = async () => {
    try {
      const client = buildClient({});
      await client.post('/api/auth/signout');
      setAuth({ isAuthenticated: false, currentUser: null });
    } catch (err) {}
  };

  return (
    <StyledNavbar>
      <StyledDesktopContentContainer>
        <StyledDesktopContent>
          <StyledDesktopNavigationTabsContainer>
            <Logo />
            <StyledDesktopNavigationTabs>
              <NavbarTab href="/" name="Home" />
              <NavbarTab href="/listings" name="Browse Listings" />
              {isAuthenticated && (
                <NavbarTab href="/sell" name="Sell an Item" />
              )}
            </StyledDesktopNavigationTabs>
          </StyledDesktopNavigationTabsContainer>
          <SearchBar />
          <StyledMobileHamburgerMenuContainer>
            <StyledMobileHamburgerMenuButton
              onClick={() => setShowMobileNav(!showMobileNav)}
              aria-expanded="false"
            >
              <StyledSpan>Open main menu</StyledSpan>
              {showMobileNav ? <HamburgerMenuIcon /> : <CloseIcon />}
            </StyledMobileHamburgerMenuButton>
          </StyledMobileHamburgerMenuContainer>
          {isAuthenticated ? (
            <StyledNavbarButtonsContainer>
              <DesktopUserMenu />
            </StyledNavbarButtonsContainer>
          ) : (
            <StyledDesktopNavigationTabs>
              <NavbarTab href="/auth/signin" name="Sign in" />
              <NavbarTab href="/auth/signup" name="Sign up" />
            </StyledDesktopNavigationTabs>
          )}
        </StyledDesktopContent>
      </StyledDesktopContentContainer>
      {showMobileNav && (
        <StyledMobileNavContainer>
          <StyledMobileNavigationTabsContainer>
            <NavbarTab href="/" name="Home" />
            <NavbarTab href="/listings" name="Browse Listings" />
            {isAuthenticated && <NavbarTab href="/sell" name="Sell an Item" />}
          </StyledMobileNavigationTabsContainer>
          <StyledMobileContent>
            {isAuthenticated && (
              <StyledProfileInformation>
                <StyledProfileImgContainer>
                  <StyledProfileImg
                    src={currentUser.avatar}
                    alt="Your Profile Picture"
                  />
                </StyledProfileImgContainer>
                <StyledInformationContainer>
                  <StyledName>{currentUser.name}</StyledName>
                  <StyledEmail>{currentUser.email}</StyledEmail>
                </StyledInformationContainer>
              </StyledProfileInformation>
            )}
            <StyledMobileNavigationTabsContainer>
              {isAuthenticated ? (
                <>
                  <NavbarTab
                    href={`/profile/${currentUser.name}`}
                    name="Your Profile"
                  />
                  <NavbarTab href="/dashboard/listings" name="Dashboard" />
                  <NavbarTab href="/settings/profile" name="Settings" />
                  <StyledSignOutButton onClick={onClick}>
                    Sign out
                  </StyledSignOutButton>
                </>
              ) : (
                <>
                  <NavbarTab href="/auth/signin" name="Sign in" />
                  <NavbarTab href="/auth/signup" name="Sign up" />
                </>
              )}
            </StyledMobileNavigationTabsContainer>
          </StyledMobileContent>
        </StyledMobileNavContainer>
      )}
    </StyledNavbar>
  );
};

export default Navbar;
