import styled from '@emotion/styled';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import tw from 'twin.macro';

import buildClient from '../api/base-client';
import AppContext from '../context/app-context';

const StyledNavbar = styled.nav`
  ${tw`
    bg-white 
    shadow-lg
    border-b border-gray-100
`}
`;

const Navbar = () => {
  const { auth, setAuth } = useContext(AppContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const signOut = async () => {
    try {
      await buildClient().post('/api/auth/signout');
      setAuth({ isAuthenticated: false, currentUser: null });
      router.push('/');
    } catch (err) {
      console.log(err);
    }
  };

  const navigation = [
    { name: 'Auctions', href: '/listings', icon: '🏆' },
    { name: 'Sell Item', href: '/sell', icon: '💎' },
    { name: 'Categories', href: '/categories', icon: '📂' },
  ];

  return (
    <StyledNavbar>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/">
              <a className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center group-hover:shadow-md transition-shadow">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold text-yellow-600">
                  AuctionHub
                </span>
              </a>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <a className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  router.pathname === item.href
                    ? 'text-yellow-700 bg-yellow-50'
                    : 'text-gray-700 hover:text-yellow-700 hover:bg-yellow-50'
                }`}>
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </a>
              </Link>
            ))}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {auth.isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <a className="text-gray-700 hover:text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    Dashboard
                  </a>
                </Link>
                <Link href={`/profile/${auth.currentUser?.name || 'settings'}`}>
                  <a className="text-gray-700 hover:text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    Profile
                  </a>
                </Link>
                <button
                  onClick={signOut}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <a className="text-gray-700 hover:text-yellow-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                    Sign In
                  </a>
                </Link>
                <Link href="/auth/signup">
                  <a className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg">
                    Get Started
                  </a>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-500"
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 border-t border-gray-200">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <a
                  className={`flex items-center px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                    router.pathname === item.href
                      ? 'text-yellow-700 bg-yellow-100'
                      : 'text-gray-700 hover:text-yellow-700 hover:bg-yellow-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.name}
                </a>
              </Link>
            ))}
            
            {auth.isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <a
                    className="flex items-center px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:text-yellow-700 hover:bg-yellow-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3"></span>
                    Dashboard
                  </a>
                </Link>
                <Link href={`/profile/${auth.currentUser?.name || 'settings'}`}>
                  <a
                    className="flex items-center px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:text-yellow-700 hover:bg-yellow-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3"></span>
                    Profile
                  </a>
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:text-red-600 hover:bg-red-50"
                >
                  <span className="mr-3">🚪</span>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <a
                    className="flex items-center px-3 py-2 rounded-lg text-base font-medium text-gray-700 hover:text-yellow-700 hover:bg-yellow-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3">🔑</span>
                    Sign In
                  </a>
                </Link>
                <Link href="/auth/signup">
                  <a
                    className="flex items-center px-3 py-2 rounded-lg text-base font-medium bg-yellow-500 text-white mx-3 shadow-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-3">✨</span>
                    Get Started
                  </a>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </StyledNavbar>
  );
};

export default Navbar;
