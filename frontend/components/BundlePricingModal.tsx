"use client";

import { useState } from 'react';
import { X, Check } from 'lucide-react';

interface BundlePricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact: () => void;
}

const servicesList = [
  { id: 'window-cleaning', name: "Window Cleaning", cadence: "3x per year", price: 8.00, unit: "per window", icon: "✨" },
  { id: 'lawn-mow', name: "Lawn Mow & Trim", cadence: "Weekly", price: 60.00, unit: "per 0.25 acre", icon: "🌱" },
  { id: 'lawn-aeration', name: "Lawn Aeration", cadence: "2x per year", price: 12.00, unit: "per 0.25 acre", icon: "🪴" },
  { id: 'lawn-fertilizer', name: "Lawn Fertilizer", cadence: "4x per year", price: 50.00, unit: "per 0.25 acre", icon: "🧪" },
  { id: 'sprinkler-winterization', name: "Sprinkler Winterization", cadence: "1x per year", price: 18.00, unit: "per zone", icon: "❄️" },
  { id: 'shrub-pruning', name: "Shrub Pruning", cadence: "2x per year", price: 10.00, unit: "per shrub", icon: "✂️" },
  { id: 'gutter-cleaning', name: "Gutter Cleaning", cadence: "1x per year", price: 1.00, unit: "per linear foot", icon: "🏠" },
  { id: 'garbage-bin', name: "Garbage Bin Cleaning", cadence: "2x per year", price: 15.00, unit: "per bin", icon: "🗑️" },
  { id: 'leaf-removal', name: "Leaf Removal", cadence: "1x per year", price: 60.00, unit: "per 0.25 acre", icon: "🍂" },
  { id: 'driveway-wash', name: "Driveway/Deck Wash", cadence: "1x per year", price: 0.30, unit: "per sq ft", icon: "💧" },
];

export default function BundlePricingModal({ isOpen, onClose, onOpenContact }: BundlePricingModalProps) {
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleService = (id: string) => {
    const next = new Set(selectedServices);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedServices(next);
  };

  // Sophisticated discount logic based on number of services bundled
  // 1 service: 0% off
  // 2 services: 5% off
  // 3 services: 10% off
  // 4 services: 15% off
  // 5+ services: 20% off (Max discount)
  const discountPercent = Math.min(Math.max((selectedServices.size - 1) * 5, 0), 20);

  // Note: since prices have different cadences and varying quantities (e.g. per sq ft vs per property),
  // we just show base prices to give users an idea of the discount structure.

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 shadow-2xl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-background rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-border gap-4">
          <div>
            <h3 className="text-2xl font-bold text-foreground">Interactive Bundle Pricing</h3>
            <p className="text-muted-foreground mt-1">Select services below to see your potential savings.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors self-end sm:self-auto translate-y-[-2rem] sm:translate-y-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
          {/* Services Selection List */}
          <div className="flex-1 overflow-y-auto p-6 bg-secondary/30">
            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Available Services</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {servicesList.map((service) => {
                const isSelected = selectedServices.has(service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`
                      cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col h-full
                      ${isSelected ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/50' : 'bg-card border-border hover:border-primary/30 hover:bg-secondary/50'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xl">{service.icon}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h5 className="font-bold text-foreground leading-tight">{service.name}</h5>
                      <p className="text-xs text-muted-foreground mt-1">{service.cadence} • ${service.price.toFixed(2)} {service.unit}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Savings Calculation Sidebar */}
          <div className="w-full lg:w-80 bg-primary/5 p-6 border-t lg:border-t-0 lg:border-l border-border flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6">
                ✨ Bundle & Save
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Services Selected</p>
                  <p className="text-4xl font-extrabold text-foreground">{selectedServices.size}</p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-muted-foreground text-sm">Your Discount Tier</p>
                  </div>
                  <div className="relative h-4 bg-secondary rounded-full overflow-hidden mt-2">
                    <div
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${(Math.min(selectedServices.size, 5) / 5) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mt-2">
                    <span>0%</span>
                    <span>10%</span>
                    <span>20% Max</span>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-5 border border-border shadow-sm">
                  <p className="text-muted-foreground text-sm mb-1">Estimated Savings</p>
                  <p className="text-5xl font-black text-primary">{discountPercent}% OFF</p>
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Automatically applied to every service in your bundle.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => {
                  onClose();
                  onOpenContact();
                }}
                className="w-full py-4 text-center font-bold text-white bg-primary rounded-lg shadow-lg hover:bg-emerald-600 transition-colors"
              >
                Get Exact Custom Quote
              </button>
              <p className="text-[10px] text-center text-muted-foreground">
                Prices vary based on exact property dimensions and needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
