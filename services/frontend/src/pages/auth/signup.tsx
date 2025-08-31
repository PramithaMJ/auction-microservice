import styled from '@emotion/styled';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useContext, useState } from 'react';
import { toast } from 'react-toastify';
import tw from 'twin.macro';
import * as Yup from 'yup';

import AppContext from '../../context/app-context';
import buildClient from '../../api/base-client';

const StyledErrorMessage = styled.div`${tw`
    text-sm
    text-red-600
    my-0.5
`}`;

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Your email address must be a valid email')
    .max(100, 'Your email address must be less than 100 characters')
    .required('Required'),
  name: Yup.string()
    .min(4, 'Your username must be more than 4 characters')
    .max(32, 'Your username Passwords must be less than 32 characters')
    .required('Required'),
  password: Yup.string()
    .min(4, 'Passwords must be more than 4 characters')
    .max(32, 'Passwords must be less than 32 characters')
    .required('Required'),
  passwordConfirm: Yup.string()
    .min(4, 'Passwords must be more than 4 characters')
    .max(32, 'Passwords must be less than 32 characters')
    .oneOf([Yup.ref('password'), null], 'Passwords do not match')
    .required('Required'),
});

const SignUp = () => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { setAuth } = useContext(AppContext);
  const router = useRouter();

  const onSubmit = async (body) => {
    setIsSigningUp(true);

    try {
      const client = buildClient({});
      const { data } = await client.post('/api/auth/signup', body);
      setAuth({ isAuthenticated: true, currentUser: data });
      toast.success('Sucessfully signed up!');
      router.push('/');
    } catch (err) {
      err.response.data.errors.forEach((err) => toast.error(err.message));
    }

    setIsSigningUp(false);
  };

  return (
    <>
      <Head>
        <title>Sign Up | auctionweb.site</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join AuctionHub Today
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start bidding and selling with confidence
          </p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl border border-amber-100 sm:px-10">
            <Formik
              initialValues={{
                email: '',
                name: '',
                password: '',
                passwordConfirm: '',
              }}
              validationSchema={validationSchema}
              onSubmit={onSubmit}
            >
              <Form className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <Field
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 sm:text-sm"
                  />
                  <ErrorMessage component={StyledErrorMessage} name="email" />
                </div>

                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Username
                  </label>
                  <Field
                    type="text"
                    name="name"
                    placeholder="Choose a username"
                    className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 sm:text-sm"
                  />
                  <ErrorMessage component={StyledErrorMessage} name="name" />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <Field
                    type="password"
                    name="password"
                    placeholder="Create a password"
                    className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 sm:text-sm"
                  />
                  <ErrorMessage
                    component={StyledErrorMessage}
                    name="password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="passwordConfirm"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </label>
                  <Field
                    type="password"
                    name="passwordConfirm"
                    placeholder="Confirm your password"
                    className="mt-1 appearance-none block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 sm:text-sm"
                  />
                  <ErrorMessage
                    component={StyledErrorMessage}
                    name="passwordConfirm"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSigningUp}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isSigningUp ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating account...
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                  <div className="mt-4 text-center">
                    <span className="text-sm text-gray-600">
                      Already have an account?{' '}
                      <a href="/auth/signin" className="font-medium text-amber-600 hover:text-amber-500 transition-colors">
                        Sign in here
                      </a>
                    </span>
                  </div>
                </div>
              </Form>
            </Formik>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;
