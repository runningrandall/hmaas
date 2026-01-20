"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">HMaaS</span>
            </div>
            <div className="flex items-center gap-4">
              <SignedOut>
                <div className="hidden sm:block">
                  <SignInButton mode="modal">
                    <button className="text-gray-600 hover:text-gray-900 font-medium px-3 py-2">
                      Sign In
                    </button>
                  </SignInButton>
                </div>
                <SignInButton mode="modal">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                    Get Started
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/protected"
                  className="text-gray-600 hover:text-gray-900 font-medium px-3 py-2 mr-2"
                >
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8">
              {/* Text Content */}
              <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 flex flex-col justify-center">
                <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                  <div className="sm:text-center lg:text-left">
                    <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                      <span className="block xl:inline">Complete home maintenance</span>{' '}
                      <span className="block text-blue-600 xl:inline">in one subscription</span>
                    </h1>
                    <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                      Stop worrying about filters, gutters, and leaks. We handle everything from preventative care to emergency repairs for a flat monthly fee.
                    </p>
                    <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                      <div className="rounded-md shadow">
                        <SignUpButtonWrapper />
                      </div>
                      <div className="mt-3 sm:mt-0 sm:ml-3">
                        <a
                          href="#how-it-works"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10"
                        >
                          How it works
                        </a>
                      </div>
                    </div>
                  </div>
                </main>
              </div>

              {/* Hero Image */}
              <div className="relative lg:inset-y-0 lg:right-0 lg:h-full lg:w-full">
                <div className="h-56 w-full sm:h-72 md:h-96 lg:w-full lg:h-full relative">
                  <Image
                    src="/hero-home.png"
                    alt="Beautiful maintained home"
                    fill
                    className="object-cover w-full h-full"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div id="services" className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:text-center">
              <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Services</h2>
              <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                What's included?
              </p>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
                Comprehensive care for your home, handled by certified professionals.
              </p>
            </div>

            <div className="mt-10">
              <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
                {[
                  {
                    name: 'HVAC Maintenance',
                    description: 'Quarterly filter changes and bi-annual system tune-ups to keep your air clean and efficient.',
                  },
                  {
                    name: 'Plumbing Health Check',
                    description: 'Annual inspection of pipes, water heaters, and fixtures to prevent leaks and water damage.',
                  },
                  {
                    name: 'Gutter Cleaning',
                    description: 'Twice-yearly cleaning to protect your roof and foundation from water buildup.',
                  },
                  {
                    name: 'On-Demand Repairs',
                    description: 'Access to our network of vetted pros at preferred rates for any other home repair needs.',
                  },
                ].map((feature) => (
                  <div key={feature.name} className="relative">
                    <dt>
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                        {/* Simple Check Icon */}
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">{feature.description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-xl text-gray-500">
                Choose the plan that fits your home size.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {[
                { name: 'Starter', price: '$99', desc: 'Perfect for condos and small homes.' },
                { name: 'Pro', price: '$199', desc: 'Ideal for single-family homes up to 2,500 sqft.', featured: true },
                { name: 'Estate', price: '$299', desc: 'Complete care for large properties.' },
              ].map((plan) => (
                <div key={plan.name} className={`relative p-8 bg-white border ${plan.featured ? 'border-blue-600 shadow-xl scale-105 z-10' : 'border-gray-200'} rounded-2xl flex flex-col`}>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                    <p className="mt-4 flex items-baseline text-gray-900">
                      <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className="ml-1 text-xl font-semibold text-gray-500">/mo</span>
                    </p>
                    <p className="mt-6 text-gray-500">{plan.desc}</p>
                  </div>
                  <div className="mt-8">
                    <SignedOut>
                      <SignInButton mode="modal">
                        <button className={`w-full block text-center rounded-lg px-6 py-3 font-medium ${plan.featured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                          Choose {plan.name}
                        </button>
                      </SignInButton>
                    </SignedOut>
                    <SignedIn>
                      <Link href="/protected">
                        <button className={`w-full block text-center rounded-lg px-6 py-3 font-medium ${plan.featured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                          Choose {plan.name}
                        </button>
                      </Link>
                    </SignedIn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-base text-gray-400">
            &copy; 2026 HMaaS Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Helper to handle client-side button logic for the hero
function SignUpButtonWrapper() {
  return (
    <SignedOut>
      <SignInButton mode="modal">
        <button className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
          Get started
        </button>
      </SignInButton>
    </SignedOut>
  );
}
