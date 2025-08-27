import styled from '@emotion/styled';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import Head from 'next/head';
import Router from 'next/router';
import React, { useContext, useState } from 'react';
import { toast } from 'react-toastify';
import tw from 'twin.macro';
import * as Yup from 'yup';

import Breadcrumb from '../components/Breadcrumb';
import Breadcrumbs from '../components/Breadcrumbs';
import DatePicker from '../components/DatePicker';
import Error from '../components/ErrorMessage';
import ImageUpload from '../components/ImageUpload';
import AppContext from '../context/app-context';
import buildClient from '../api/base-client';

const StyledErrorMessage = styled.div`${tw`
    text-sm
    text-red-600
    my-0.5
`}`;

const validationSchema = Yup.object({
  title: Yup.string()
    .min(5, 'The listing title must be between 5 and 1000 characters')
    .max(1000, 'The listing title must be between 5 and 1000 characters')
    .required('Required'),
  description: Yup.string()
    .min(5, 'The listing description must be between 5 and 500 characters')
    .max(500, 'The listing description must be between 5 and 500 characters')
    .required('Required'),
  image: Yup.mixed().required('Required'),
  price: Yup.string()
    .matches(
      /^\s*-?(\d+(\.\d{1,2})?|\.\d{1,2})\s*$/,
      'The start price must be a number with at most 2 decimals'
    )
    .required('Required'),
  expiresAt: Yup.date()
    .required('Required')
    .min(
      new Date(Date.now() + 30 * 60 * 1000),
      'Auctions must last at least 30 minutes'
    ),
});

const Sell = (): JSX.Element => {
  const {
    auth: { isAuthenticated },
  } = useContext(AppContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (body) => {
    setIsSubmitting(true);

    try {
      // Convert price to cents and ensure it's a valid number
      const priceInCents = Math.round(parseFloat(body.price) * 100);
      if (isNaN(priceInCents) || priceInCents <= 0) {
        toast.error('Please enter a valid price');
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      Object.keys(body).forEach((key) => {
        if (key === 'price') {
          formData.append(key, priceInCents.toString());
        } else if (key === 'expiresAt') {
          // Ensure date is properly formatted as ISO string
          const dateValue = body[key];
          if (dateValue instanceof Date) {
            formData.append(key, dateValue.toISOString());
          } else {
            formData.append(key, new Date(dateValue).toISOString());
          }
        } else {
          formData.append(key, body[key]);
        }
      });
      
      console.log('FormData entries:');
      // Log FormData entries for debugging
      Array.from(formData.entries()).forEach(([key, value]) => {
        console.log(key, value);
      });
      
      const client = buildClient({});
      const { data } = await client.post('/api/listings', formData);
      toast.success('Sucessfully listed item for sale!');
      Router.push(`/listings/${data.slug}`);
    } catch (err) {
      err.response.data.errors.forEach((err) => toast.error(err.message));
    }

    setIsSubmitting(false);
  };

  if (!isAuthenticated) {
    return (
      <Error
        error="Error 401"
        message="You must be logged in to sell an item."
      />
    );
  }

  return (
    <>
      <Head>
        <title>Sell an Item | auctionweb.site</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <Breadcrumbs>
        <Breadcrumb link="/" name="home" />
        <Breadcrumb link="/sell" name="Sell an Item" />
      </Breadcrumbs>
      <section className="py-3">
        <h3 className="text-3xl leading-tight font-semibold font-heading">
          Create Listing
        </h3>
        <p className="mt-1 max-w-2xl text-l text-gray-500">
          Put an item up for auction
        </p>
        <Formik
          initialValues={{
            title: '',
            description: '',
            price: '',
            expiresAt: '',
            image: '',
          }}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
        >
          {(props) => (
            <Form className="space-y-8 py-5 divide-y divide-gray-200">
              <div className="space-y-8 divide-y divide-gray-200 sm:space-y-5">
                <div className="space-y-6 sm:space-y-5">
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      Title
                    </label>
                    <div className="mt-1 sm:mt-0 sm:col-span-2">
                      <Field
                        type="text"
                        name="title"
                        placeholder="Enter a compelling title for your auction"
                        className="max-w-lg block w-full shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:max-w-4xl sm:text-sm border-gray-300 rounded-lg transition-all duration-200"
                      />
                      <ErrorMessage
                        component={StyledErrorMessage}
                        name="title"
                      />
                    </div>
                  </div>

                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      Description
                    </label>
                    <div className="mt-1 sm:mt-0 sm:col-span-2">
                      <Field
                        as="textarea"
                        name="description"
                        rows={6}
                        placeholder="Describe your item in detail - condition, history, special features..."
                        className="max-w-lg block w-full shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:max-w-4xl sm:text-sm border-gray-300 rounded-lg transition-all duration-200"
                      />
                      <ErrorMessage
                        component={StyledErrorMessage}
                        name="description"
                      />
                    </div>
                  </div>

                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                    <label
                      htmlFor="image"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      Image
                    </label>
                    <div className="mt-1 sm:mt-0 sm:col-span-2">
                      <ImageUpload
                        name="image"
                        setFieldValue={props.setFieldValue}
                        className="block max-w-lg w-full shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:max-w-4xl sm:text-sm border-gray-300 rounded-lg transition-all duration-200"
                      />
                      <ErrorMessage
                        component={StyledErrorMessage}
                        name="image"
                      />
                    </div>
                  </div>

                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                    <label
                      htmlFor="price"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      Start Price
                    </label>
                    <div className="mt-1 sm:mt-0 sm:col-span-2">
                      <Field
                        type="text"
                        name="price"
                        placeholder="0.00"
                        className="block max-w-lg w-full shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:max-w-4xl sm:text-sm border-gray-300 rounded-lg transition-all duration-200"
                      />
                      <ErrorMessage
                        component={StyledErrorMessage}
                        name="price"
                      />
                    </div>
                  </div>

                  <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                    <label
                      htmlFor="endDate"
                      className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2"
                    >
                      End Date
                    </label>
                    <div className="mt-1 sm:mt-0 sm:col-span-2">
                      <DatePicker
                        name="expiresAt"
                        autocomplete="off"
                        value={props.values.expiresAt}
                        onChange={props.setFieldValue}
                        className="block max-w-lg w-full shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:max-w-4xl sm:text-sm border-gray-300 rounded-lg transition-all duration-200"
                        minDate={new Date(Date.now() + 30 * 60 * 1000)} // set minimum selectable date to 30 minutes from now
                      />
                      <ErrorMessage
                        component={StyledErrorMessage}
                        name="expiresAt"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ml-3 inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating listing...
                      </div>
                    ) : (
                      'Create Listing'
                    )}
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </section>
    </>
  );
};

export default Sell;
