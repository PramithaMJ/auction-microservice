import styled from '@emotion/styled';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { NextPageContext } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import React, { useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import tw from 'twin.macro';
import * as Yup from 'yup';

import Breadcrumb from '../../components/Breadcrumb';
import Breadcrumbs from '../../components/Breadcrumbs';
import Countdown from '../../components/Countdown';
import Error from '../../components/ErrorMessage';
import AppContext from '../../context/app-context';
import { centsToDollars } from '../../utils/cents-to-dollars';
import buildClient from '../../api/base-client';

const StyledListing = styled.div`${tw`
	flex 
	flex-wrap 
	-mx-8 
`}`;

const StyledTextContent = styled.div`${tw`
	lg:w-1/2 
	px-8 
	lg:mt-0 
  w-full
	order-2 
	lg:order-none
`}`;

const StyledTable = styled.table`${tw`
	w-full 
	mb-6
`}`;

const StyledTableRow = styled.tr`${tw`
	border-t
`}`;

const StyledTableRowName = styled.td`${tw`
	py-3 
	font-medium 
	text-gray-700
`}`;

const StyledTableRowValue = styled.td`${tw`
	text-right 
	max-w-2xl 
	text-gray-500
`}`;

const StyledAnchorTableRowValue = styled.td`${tw`
	text-right 
	max-w-2xl 
  hover:underline
  cursor-pointer
	text-gray-500
`}`;

const StyledImgContainer = styled.div`${tw`
	lg:w-1/2 
	px-8
`}`;

const StyledEmojiDisplay = styled.div`${tw`
	mb-4 
	rounded-2xl 
	shadow-lg
	bg-gradient-to-br from-yellow-100 to-orange-100
	flex
	items-center
	justify-center
	h-96
	border-2
	border-yellow-200
`}`;

const StyledLargeEmoji = styled.div`${tw`
	text-9xl
	opacity-90
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

const StyledErrorMessage = styled.div`${tw`
    text-sm
    text-red-600
    my-0.5
`}`;

const Listing = ({ listingData }) => {
  const {
    auth: { isAuthenticated, currentUser },
  } = useContext(AppContext);
  const [listing, setListing] = useState(listingData);
  const [isBidding, setIsBidding] = useState(false);

  // Get emoji icon for this listing
  const emojiIcon = listing ? getEmojiForListing(listing.title) : '🎁';

  useEffect(() => {
    const room = listing && listing.slug;
    if (!room) return;

    // Use environment variable or fallback for socket URL
    const socketUrl = process.env.NEXT_PUBLIC_LISTINGS_SOCKET_URL || 'http://listings:3103/socket';
    const socket = io(socketUrl, {
      secure: false,
      query: { r_var: room },
    });

    socket.emit('join');

    socket.on('bid', (data) => {
      setListing(data);
    });

    socket.on('bid-deleted', (data) => {
      setListing(data);
    });

    socket.on('listing-deleted', (data) => {
      setListing(data);
    });

    return () => {
      socket.emit('unsubscribe', room);
      socket.disconnect();
    };
  }, []);

  const onSubmit = async (body) => {
    setIsBidding(true);

    try {
      const client = buildClient({});
      await client.post(`/api/bids/${listing.id}`, {
        amount: body.amount * 100,
      });
      toast.success('Sucessfully placed bid!');
    } catch (err) {
      err.response.data.errors.forEach((err) => toast.error(err.message));
    }

    setIsBidding(false);
  };

  if (!listing) {
    return (
      <>
        <Error
          error="Error 404"
          message="Our server couldn't find that listing. It may have been deleted or there is a mispelling in the URL"
        />
      </>
    );
  }

  const validationSchema = Yup.object({
    amount: Yup.string()
      .matches(
        /^\s*-?(\d+(\.\d{1,2})?|\.\d{1,2})\s*$/,
        'The start price must be a number with at most 2 decimals'
      )
      .required('Required'),
  });

  return (
    <>
      <Head>
        <title>{listing.title} | auctionweb.site</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Breadcrumbs>
        <Breadcrumb link="/" name="Home" />
        <Breadcrumb link="/listings" name="Browse Listings" />
        <Breadcrumb link="/listings" name={listing.title} />
      </Breadcrumbs>
      <StyledListing>
        <StyledTextContent>
          <section className="py-3 mb-3">
            <h3 className="text-3xl leading-tight font-semibold font-heading">
              {listing.title}
            </h3>
            <p className="mt-1 max-w-2xl text-l text-gray-500">
              {listing.description}
            </p>
          </section>
          <StyledTable>
            <tbody>
              <StyledTableRow>
                <StyledTableRowName>Price</StyledTableRowName>
                <StyledTableRowValue>
                  {centsToDollars(listing.currentPrice)}
                </StyledTableRowValue>
              </StyledTableRow>
              <StyledTableRow>
                <StyledTableRowName>Seller</StyledTableRowName>
                <Link href={`/profile/${listing.user.name}`}>
                  <StyledAnchorTableRowValue>
                    {listing.user.name}
                  </StyledAnchorTableRowValue>
                </Link>
              </StyledTableRow>
              <StyledTableRow>
                <StyledTableRowName>Time Left</StyledTableRowName>
                <StyledTableRowValue>
                  <Countdown expiresAt={listing.expiresAt} />
                </StyledTableRowValue>
              </StyledTableRow>
            </tbody>
          </StyledTable>
          {isAuthenticated ? (
            <Formik
              initialValues={{
                amount: '',
              }}
              validationSchema={validationSchema}
              onSubmit={onSubmit}
            >
              <Form>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <div className="relative flex items-stretch flex-grow focus-within:z-10">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <Field
                      type="text"
                      name="amount"
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-none rounded-l-md pl-7 sm:text-sm border-gray-300"
                      placeholder="Amount to bid"
                    />
                  </div>
                  <button
                    type="submit"
                    className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {isBidding ? 'Placing bid...' : 'Bid now!'}
                  </button>
                </div>
                <ErrorMessage component={StyledErrorMessage} name="amount" />
              </Form>
            </Formik>
          ) : (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Sign in to place a bid
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      You need to be signed in to place bids on auction items.{' '}
                      <Link href="/auth/signin">
                        <a className="font-medium underline text-blue-800 hover:text-blue-600">
                          Sign in here
                        </a>
                      </Link>{' '}
                      or{' '}
                      <Link href="/auth/signup">
                        <a className="font-medium underline text-blue-800 hover:text-blue-600">
                          create an account
                        </a>
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </StyledTextContent>
        <StyledImgContainer>
          <StyledEmojiDisplay>
            <StyledLargeEmoji>{emojiIcon}</StyledLargeEmoji>
          </StyledEmojiDisplay>
        </StyledImgContainer>
      </StyledListing>
    </>
  );
};

Listing.getInitialProps = async (context: NextPageContext, client: any) => {
  try {
    const { listingSlug } = context.query;
    const { data } = await client.get(`/api/listings/${listingSlug}`);
    return { listingData: data };
  } catch (err) {
    console.error(err);
    return { listingData: null };
  }
};

export default Listing;
