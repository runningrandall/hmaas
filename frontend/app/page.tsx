"use client";

import { useState, useRef, useEffect } from "react";
import Script from "next/script";
import LocationPicker from "../components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // In a real app, this would come from process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  // For this template, we might need to ask the user or use a placeholder
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    // If no API key is present in env, we might want to prompt or show error?
    // For now we assume it's there or user will provide it.
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API Key is missing!");
    }
  }, [GOOGLE_MAPS_API_KEY]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const getUploadUrl = async (contentType: string) => {
    // Determine the base URL. If API_URL is set, use it.
    // Otherwise, assume relative path if checking against a local proxy, 
    // or arguably we need the absolute URL if it is on a different domain.
    // Given usage plan, we likely need the full URL.

    // For now, if API_URL is missing, we can't proceed really.
    const baseUrl = API_URL;

    const res = await fetch(`${baseUrl}/upload-url?contentType=${encodeURIComponent(contentType)}`);
    if (!res.ok) throw new Error("Failed to get upload URL");
    return res.json();
  };

  const uploadImage = async (url: string, file: File) => {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    if (!res.ok) throw new Error("Failed to upload image");
  };

  const createReport = async (name: string, contact: string, location: { lat: number; lng: number }, imageKey: string) => {
    const baseUrl = API_URL;
    const res = await fetch(`${baseUrl}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        contact,
        location,
        imageKey,
      }),
    });
    if (!res.ok) throw new Error("Failed to create report");
    return res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location || !imageFile) {
      alert("Please fill in all required fields (Name, Location, Photo)");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get Upload URL
      const { uploadUrl, key } = await getUploadUrl(imageFile.type);

      // 2. Upload Image
      await uploadImage(uploadUrl, imageFile);

      // 3. Submit Report
      await createReport(name, contact, location, key);

      setSuccess(true);
      setName("");
      setContact("");
      setLocation(null);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      alert("Failed to submit report. Please try again. Ensure API URL is configured.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Report Submitted!</CardTitle>
            <CardDescription>Thank you for reporting the concern.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setSuccess(false)}>
              Submit Another Report
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50 flex flex-col items-center">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="afterInteractive"
      />

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>S&L Storm Water Reporting</CardTitle>
          <CardDescription>Report a concern by filling out the form below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Info (Optional)</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Phone or Email"
              />
            </div>

            <div className="space-y-2">
              <Label>Photo *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                required
              />
              {imageFile && <p className="text-sm text-gray-500">Selected: {imageFile.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Location *</Label>
              {GOOGLE_MAPS_API_KEY ? (
                <LocationPicker onLocationSelect={setLocation} initialLocation={location || undefined} />
              ) : (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded text-sm">
                  Google Maps API Key missing. Please configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
                </div>
              )}
              {location && (
                <p className="text-xs text-gray-500">
                  Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} S&L Construction
      </div>
    </div>
  );
}
