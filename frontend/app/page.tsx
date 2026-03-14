"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Droplets, Scissors, Wind,
  Trash2, Recycle, Home as HomeIcon, Shrub,
  Wrench, SunSnow, Flower2, Sparkles
} from "lucide-react";
import ContactModal from "@/components/ContactModal";
import BundlePricingModal from "@/components/BundlePricingModal";
import { useState } from "react";

export default function Home() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [bundleSelectedServices, setBundleSelectedServices] = useState<Set<string>>(new Set());
  const hasApi = !!process.env.NEXT_PUBLIC_API_URL;

  // Render configuration error only if completely necessary and breaking
  if (!hasApi) {
    console.warn("API URL is not configured. Some features may not work.");
  }

  const services = [
    { name: "Window Cleaning", desc: "Crystal clear windows inside and out. Recommended 3x per year.", icon: <Droplets className="w-8 h-8 text-primary" /> },
    { name: "Lawn Aeration", desc: "Healthier grass roots. Recommended in Spring & Fall.", icon: <Shrub className="w-8 h-8 text-primary" /> },
    { name: "Lawn Mow & Trim", desc: "Weekly seasonal care to keep your lawn pristine.", icon: <Scissors className="w-8 h-8 text-primary" /> },
    { name: "Lawn Fertilizer", desc: "4x per year professional fertilization programs.", icon: <Recycle className="w-8 h-8 text-primary" /> },
    { name: "Sprinkler Winterization", desc: "Fall preparation to avoid freezing and pipe bursts.", icon: <SunSnow className="w-8 h-8 text-primary" /> },
    { name: "Shrub Pruning", desc: "Shape and maintain healthy shrubs 2x per year.", icon: <Wind className="w-8 h-8 text-primary" /> },
    { name: "Gutter Cleaning", desc: "Annual clearouts to prevent water damage.", icon: <HomeIcon className="w-8 h-8 text-primary" /> },
    { name: "Garbage Bin Cleaning", desc: "Eliminate odors and bacteria 2x per year.", icon: <Trash2 className="w-8 h-8 text-primary" /> },
    { name: "Leaf Removal", desc: "Fall cleanups to keep your lawn breathing.", icon: <Wind className="w-8 h-8 text-primary" /> },
    { name: "Driveway/Deck Power Wash", desc: "Annual deep clean for hard surfaces.", icon: <Wrench className="w-8 h-8 text-primary" /> },
    { name: "Weed Control", desc: "Chemical pre/post-emergent treatments 5x per year.", icon: <Sparkles className="w-8 h-8 text-primary" /> },
    { name: "Flower Bed Maintenance", desc: "Monthly mulching, weeding, and seasonal planting.", icon: <Flower2 className="w-8 h-8 text-primary" /> },
    { name: "Exterior House Wash", desc: "Annual soft wash for siding and exterior.", icon: <Droplets className="w-8 h-8 text-primary" /> },
    { name: "Spring/Fall Cleanup", desc: "Comprehensive seasonal property prep.", icon: <Wind className="w-8 h-8 text-primary" /> },
    { name: "Sprinkler Startup", desc: "Spring activation and zone testing.", icon: <SunSnow className="w-8 h-8 text-primary" /> },
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* Navbar */}
      <nav aria-label="Main navigation" className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-border transition-all">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Versa Logo" width={48} height={48} className="w-12 h-auto" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary leading-none">Versa</h1>
              <p className="text-xs text-primary uppercase tracking-widest font-semibold mt-1">Property Management</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Login / Sign Up</Link>
            <Link href="/profile" className="text-sm font-medium hover:text-primary transition-colors">Profile</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section data-testid="hero" className="relative h-screen flex items-center justify-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero.png"
            alt="Beautiful Utah Home"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-teal-950/95 via-emerald-950/80 to-black/40"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-1000">
            <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-sm border border-emerald-500/30 backdrop-blur-sm">
              Premium Bundled Services
            </span>
            <h2 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight">
              One Partner for Your <span className="text-emerald-400">Complete Property</span>
            </h2>
            <p className="text-xl sm:text-2xl text-emerald-50 leading-relaxed font-light">
              We specialize in bundling every service your property needs—from pristine window cleaning to perfect lawn care—saving you time, stress, and money.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => setIsBundleModalOpen(true)}
                className="px-8 py-4 bg-primary hover:bg-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1"
              >
                View Bundle Pricing
              </button>
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg backdrop-blur-md border border-white/20 transition-all"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold text-foreground">Everything We Handle</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose individual services or bundle them together for maximum savings. We ensure your property stays perfect year-round.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {services.map((service) => (
              <div
                key={service.name}
                className="group p-6 bg-card rounded-2xl shadow-sm border border-border hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col h-full"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-card-foreground mb-3">{service.name}</h3>
                <p className="text-muted-foreground leading-relaxed flex-grow">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-foreground text-background py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl font-bold">Ready to Simplify Your Property Care?</h2>
          <p className="text-primary-foreground max-w-xl mx-auto text-lg">
            Join hundreds of satisfied Utah homeowners who trust Versa to manage every detail of their estate.
          </p>
          <button
            onClick={() => setIsContactModalOpen(true)}
            className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-lg shadow-lg hover:bg-emerald-500 transition-colors"
          >
            Get Your Free Estimate
          </button>

          <div className="pt-16 mt-16 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 opacity-75">
              <Image src="/logo.svg" alt="Versa Logo" width={32} height={32} />
              <span className="font-bold">Versa Property Management</span>
            </div>
            <p className="text-background/80 text-sm">© {new Date().getFullYear()} Versa Property Management. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BundlePricingModal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        onOpenContact={(selected) => {
          setBundleSelectedServices(selected);
          setIsContactModalOpen(true);
        }}
      />

      <ContactModal
        key={isContactModalOpen ? 'open' : 'closed'}
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        selectedServices={bundleSelectedServices}
      />
    </main>
  );
}
