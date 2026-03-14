"use client";

import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Check } from 'lucide-react';

const SERVICES = [
  { id: 'window-cleaning', name: "Window Cleaning" },
  { id: 'lawn-mow', name: "Lawn Mow & Trim" },
  { id: 'lawn-aeration', name: "Lawn Aeration" },
  { id: 'lawn-fertilizer', name: "Lawn Fertilizer" },
  { id: 'sprinkler-winterization', name: "Sprinkler Winterization" },
  { id: 'shrub-pruning', name: "Shrub Pruning" },
  { id: 'gutter-cleaning', name: "Gutter Cleaning" },
  { id: 'garbage-bin', name: "Garbage Bin Cleaning" },
  { id: 'leaf-removal', name: "Leaf Removal" },
  { id: 'driveway-wash', name: "Driveway/Deck Wash" },
];

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedServices?: Set<string>;
}

const inputClass = "w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-50";

export default function ContactModal({ isOpen, onClose, selectedServices: initialServices }: ContactModalProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [services, setServices] = useState<Set<string>>(() => new Set(initialServices));

  if (!isOpen) return null;

  const toggleService = (id: string) => {
    const next = new Set(services);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setServices(next);
  };

  const needsField = (...ids: string[]) => ids.some((id) => services.has(id));

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");

    const formData = new FormData(event.currentTarget);
    formData.append("access_key", "85cd55e9-38eb-4142-9964-b06fa1710389");
    formData.append("subject", "New Quote Request from Versa");
    formData.append("from_name", "Versa Website");

    // Add selected services as a readable list
    const selectedNames = SERVICES.filter((s) => services.has(s.id)).map((s) => s.name);
    formData.append("services_requested", selectedNames.join(", ") || "None selected");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-background rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0">
          <h3 className="text-xl font-bold text-foreground">Get a Free Quote</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-bold">Quote Request Sent!</h4>
              <p className="text-muted-foreground">
                Thank you! We&apos;ll review your property details and get back to you with a custom quote shortly.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:bg-secondary/80 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Contact Info */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name</label>
                    <input type="text" id="name" name="name" required disabled={status === "loading"} className={inputClass} placeholder="John Doe" />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">Email</label>
                    <input type="email" id="email" name="email" required disabled={status === "loading"} className={inputClass} placeholder="john@example.com" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">Phone</label>
                    <input type="tel" id="phone" name="phone" disabled={status === "loading"} className={inputClass} placeholder="(801) 555-1234" />
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-foreground mb-1">Property Address</label>
                    <input type="text" id="address" name="address" disabled={status === "loading"} className={inputClass} placeholder="123 Main St, Draper, UT" />
                  </div>
                </div>
              </div>

              {/* Services */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Services Interested In</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICES.map((service) => {
                    const isSelected = services.has(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-foreground font-medium'
                            : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        <div className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="leading-tight">{service.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Property Details — shown based on selected services */}
              {services.size > 0 && (
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Property Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {needsField('lawn-mow', 'lawn-aeration', 'lawn-fertilizer', 'leaf-removal') && (
                      <div>
                        <label htmlFor="lot_size" className="block text-sm font-medium text-foreground mb-1">Lot Size (acres)</label>
                        <input type="number" id="lot_size" name="lot_size" step="0.05" min="0" disabled={status === "loading"} className={inputClass} placeholder="0.25" />
                      </div>
                    )}
                    {needsField('window-cleaning') && (
                      <div>
                        <label htmlFor="num_windows" className="block text-sm font-medium text-foreground mb-1">Number of Windows</label>
                        <input type="number" id="num_windows" name="num_windows" min="0" disabled={status === "loading"} className={inputClass} placeholder="20" />
                      </div>
                    )}
                    {needsField('sprinkler-winterization') && (
                      <div>
                        <label htmlFor="sprinkler_zones" className="block text-sm font-medium text-foreground mb-1">Sprinkler Zones</label>
                        <input type="number" id="sprinkler_zones" name="sprinkler_zones" min="0" disabled={status === "loading"} className={inputClass} placeholder="6" />
                      </div>
                    )}
                    {needsField('shrub-pruning') && (
                      <div>
                        <label htmlFor="num_shrubs" className="block text-sm font-medium text-foreground mb-1">Number of Shrubs</label>
                        <input type="number" id="num_shrubs" name="num_shrubs" min="0" disabled={status === "loading"} className={inputClass} placeholder="15" />
                      </div>
                    )}
                    {needsField('gutter-cleaning') && (
                      <div>
                        <label htmlFor="gutter_linear_ft" className="block text-sm font-medium text-foreground mb-1">Gutter Length (linear ft)</label>
                        <input type="number" id="gutter_linear_ft" name="gutter_linear_ft" min="0" disabled={status === "loading"} className={inputClass} placeholder="150" />
                      </div>
                    )}
                    {needsField('garbage-bin') && (
                      <div>
                        <label htmlFor="num_bins" className="block text-sm font-medium text-foreground mb-1">Number of Bins</label>
                        <input type="number" id="num_bins" name="num_bins" min="0" disabled={status === "loading"} className={inputClass} placeholder="3" />
                      </div>
                    )}
                    {needsField('driveway-wash') && (
                      <div>
                        <label htmlFor="driveway_sqft" className="block text-sm font-medium text-foreground mb-1">Driveway/Deck Area (sq ft)</label>
                        <input type="number" id="driveway_sqft" name="driveway_sqft" min="0" disabled={status === "loading"} className={inputClass} placeholder="800" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">Additional Notes</label>
                <textarea
                  id="message"
                  name="message"
                  disabled={status === "loading"}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Anything else we should know about your property?"
                ></textarea>
              </div>

              {status === "error" && (
                <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>There was an error sending your request. Please try again.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Request Quote"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
