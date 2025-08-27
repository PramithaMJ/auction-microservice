import styled from '@emotion/styled';
import Link from 'next/link';
import tw from 'twin.macro';

const StyledFooter = styled.footer`
  ${tw`
    bg-gray-900 
    text-white
    border-t border-gray-800
  `}
`;

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    'Auction': [
      { name: 'Browse Auctions', href: '/listings' },
      { name: 'Sell Items', href: '/sell' },
      { name: 'How It Works', href: '/how-it-works' },
      { name: 'Categories', href: '/categories' },
    ],
    'Account': [
      { name: 'Sign In', href: '/auth/signin' },
      { name: 'Register', href: '/auth/signup' },
      { name: 'My Dashboard', href: '/dashboard' },
      { name: 'My Profile', href: '/profile' },
    ],
    'Support': [
      { name: 'Help Center', href: '/help' },
      { name: 'Contact Us', href: '/contact' },
      { name: 'Safety Tips', href: '/safety' },
      { name: 'FAQ', href: '/faq' },
    ],
    'Legal': [
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Cookie Policy', href: '/cookies' },
      { name: 'Disclaimer', href: '/disclaimer' },
    ],
  };

  return (
    <StyledFooter>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                AuctionHub
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Your premier destination for online auctions. Discover rare items, bid on exclusive collections, and find unique treasures.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.5 13.559 3.5 12.018s.698-2.877 1.626-3.673c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.796 1.626 2.132 1.626 3.673s-.698 2.877-1.626 3.673c-.875.807-2.026 1.297-3.323 1.297z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-amber-400 transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-semibold mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href}>
                      <a className="text-gray-400 hover:text-amber-400 text-sm transition-colors">
                        {link.name}
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              © {currentYear} AuctionHub. All rights reserved.
            </div>
            <div className="mt-4 md:mt-0">
              <p className="text-xs text-gray-500">
                <span className="font-semibold">Demo Platform:</span> Built with modern microservices architecture
              </p>
              <p className="text-xs text-gray-600 mt-1">
                TypeScript • Node.js • React • Next.js • Docker • Kubernetes
              </p>
            </div>
          </div>
        </div>
      </div>
    </StyledFooter>
  );
};

export default Footer;
