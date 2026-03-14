#!/usr/bin/env node

/**
 * Comprehensive local database seeder.
 *
 * Uses the compiled ElectroDB entities (backend/dist) to create seed data,
 * so all DynamoDB keys, GSIs, and entity metadata are generated automatically.
 *
 * Requires: backend built (`pnpm --filter backend run build`) and .env loaded.
 *
 * Idempotent — uses ElectroDB `put` so re-running overwrites existing items.
 */

const path = require('path');
const fs = require('fs');
const { DynamoDBClient, DeleteTableCommand, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

// ── Load .env ────────────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

// Force local DynamoDB — always use localhost since this script runs on the host
process.env.TABLE_NAME = process.env.TABLE_NAME || 'versa-table';
process.env.LOCAL_DYNAMODB_ENDPOINT = 'http://localhost:8000';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';

// ── Import compiled ElectroDB entities ───────────────────────────────────────
const DIST = path.resolve(__dirname, '..', 'backend', 'dist');

let DBService;
try {
  DBService = require(path.join(DIST, 'entities', 'service')).DBService;
} catch (err) {
  console.error('Failed to load compiled backend. Run `pnpm --filter backend run build` first.');
  console.error(err.message);
  process.exit(1);
}

const ORG_ID = 'versa-default';

// ═══════════════════════════════════════════════════════════════════════════════
//  SEED DATA
// ═══════════════════════════════════════════════════════════════════════════════

// ── Organization ─────────────────────────────────────────────────────────────

const organization = {
  organizationId: ORG_ID,
  name: 'Versa Property Management',
  slug: 'versa',
  status: 'active',
  ownerUserId: 'system',
  billingEmail: 'admin@versapm.com',
  phone: '303-555-0100',
  address: '1000 Main St',
  city: 'Denver',
  state: 'CO',
  zip: '80202',
  timezone: 'America/Denver',
};

// ── Property Types ───────────────────────────────────────────────────────────

const propertyTypes = [
  { organizationId: ORG_ID, propertyTypeId: 'residential', name: 'Residential', description: 'Single-family residential property' },
  { organizationId: ORG_ID, propertyTypeId: 'commercial', name: 'Commercial', description: 'Commercial business property' },
  { organizationId: ORG_ID, propertyTypeId: 'multi-family', name: 'Multi-Family', description: 'Multi-unit residential property (duplex, triplex, apartment)' },
  { organizationId: ORG_ID, propertyTypeId: 'hoa', name: 'HOA Common Area', description: 'Homeowners association shared grounds and facilities' },
  { organizationId: ORG_ID, propertyTypeId: 'vacant-lot', name: 'Vacant Lot', description: 'Undeveloped or vacant land parcel' },
];

// ── Categories ───────────────────────────────────────────────────────────────

const categories = [
  { organizationId: ORG_ID, categoryId: 'cat-lawn', name: 'Lawn & Landscape', description: 'Lawn care and landscaping services' },
  { organizationId: ORG_ID, categoryId: 'cat-exterior', name: 'Exterior Cleaning', description: 'Gutters, windows, pressure washing' },
  { organizationId: ORG_ID, categoryId: 'cat-pest', name: 'Pest Control', description: 'Pest prevention and elimination' },
  { organizationId: ORG_ID, categoryId: 'cat-seasonal', name: 'Seasonal', description: 'Winterizing, spring startup, holiday lighting' },
  { organizationId: ORG_ID, categoryId: 'cat-irrigation', name: 'Irrigation', description: 'Sprinkler systems and water management' },
  { organizationId: ORG_ID, categoryId: 'cat-hardscape', name: 'Hardscape', description: 'Driveways, patios, retaining walls' },
];

// ── Service Types ────────────────────────────────────────────────────────────

const serviceTypes = [
  // Lawn & Landscape (measurement-based)
  {
    organizationId: ORG_ID, serviceTypeId: 'st-lawn-mowing', name: 'Lawn Mowing',
    description: 'Regular lawn mowing, trimming, and edging',
    basePrice: 2000, unit: 'per_sqft', estimatedDuration: 30, frequency: 'biweekly',
    measurementKey: 'lawnSqft', measurementUnit: 'sq ft', ratePerUnit: 5, durationPerUnit: 0.5,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-fertilizer', name: 'Fertilizer Application',
    description: 'Seasonal fertilizer treatment for healthy lawns',
    basePrice: 3000, unit: 'per_sqft', estimatedDuration: 20, frequency: 'quarterly',
    measurementKey: 'lawnSqft', measurementUnit: 'sq ft', ratePerUnit: 3, durationPerUnit: 0.2,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-aeration', name: 'Lawn Aeration',
    description: 'Core aeration to improve soil health and root growth',
    basePrice: 4000, unit: 'per_sqft', estimatedDuration: 45, frequency: 'annually',
    measurementKey: 'lawnSqft', measurementUnit: 'sq ft', ratePerUnit: 4, durationPerUnit: 0.3,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-weed-control', name: 'Weed Control',
    description: 'Pre-emergent and post-emergent weed treatment',
    basePrice: 2500, unit: 'per_sqft', estimatedDuration: 25, frequency: 'quarterly',
    measurementKey: 'lawnSqft', measurementUnit: 'sq ft', ratePerUnit: 2, durationPerUnit: 0.15,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-hedge-trimming', name: 'Hedge & Shrub Trimming',
    description: 'Trim and shape hedges, shrubs, and ornamental plants',
    basePrice: 5000, unit: 'per_unit', estimatedDuration: 15, frequency: 'monthly',
    measurementKey: 'hedgeCount', measurementUnit: 'hedges', ratePerUnit: 1500, durationPerUnit: 10,
  },
  // Exterior Cleaning (measurement-based)
  {
    organizationId: ORG_ID, serviceTypeId: 'st-gutter-cleaning', name: 'Gutter Cleaning',
    description: 'Clean and flush gutters and downspouts',
    basePrice: 5000, unit: 'per_linear_foot', estimatedDuration: 30, frequency: 'annually',
    measurementKey: 'gutterLinearFeet', measurementUnit: 'linear feet', ratePerUnit: 50, durationPerUnit: 0.5,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-window-cleaning', name: 'Window Cleaning',
    description: 'Interior and exterior window cleaning',
    basePrice: 0, unit: 'per_unit', estimatedDuration: 10, frequency: 'quarterly',
    measurementKey: 'windowCount', measurementUnit: 'windows', ratePerUnit: 800, durationPerUnit: 5,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-pressure-washing', name: 'Pressure Washing',
    description: 'High-pressure cleaning for driveways, patios, and siding',
    basePrice: 5000, unit: 'per_sqft', estimatedDuration: 30, frequency: 'annually',
    measurementKey: 'drivewaySqft', measurementUnit: 'sq ft', ratePerUnit: 15, durationPerUnit: 0.4,
  },
  // Pest Control (flat rate)
  {
    organizationId: ORG_ID, serviceTypeId: 'st-pest-control', name: 'General Pest Control',
    description: 'General pest prevention and elimination (ants, spiders, roaches)',
    basePrice: 7500, unit: 'per_visit', estimatedDuration: 45, frequency: 'quarterly',
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-mosquito', name: 'Mosquito Treatment',
    description: 'Yard mosquito barrier spray treatment',
    basePrice: 6500, unit: 'per_visit', estimatedDuration: 30, frequency: 'monthly',
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-rodent', name: 'Rodent Control',
    description: 'Rodent inspection, baiting, and exclusion',
    basePrice: 12000, unit: 'per_visit', estimatedDuration: 60, frequency: 'quarterly',
  },
  // Irrigation (flat rate)
  {
    organizationId: ORG_ID, serviceTypeId: 'st-sprinkler', name: 'Sprinkler Maintenance',
    description: 'Sprinkler system inspection, repair, and adjustment',
    basePrice: 8500, unit: 'per_visit', estimatedDuration: 60, frequency: 'annually',
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-sprinkler-blowout', name: 'Sprinkler Winterization',
    description: 'Compressed-air blowout of irrigation lines for winter',
    basePrice: 9500, unit: 'per_visit', estimatedDuration: 45, frequency: 'annually',
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-sprinkler-startup', name: 'Sprinkler Spring Startup',
    description: 'Turn on irrigation system, check heads, and program controller',
    basePrice: 7500, unit: 'per_visit', estimatedDuration: 45, frequency: 'annually',
  },
  // Seasonal (flat rate)
  {
    organizationId: ORG_ID, serviceTypeId: 'st-winterizing', name: 'Full Winterizing',
    description: 'Prepare irrigation, exterior plumbing, and landscaping for winter',
    basePrice: 15000, unit: 'per_visit', estimatedDuration: 120, frequency: 'annually',
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-snow-removal', name: 'Snow Removal',
    description: 'Driveway and walkway snow removal after storms',
    basePrice: 3000, unit: 'per_sqft', estimatedDuration: 30, frequency: 'one_time',
    measurementKey: 'drivewaySqft', measurementUnit: 'sq ft', ratePerUnit: 10, durationPerUnit: 0.3,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-leaf-removal', name: 'Leaf Removal',
    description: 'Fall leaf cleanup, blowing, and hauling',
    basePrice: 3500, unit: 'per_sqft', estimatedDuration: 45, frequency: 'annually',
    measurementKey: 'lawnSqft', measurementUnit: 'sq ft', ratePerUnit: 3, durationPerUnit: 0.25,
  },
  {
    organizationId: ORG_ID, serviceTypeId: 'st-holiday-lights', name: 'Holiday Light Installation',
    description: 'Install, maintain, and remove holiday lighting displays',
    basePrice: 20000, unit: 'per_linear_foot', estimatedDuration: 60, frequency: 'annually',
    measurementKey: 'rooflineLinearFeet', measurementUnit: 'linear feet', ratePerUnit: 200, durationPerUnit: 1,
  },
];

// ── Cost Types ───────────────────────────────────────────────────────────────

const costTypes = [
  { organizationId: ORG_ID, costTypeId: 'labor', name: 'Labor', description: 'Employee labor costs' },
  { organizationId: ORG_ID, costTypeId: 'materials', name: 'Materials', description: 'Chemicals, fertilizer, supplies' },
  { organizationId: ORG_ID, costTypeId: 'equipment', name: 'Equipment', description: 'Equipment rental or wear costs' },
  { organizationId: ORG_ID, costTypeId: 'disposal', name: 'Disposal', description: 'Waste removal and dump fees' },
  { organizationId: ORG_ID, costTypeId: 'fuel', name: 'Fuel', description: 'Vehicle and equipment fuel' },
  { organizationId: ORG_ID, costTypeId: 'subcontractor', name: 'Subcontractor', description: 'Third-party subcontractor costs' },
];

// ── Customers ────────────────────────────────────────────────────────────────

const customers = [
  {
    organizationId: ORG_ID, customerId: 'cust-johnson', firstName: 'Robert', lastName: 'Johnson',
    email: 'robert.johnson@example.com', phone: '303-555-0101', status: 'active',
    notes: 'Preferred customer since 2020. Large corner lot, likes early morning service.',
  },
  {
    organizationId: ORG_ID, customerId: 'cust-martinez', firstName: 'Maria', lastName: 'Martinez',
    email: 'maria.martinez@example.com', phone: '303-555-0102', status: 'active',
    notes: 'Owns two properties. Prefers morning service windows. Pays on time.',
  },
  {
    organizationId: ORG_ID, customerId: 'cust-chen', firstName: 'David', lastName: 'Chen',
    email: 'david.chen@example.com', phone: '303-555-0103', status: 'active',
    notes: 'Commercial client — office park. Net-30 billing, always pays promptly.',
  },
  {
    organizationId: ORG_ID, customerId: 'cust-patel', firstName: 'Priya', lastName: 'Patel',
    email: 'priya.patel@example.com', phone: '303-555-0104', status: 'active',
    notes: 'New customer as of January 2026. Interested in premium bundle.',
  },
  {
    organizationId: ORG_ID, customerId: 'cust-nguyen', firstName: 'Thanh', lastName: 'Nguyen',
    email: 'thanh.nguyen@example.com', phone: '303-555-0105', status: 'active',
    notes: 'Multi-family property owner. Manages 3 units. Delegate access for property manager.',
  },
  {
    organizationId: ORG_ID, customerId: 'cust-oconnor', firstName: 'Sean', lastName: "O'Connor",
    email: 'sean.oconnor@example.com', phone: '303-555-0106', status: 'active',
    notes: 'HOA board president — manages common area contract for Willow Creek HOA.',
  },
  {
    organizationId: ORG_ID, customerId: 'cust-brooks', firstName: 'Angela', lastName: 'Brooks',
    email: 'angela.brooks@example.com', phone: '303-555-0107', status: 'active',
    notes: 'Two residential properties. Very detail-oriented, appreciates photo confirmations.',
  },
  {
    organizationId: ORG_ID, customerId: 'cust-kim', firstName: 'Soo-Jin', lastName: 'Kim',
    email: 'soojin.kim@example.com', phone: '303-555-0108', status: 'inactive',
    notes: 'Seasonal customer — only uses snow removal and winterizing. Inactive in summer.',
  },
];

// ── Accounts ─────────────────────────────────────────────────────────────────

const accounts = [
  { organizationId: ORG_ID, accountId: 'acct-johnson', customerId: 'cust-johnson', status: 'active', billingEmail: 'robert.johnson@example.com' },
  { organizationId: ORG_ID, accountId: 'acct-martinez', customerId: 'cust-martinez', status: 'active', billingEmail: 'maria.martinez@example.com' },
  { organizationId: ORG_ID, accountId: 'acct-chen', customerId: 'cust-chen', status: 'active', billingEmail: 'billing@chenofficepark.com' },
  { organizationId: ORG_ID, accountId: 'acct-patel', customerId: 'cust-patel', status: 'active', billingEmail: 'priya.patel@example.com' },
  { organizationId: ORG_ID, accountId: 'acct-nguyen', customerId: 'cust-nguyen', status: 'active', billingEmail: 'thanh.nguyen@example.com' },
  { organizationId: ORG_ID, accountId: 'acct-oconnor', customerId: 'cust-oconnor', status: 'active', billingEmail: 'hoa@willowcreekhoa.com' },
  { organizationId: ORG_ID, accountId: 'acct-brooks', customerId: 'cust-brooks', status: 'active', billingEmail: 'angela.brooks@example.com' },
  { organizationId: ORG_ID, accountId: 'acct-kim', customerId: 'cust-kim', status: 'active', billingEmail: 'soojin.kim@example.com' },
];

// ── Delegates ────────────────────────────────────────────────────────────────

const delegates = [
  {
    organizationId: ORG_ID, delegateId: 'del-nguyen-pm', accountId: 'acct-nguyen',
    email: 'lisa.tran@example.com', name: 'Lisa Tran',
    permissions: ['view_invoices', 'view_schedules', 'approve_estimates'], status: 'active',
  },
  {
    organizationId: ORG_ID, delegateId: 'del-chen-assistant', accountId: 'acct-chen',
    email: 'kevin.wu@chenofficepark.com', name: 'Kevin Wu',
    permissions: ['view_invoices', 'view_schedules', 'manage_services'], status: 'active',
  },
  {
    organizationId: ORG_ID, delegateId: 'del-oconnor-board', accountId: 'acct-oconnor',
    email: 'board@willowcreekhoa.com', name: 'HOA Board',
    permissions: ['view_invoices', 'approve_estimates'], status: 'active',
  },
];

// ── Properties ───────────────────────────────────────────────────────────────

const properties = [
  // Johnson — 1 large residential
  {
    organizationId: ORG_ID, propertyId: 'prop-johnson-main', customerId: 'cust-johnson',
    propertyTypeId: 'residential', name: 'Johnson Residence',
    address: '456 Oak Ave', city: 'Denver', state: 'CO', zip: '80203',
    lat: 39.7294, lng: -104.9814, lotSize: 8500, status: 'active',
    measurements: { lawnSqft: 6000, gutterLinearFeet: 180, windowCount: 16, drivewaySqft: 400, hedgeCount: 8, rooflineLinearFeet: 200 },
  },
  // Martinez — 2 properties (primary + rental)
  {
    organizationId: ORG_ID, propertyId: 'prop-martinez-home', customerId: 'cust-martinez',
    propertyTypeId: 'residential', name: 'Martinez Home',
    address: '789 Pine St', city: 'Denver', state: 'CO', zip: '80204',
    lat: 39.7350, lng: -104.9950, lotSize: 5200, status: 'active',
    measurements: { lawnSqft: 4000, gutterLinearFeet: 120, windowCount: 12, drivewaySqft: 300, hedgeCount: 4, rooflineLinearFeet: 140 },
  },
  {
    organizationId: ORG_ID, propertyId: 'prop-martinez-rental', customerId: 'cust-martinez',
    propertyTypeId: 'residential', name: 'Martinez Rental',
    address: '321 Elm Dr', city: 'Lakewood', state: 'CO', zip: '80226',
    lat: 39.7075, lng: -105.0811, lotSize: 4000, status: 'active',
    measurements: { lawnSqft: 3000, gutterLinearFeet: 100, windowCount: 8, drivewaySqft: 250, hedgeCount: 2, rooflineLinearFeet: 110 },
  },
  // Chen — commercial office park
  {
    organizationId: ORG_ID, propertyId: 'prop-chen-office', customerId: 'cust-chen',
    propertyTypeId: 'commercial', name: 'Chen Office Park',
    address: '1500 Corporate Blvd', city: 'Aurora', state: 'CO', zip: '80012',
    lat: 39.7088, lng: -104.8207, lotSize: 25000, status: 'active',
    measurements: { lawnSqft: 15000, gutterLinearFeet: 400, windowCount: 60, drivewaySqft: 3000, hedgeCount: 24, rooflineLinearFeet: 500 },
  },
  // Patel — medium residential
  {
    organizationId: ORG_ID, propertyId: 'prop-patel-home', customerId: 'cust-patel',
    propertyTypeId: 'residential', name: 'Patel Residence',
    address: '1122 Maple Ct', city: 'Centennial', state: 'CO', zip: '80112',
    lat: 39.5961, lng: -104.8690, lotSize: 7200, status: 'active',
    measurements: { lawnSqft: 5500, gutterLinearFeet: 160, windowCount: 14, drivewaySqft: 500, hedgeCount: 6, rooflineLinearFeet: 180 },
  },
  // Nguyen — multi-family triplex
  {
    organizationId: ORG_ID, propertyId: 'prop-nguyen-triplex', customerId: 'cust-nguyen',
    propertyTypeId: 'multi-family', name: 'Nguyen Triplex',
    address: '900 Birch Ln', city: 'Westminster', state: 'CO', zip: '80031',
    lat: 39.8366, lng: -105.0372, lotSize: 6500, status: 'active',
    measurements: { lawnSqft: 4500, gutterLinearFeet: 200, windowCount: 24, drivewaySqft: 600, hedgeCount: 6, rooflineLinearFeet: 220 },
  },
  // O'Connor — HOA common area
  {
    organizationId: ORG_ID, propertyId: 'prop-oconnor-hoa', customerId: 'cust-oconnor',
    propertyTypeId: 'hoa', name: 'Willow Creek HOA Common Area',
    address: '2000 Willow Creek Dr', city: 'Highlands Ranch', state: 'CO', zip: '80129',
    lat: 39.5519, lng: -104.9688, lotSize: 45000, status: 'active',
    measurements: { lawnSqft: 30000, gutterLinearFeet: 0, windowCount: 0, drivewaySqft: 5000, hedgeCount: 40, rooflineLinearFeet: 0 },
  },
  // Brooks — 2 residential properties
  {
    organizationId: ORG_ID, propertyId: 'prop-brooks-main', customerId: 'cust-brooks',
    propertyTypeId: 'residential', name: 'Brooks Family Home',
    address: '567 Aspen Way', city: 'Littleton', state: 'CO', zip: '80120',
    lat: 39.6133, lng: -105.0166, lotSize: 9000, status: 'active',
    measurements: { lawnSqft: 7000, gutterLinearFeet: 200, windowCount: 18, drivewaySqft: 450, hedgeCount: 10, rooflineLinearFeet: 220 },
  },
  {
    organizationId: ORG_ID, propertyId: 'prop-brooks-cabin', customerId: 'cust-brooks',
    propertyTypeId: 'residential', name: 'Brooks Mountain Cabin',
    address: '42 Ridge Rd', city: 'Evergreen', state: 'CO', zip: '80439',
    lat: 39.6330, lng: -105.3173, lotSize: 15000, status: 'active',
    measurements: { lawnSqft: 2000, gutterLinearFeet: 80, windowCount: 10, drivewaySqft: 800, hedgeCount: 0, rooflineLinearFeet: 100 },
  },
  // Kim — seasonal-only property
  {
    organizationId: ORG_ID, propertyId: 'prop-kim-home', customerId: 'cust-kim',
    propertyTypeId: 'residential', name: 'Kim Residence',
    address: '1800 Spruce St', city: 'Boulder', state: 'CO', zip: '80302',
    lat: 40.0150, lng: -105.2705, lotSize: 6000, status: 'active',
    measurements: { lawnSqft: 4200, gutterLinearFeet: 140, windowCount: 12, drivewaySqft: 500, hedgeCount: 4, rooflineLinearFeet: 160 },
  },
];

// ── Plans ────────────────────────────────────────────────────────────────────

const plans = [
  {
    organizationId: ORG_ID, planId: 'plan-basic', name: 'Basic',
    description: 'Lawn mowing only — biweekly during growing season',
    monthlyPrice: 4900, annualPrice: 49900, status: 'active',
  },
  {
    organizationId: ORG_ID, planId: 'plan-essential', name: 'Essential',
    description: 'Lawn mowing + pest control — the most popular starter bundle',
    monthlyPrice: 9900, annualPrice: 99900, status: 'active',
  },
  {
    organizationId: ORG_ID, planId: 'plan-premium', name: 'Premium',
    description: 'Full-service: lawn, fertilizer, pest, gutter, and window cleaning',
    monthlyPrice: 19900, annualPrice: 199900, status: 'active',
  },
  {
    organizationId: ORG_ID, planId: 'plan-ultimate', name: 'Ultimate',
    description: 'Everything in Premium plus irrigation, aeration, weed control, and leaf removal',
    monthlyPrice: 29900, annualPrice: 299900, status: 'active',
  },
  {
    organizationId: ORG_ID, planId: 'plan-commercial', name: 'Commercial',
    description: 'Comprehensive commercial property maintenance — weekly service',
    monthlyPrice: 49900, annualPrice: 499900, status: 'active',
  },
  {
    organizationId: ORG_ID, planId: 'plan-hoa', name: 'HOA',
    description: 'Large-acreage HOA common area maintenance',
    monthlyPrice: 89900, annualPrice: 899900, status: 'active',
  },
  {
    organizationId: ORG_ID, planId: 'plan-winter', name: 'Winter Only',
    description: 'Snow removal and winterization package — seasonal',
    monthlyPrice: 14900, annualPrice: 0, status: 'active',
  },
];

// ── Plan Services ────────────────────────────────────────────────────────────

const planServices = [
  // Basic
  { organizationId: ORG_ID, planId: 'plan-basic', serviceTypeId: 'st-lawn-mowing', includedVisits: 26, frequency: 'biweekly' },
  // Essential
  { organizationId: ORG_ID, planId: 'plan-essential', serviceTypeId: 'st-lawn-mowing', includedVisits: 26, frequency: 'biweekly' },
  { organizationId: ORG_ID, planId: 'plan-essential', serviceTypeId: 'st-pest-control', includedVisits: 4, frequency: 'quarterly' },
  // Premium
  { organizationId: ORG_ID, planId: 'plan-premium', serviceTypeId: 'st-lawn-mowing', includedVisits: 26, frequency: 'biweekly' },
  { organizationId: ORG_ID, planId: 'plan-premium', serviceTypeId: 'st-pest-control', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-premium', serviceTypeId: 'st-fertilizer', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-premium', serviceTypeId: 'st-gutter-cleaning', includedVisits: 2, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-premium', serviceTypeId: 'st-window-cleaning', includedVisits: 4, frequency: 'quarterly' },
  // Ultimate
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-lawn-mowing', includedVisits: 26, frequency: 'biweekly' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-pest-control', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-fertilizer', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-gutter-cleaning', includedVisits: 2, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-window-cleaning', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-aeration', includedVisits: 1, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-weed-control', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-sprinkler', includedVisits: 1, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-ultimate', serviceTypeId: 'st-leaf-removal', includedVisits: 1, frequency: 'annually' },
  // Commercial
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-lawn-mowing', includedVisits: 52, frequency: 'weekly' },
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-pest-control', includedVisits: 12, frequency: 'monthly' },
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-fertilizer', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-gutter-cleaning', includedVisits: 2, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-window-cleaning', includedVisits: 12, frequency: 'monthly' },
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-hedge-trimming', includedVisits: 12, frequency: 'monthly' },
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-pressure-washing', includedVisits: 2, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-commercial', serviceTypeId: 'st-snow-removal', includedVisits: 30, frequency: 'one_time' },
  // HOA
  { organizationId: ORG_ID, planId: 'plan-hoa', serviceTypeId: 'st-lawn-mowing', includedVisits: 52, frequency: 'weekly' },
  { organizationId: ORG_ID, planId: 'plan-hoa', serviceTypeId: 'st-fertilizer', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-hoa', serviceTypeId: 'st-weed-control', includedVisits: 4, frequency: 'quarterly' },
  { organizationId: ORG_ID, planId: 'plan-hoa', serviceTypeId: 'st-hedge-trimming', includedVisits: 12, frequency: 'monthly' },
  { organizationId: ORG_ID, planId: 'plan-hoa', serviceTypeId: 'st-aeration', includedVisits: 2, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-hoa', serviceTypeId: 'st-snow-removal', includedVisits: 30, frequency: 'one_time' },
  // Winter Only
  { organizationId: ORG_ID, planId: 'plan-winter', serviceTypeId: 'st-snow-removal', includedVisits: 20, frequency: 'one_time' },
  { organizationId: ORG_ID, planId: 'plan-winter', serviceTypeId: 'st-sprinkler-blowout', includedVisits: 1, frequency: 'annually' },
  { organizationId: ORG_ID, planId: 'plan-winter', serviceTypeId: 'st-winterizing', includedVisits: 1, frequency: 'annually' },
];

// ── Employees ────────────────────────────────────────────────────────────────

const employees = [
  {
    organizationId: ORG_ID, employeeId: 'emp-williams', firstName: 'James', lastName: 'Williams',
    email: 'james.williams@versapm.com', phone: '303-555-0201', role: 'manager', status: 'active', hireDate: '2021-03-15',
  },
  {
    organizationId: ORG_ID, employeeId: 'emp-garcia', firstName: 'Carlos', lastName: 'Garcia',
    email: 'carlos.garcia@versapm.com', phone: '303-555-0202', role: 'servicer', status: 'active', hireDate: '2022-06-01',
  },
  {
    organizationId: ORG_ID, employeeId: 'emp-thompson', firstName: 'Sarah', lastName: 'Thompson',
    email: 'sarah.thompson@versapm.com', phone: '303-555-0203', role: 'servicer', status: 'active', hireDate: '2023-01-10',
  },
  {
    organizationId: ORG_ID, employeeId: 'emp-davis', firstName: 'Marcus', lastName: 'Davis',
    email: 'marcus.davis@versapm.com', phone: '303-555-0204', role: 'servicer', status: 'active', hireDate: '2023-09-01',
  },
  {
    organizationId: ORG_ID, employeeId: 'emp-wilson', firstName: 'Emily', lastName: 'Wilson',
    email: 'emily.wilson@versapm.com', phone: '303-555-0205', role: 'servicer', status: 'active', hireDate: '2024-02-15',
  },
  {
    organizationId: ORG_ID, employeeId: 'emp-reyes', firstName: 'Miguel', lastName: 'Reyes',
    email: 'miguel.reyes@versapm.com', phone: '303-555-0206', role: 'servicer', status: 'active', hireDate: '2024-05-01',
  },
  {
    organizationId: ORG_ID, employeeId: 'emp-taylor', firstName: 'Jessica', lastName: 'Taylor',
    email: 'jessica.taylor@versapm.com', phone: '303-555-0207', role: 'admin', status: 'active', hireDate: '2022-01-03',
  },
  {
    organizationId: ORG_ID, employeeId: 'emp-clark', firstName: 'Brian', lastName: 'Clark',
    email: 'brian.clark@versapm.com', phone: '303-555-0208', role: 'servicer', status: 'inactive', hireDate: '2022-03-01',
  },
];

// ── Servicers ────────────────────────────────────────────────────────────────

const servicers = [
  { organizationId: ORG_ID, servicerId: 'svc-garcia', employeeId: 'emp-garcia', serviceArea: 'Denver Metro', maxDailyJobs: 8, rating: 48, status: 'active' },
  { organizationId: ORG_ID, servicerId: 'svc-thompson', employeeId: 'emp-thompson', serviceArea: 'Denver West', maxDailyJobs: 6, rating: 50, status: 'active' },
  { organizationId: ORG_ID, servicerId: 'svc-davis', employeeId: 'emp-davis', serviceArea: 'South Metro', maxDailyJobs: 7, rating: 46, status: 'active' },
  { organizationId: ORG_ID, servicerId: 'svc-wilson', employeeId: 'emp-wilson', serviceArea: 'Denver East', maxDailyJobs: 6, rating: 49, status: 'active' },
  { organizationId: ORG_ID, servicerId: 'svc-reyes', employeeId: 'emp-reyes', serviceArea: 'North Metro', maxDailyJobs: 8, rating: 47, status: 'active' },
];

// ── Capabilities ─────────────────────────────────────────────────────────────

const capabilities = [
  // Garcia — lawn, pest, gutter expert
  { organizationId: ORG_ID, capabilityId: 'cap-garcia-lawn', employeeId: 'emp-garcia', serviceTypeId: 'st-lawn-mowing', level: 'expert', certificationDate: '2022-06-15' },
  { organizationId: ORG_ID, capabilityId: 'cap-garcia-pest', employeeId: 'emp-garcia', serviceTypeId: 'st-pest-control', level: 'expert', certificationDate: '2022-08-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-garcia-gutter', employeeId: 'emp-garcia', serviceTypeId: 'st-gutter-cleaning', level: 'expert', certificationDate: '2023-03-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-garcia-fert', employeeId: 'emp-garcia', serviceTypeId: 'st-fertilizer', level: 'intermediate', certificationDate: '2023-05-01' },
  // Thompson — windows, fertilizer, aeration
  { organizationId: ORG_ID, capabilityId: 'cap-thompson-lawn', employeeId: 'emp-thompson', serviceTypeId: 'st-lawn-mowing', level: 'intermediate', certificationDate: '2023-02-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-thompson-window', employeeId: 'emp-thompson', serviceTypeId: 'st-window-cleaning', level: 'expert', certificationDate: '2023-02-15' },
  { organizationId: ORG_ID, capabilityId: 'cap-thompson-fert', employeeId: 'emp-thompson', serviceTypeId: 'st-fertilizer', level: 'intermediate', certificationDate: '2023-04-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-thompson-aeration', employeeId: 'emp-thompson', serviceTypeId: 'st-aeration', level: 'expert', certificationDate: '2023-06-01' },
  // Davis — irrigation specialist
  { organizationId: ORG_ID, capabilityId: 'cap-davis-lawn', employeeId: 'emp-davis', serviceTypeId: 'st-lawn-mowing', level: 'intermediate', certificationDate: '2023-10-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-davis-sprinkler', employeeId: 'emp-davis', serviceTypeId: 'st-sprinkler', level: 'expert', certificationDate: '2023-11-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-davis-blowout', employeeId: 'emp-davis', serviceTypeId: 'st-sprinkler-blowout', level: 'expert', certificationDate: '2023-11-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-davis-startup', employeeId: 'emp-davis', serviceTypeId: 'st-sprinkler-startup', level: 'expert', certificationDate: '2023-11-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-davis-winter', employeeId: 'emp-davis', serviceTypeId: 'st-winterizing', level: 'expert', certificationDate: '2023-11-15' },
  // Wilson — pest + exterior
  { organizationId: ORG_ID, capabilityId: 'cap-wilson-lawn', employeeId: 'emp-wilson', serviceTypeId: 'st-lawn-mowing', level: 'intermediate', certificationDate: '2024-03-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-wilson-pest', employeeId: 'emp-wilson', serviceTypeId: 'st-pest-control', level: 'intermediate', certificationDate: '2024-04-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-wilson-mosquito', employeeId: 'emp-wilson', serviceTypeId: 'st-mosquito', level: 'expert', certificationDate: '2024-04-15' },
  { organizationId: ORG_ID, capabilityId: 'cap-wilson-pressure', employeeId: 'emp-wilson', serviceTypeId: 'st-pressure-washing', level: 'expert', certificationDate: '2024-05-01' },
  // Reyes — all-rounder
  { organizationId: ORG_ID, capabilityId: 'cap-reyes-lawn', employeeId: 'emp-reyes', serviceTypeId: 'st-lawn-mowing', level: 'expert', certificationDate: '2024-06-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-reyes-hedge', employeeId: 'emp-reyes', serviceTypeId: 'st-hedge-trimming', level: 'expert', certificationDate: '2024-06-15' },
  { organizationId: ORG_ID, capabilityId: 'cap-reyes-snow', employeeId: 'emp-reyes', serviceTypeId: 'st-snow-removal', level: 'expert', certificationDate: '2024-11-01' },
  { organizationId: ORG_ID, capabilityId: 'cap-reyes-leaf', employeeId: 'emp-reyes', serviceTypeId: 'st-leaf-removal', level: 'intermediate', certificationDate: '2024-09-01' },
];

// ── Property Services ────────────────────────────────────────────────────────

const propertyServices = [
  // Johnson — Premium plan
  { organizationId: ORG_ID, serviceId: 'ps-johnson-lawn', propertyId: 'prop-johnson-main', serviceTypeId: 'st-lawn-mowing', planId: 'plan-premium', status: 'active', startDate: '2024-03-01', frequency: 'biweekly' },
  { organizationId: ORG_ID, serviceId: 'ps-johnson-pest', propertyId: 'prop-johnson-main', serviceTypeId: 'st-pest-control', planId: 'plan-premium', status: 'active', startDate: '2024-03-01', frequency: 'quarterly' },
  { organizationId: ORG_ID, serviceId: 'ps-johnson-fert', propertyId: 'prop-johnson-main', serviceTypeId: 'st-fertilizer', planId: 'plan-premium', status: 'active', startDate: '2024-03-01', frequency: 'quarterly' },
  { organizationId: ORG_ID, serviceId: 'ps-johnson-gutter', propertyId: 'prop-johnson-main', serviceTypeId: 'st-gutter-cleaning', planId: 'plan-premium', status: 'active', startDate: '2024-03-01', frequency: 'annually' },
  { organizationId: ORG_ID, serviceId: 'ps-johnson-window', propertyId: 'prop-johnson-main', serviceTypeId: 'st-window-cleaning', planId: 'plan-premium', status: 'active', startDate: '2024-03-01', frequency: 'quarterly' },
  // Martinez home — Essential plan
  { organizationId: ORG_ID, serviceId: 'ps-martinez-lawn', propertyId: 'prop-martinez-home', serviceTypeId: 'st-lawn-mowing', planId: 'plan-essential', status: 'active', startDate: '2024-04-01', frequency: 'biweekly' },
  { organizationId: ORG_ID, serviceId: 'ps-martinez-pest', propertyId: 'prop-martinez-home', serviceTypeId: 'st-pest-control', planId: 'plan-essential', status: 'active', startDate: '2024-04-01', frequency: 'quarterly' },
  // Chen — Commercial plan
  { organizationId: ORG_ID, serviceId: 'ps-chen-lawn', propertyId: 'prop-chen-office', serviceTypeId: 'st-lawn-mowing', planId: 'plan-commercial', status: 'active', startDate: '2024-01-15', frequency: 'weekly' },
  { organizationId: ORG_ID, serviceId: 'ps-chen-pest', propertyId: 'prop-chen-office', serviceTypeId: 'st-pest-control', planId: 'plan-commercial', status: 'active', startDate: '2024-01-15', frequency: 'monthly' },
  { organizationId: ORG_ID, serviceId: 'ps-chen-window', propertyId: 'prop-chen-office', serviceTypeId: 'st-window-cleaning', planId: 'plan-commercial', status: 'active', startDate: '2024-01-15', frequency: 'monthly' },
  { organizationId: ORG_ID, serviceId: 'ps-chen-hedge', propertyId: 'prop-chen-office', serviceTypeId: 'st-hedge-trimming', planId: 'plan-commercial', status: 'active', startDate: '2024-01-15', frequency: 'monthly' },
  // Patel — Ultimate plan
  { organizationId: ORG_ID, serviceId: 'ps-patel-lawn', propertyId: 'prop-patel-home', serviceTypeId: 'st-lawn-mowing', planId: 'plan-ultimate', status: 'active', startDate: '2026-01-15', frequency: 'biweekly' },
  { organizationId: ORG_ID, serviceId: 'ps-patel-pest', propertyId: 'prop-patel-home', serviceTypeId: 'st-pest-control', planId: 'plan-ultimate', status: 'active', startDate: '2026-01-15', frequency: 'quarterly' },
  { organizationId: ORG_ID, serviceId: 'ps-patel-fert', propertyId: 'prop-patel-home', serviceTypeId: 'st-fertilizer', planId: 'plan-ultimate', status: 'active', startDate: '2026-01-15', frequency: 'quarterly' },
  // O'Connor HOA
  { organizationId: ORG_ID, serviceId: 'ps-hoa-lawn', propertyId: 'prop-oconnor-hoa', serviceTypeId: 'st-lawn-mowing', planId: 'plan-hoa', status: 'active', startDate: '2025-01-01', frequency: 'weekly' },
  { organizationId: ORG_ID, serviceId: 'ps-hoa-hedge', propertyId: 'prop-oconnor-hoa', serviceTypeId: 'st-hedge-trimming', planId: 'plan-hoa', status: 'active', startDate: '2025-01-01', frequency: 'monthly' },
  { organizationId: ORG_ID, serviceId: 'ps-hoa-weed', propertyId: 'prop-oconnor-hoa', serviceTypeId: 'st-weed-control', planId: 'plan-hoa', status: 'active', startDate: '2025-01-01', frequency: 'quarterly' },
  // Brooks main — Premium plan
  { organizationId: ORG_ID, serviceId: 'ps-brooks-lawn', propertyId: 'prop-brooks-main', serviceTypeId: 'st-lawn-mowing', planId: 'plan-premium', status: 'active', startDate: '2025-04-01', frequency: 'biweekly' },
  { organizationId: ORG_ID, serviceId: 'ps-brooks-pest', propertyId: 'prop-brooks-main', serviceTypeId: 'st-pest-control', planId: 'plan-premium', status: 'active', startDate: '2025-04-01', frequency: 'quarterly' },
  // Kim — Winter only
  { organizationId: ORG_ID, serviceId: 'ps-kim-snow', propertyId: 'prop-kim-home', serviceTypeId: 'st-snow-removal', planId: 'plan-winter', status: 'active', startDate: '2025-11-01', frequency: 'one_time' },
  { organizationId: ORG_ID, serviceId: 'ps-kim-blowout', propertyId: 'prop-kim-home', serviceTypeId: 'st-sprinkler-blowout', planId: 'plan-winter', status: 'active', startDate: '2025-10-15', frequency: 'annually' },
  // Cancelled service example
  { organizationId: ORG_ID, serviceId: 'ps-martinez-rental-lawn', propertyId: 'prop-martinez-rental', serviceTypeId: 'st-lawn-mowing', status: 'cancelled', startDate: '2025-04-01', endDate: '2025-09-30', frequency: 'biweekly' },
];

// ── Costs ────────────────────────────────────────────────────────────────────

const costs = [
  { organizationId: ORG_ID, costId: 'cost-johnson-lawn-labor', serviceId: 'ps-johnson-lawn', costTypeId: 'labor', amount: 2500, description: 'Lawn mowing labor per visit', effectiveDate: '2024-03-01' },
  { organizationId: ORG_ID, costId: 'cost-johnson-lawn-fuel', serviceId: 'ps-johnson-lawn', costTypeId: 'fuel', amount: 500, description: 'Fuel cost per visit', effectiveDate: '2024-03-01' },
  { organizationId: ORG_ID, costId: 'cost-johnson-fert-mat', serviceId: 'ps-johnson-fert', costTypeId: 'materials', amount: 3500, description: 'Fertilizer product cost', effectiveDate: '2024-03-01' },
  { organizationId: ORG_ID, costId: 'cost-johnson-fert-labor', serviceId: 'ps-johnson-fert', costTypeId: 'labor', amount: 1500, description: 'Fertilizer application labor', effectiveDate: '2024-03-01' },
  { organizationId: ORG_ID, costId: 'cost-chen-lawn-labor', serviceId: 'ps-chen-lawn', costTypeId: 'labor', amount: 5000, description: 'Commercial mowing crew labor', effectiveDate: '2024-01-15' },
  { organizationId: ORG_ID, costId: 'cost-chen-lawn-fuel', serviceId: 'ps-chen-lawn', costTypeId: 'fuel', amount: 1200, description: 'Commercial equipment fuel', effectiveDate: '2024-01-15' },
  { organizationId: ORG_ID, costId: 'cost-chen-lawn-equip', serviceId: 'ps-chen-lawn', costTypeId: 'equipment', amount: 800, description: 'Commercial mower wear', effectiveDate: '2024-01-15' },
  { organizationId: ORG_ID, costId: 'cost-hoa-lawn-labor', serviceId: 'ps-hoa-lawn', costTypeId: 'labor', amount: 8000, description: 'HOA grounds crew labor', effectiveDate: '2025-01-01' },
  { organizationId: ORG_ID, costId: 'cost-hoa-lawn-fuel', serviceId: 'ps-hoa-lawn', costTypeId: 'fuel', amount: 2000, description: 'HOA mowing fuel', effectiveDate: '2025-01-01' },
];

// ── Pay Schedules ────────────────────────────────────────────────────────────

const paySchedules = [
  { organizationId: ORG_ID, payScheduleId: 'paysched-biweekly', name: 'Biweekly Pay', frequency: 'biweekly', dayOfWeek: 5 },
  { organizationId: ORG_ID, payScheduleId: 'paysched-monthly', name: 'Monthly Salary', frequency: 'monthly', dayOfMonth: 15 },
];

// ── Pay ──────────────────────────────────────────────────────────────────────

const pays = [
  { organizationId: ORG_ID, payId: 'pay-williams', employeeId: 'emp-williams', payScheduleId: 'paysched-monthly', payType: 'salary', rate: 550000, effectiveDate: '2021-03-15' },
  { organizationId: ORG_ID, payId: 'pay-taylor', employeeId: 'emp-taylor', payScheduleId: 'paysched-monthly', payType: 'salary', rate: 450000, effectiveDate: '2022-01-03' },
  { organizationId: ORG_ID, payId: 'pay-garcia', employeeId: 'emp-garcia', payScheduleId: 'paysched-biweekly', payType: 'hourly', rate: 2200, effectiveDate: '2022-06-01' },
  { organizationId: ORG_ID, payId: 'pay-thompson', employeeId: 'emp-thompson', payScheduleId: 'paysched-biweekly', payType: 'hourly', rate: 2000, effectiveDate: '2023-01-10' },
  { organizationId: ORG_ID, payId: 'pay-davis', employeeId: 'emp-davis', payScheduleId: 'paysched-biweekly', payType: 'hourly', rate: 2100, effectiveDate: '2023-09-01' },
  { organizationId: ORG_ID, payId: 'pay-wilson', employeeId: 'emp-wilson', payScheduleId: 'paysched-biweekly', payType: 'hourly', rate: 1900, effectiveDate: '2024-02-15' },
  { organizationId: ORG_ID, payId: 'pay-reyes', employeeId: 'emp-reyes', payScheduleId: 'paysched-biweekly', payType: 'hourly', rate: 2000, effectiveDate: '2024-05-01' },
];

// ── Invoices ─────────────────────────────────────────────────────────────────

const invoices = [
  // February 2026
  {
    organizationId: ORG_ID, invoiceId: 'inv-johnson-feb', customerId: 'cust-johnson',
    invoiceNumber: 'INV-2026-001', invoiceDate: '2026-02-01', dueDate: '2026-02-28',
    subtotal: 19900, tax: 1592, total: 21492, status: 'paid', paidAt: '2026-02-15T09:30:00.000Z',
    lineItems: [{ description: 'Premium Plan - February 2026', quantity: 1, unitPrice: 19900, total: 19900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-martinez-feb', customerId: 'cust-martinez',
    invoiceNumber: 'INV-2026-002', invoiceDate: '2026-02-01', dueDate: '2026-02-28',
    subtotal: 9900, tax: 792, total: 10692, status: 'paid', paidAt: '2026-02-20T14:00:00.000Z',
    lineItems: [{ description: 'Essential Plan - February 2026', quantity: 1, unitPrice: 9900, total: 9900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-chen-feb', customerId: 'cust-chen',
    invoiceNumber: 'INV-2026-003', invoiceDate: '2026-02-01', dueDate: '2026-02-28',
    subtotal: 49900, tax: 3992, total: 53892, status: 'paid', paidAt: '2026-02-10T11:00:00.000Z',
    lineItems: [{ description: 'Commercial Plan - February 2026', quantity: 1, unitPrice: 49900, total: 49900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-oconnor-feb', customerId: 'cust-oconnor',
    invoiceNumber: 'INV-2026-004', invoiceDate: '2026-02-01', dueDate: '2026-02-28',
    subtotal: 89900, tax: 7192, total: 97092, status: 'paid', paidAt: '2026-02-22T16:00:00.000Z',
    lineItems: [{ description: 'HOA Plan - February 2026', quantity: 1, unitPrice: 89900, total: 89900 }],
  },
  // March 2026
  {
    organizationId: ORG_ID, invoiceId: 'inv-johnson-mar', customerId: 'cust-johnson',
    invoiceNumber: 'INV-2026-005', invoiceDate: '2026-03-01', dueDate: '2026-03-31',
    subtotal: 19900, tax: 1592, total: 21492, status: 'sent',
    lineItems: [{ description: 'Premium Plan - March 2026', quantity: 1, unitPrice: 19900, total: 19900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-martinez-mar', customerId: 'cust-martinez',
    invoiceNumber: 'INV-2026-006', invoiceDate: '2026-03-01', dueDate: '2026-03-31',
    subtotal: 9900, tax: 792, total: 10692, status: 'sent',
    lineItems: [{ description: 'Essential Plan - March 2026', quantity: 1, unitPrice: 9900, total: 9900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-chen-mar', customerId: 'cust-chen',
    invoiceNumber: 'INV-2026-007', invoiceDate: '2026-03-01', dueDate: '2026-03-31',
    subtotal: 49900, tax: 3992, total: 53892, status: 'paid', paidAt: '2026-03-05T10:30:00.000Z',
    lineItems: [{ description: 'Commercial Plan - March 2026', quantity: 1, unitPrice: 49900, total: 49900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-patel-mar', customerId: 'cust-patel',
    invoiceNumber: 'INV-2026-008', invoiceDate: '2026-03-01', dueDate: '2026-03-31',
    subtotal: 29900, tax: 2392, total: 32292, status: 'draft',
    lineItems: [{ description: 'Ultimate Plan - March 2026', quantity: 1, unitPrice: 29900, total: 29900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-oconnor-mar', customerId: 'cust-oconnor',
    invoiceNumber: 'INV-2026-009', invoiceDate: '2026-03-01', dueDate: '2026-03-31',
    subtotal: 89900, tax: 7192, total: 97092, status: 'sent',
    lineItems: [{ description: 'HOA Plan - March 2026', quantity: 1, unitPrice: 89900, total: 89900 }],
  },
  {
    organizationId: ORG_ID, invoiceId: 'inv-brooks-mar', customerId: 'cust-brooks',
    invoiceNumber: 'INV-2026-010', invoiceDate: '2026-03-01', dueDate: '2026-03-31',
    subtotal: 19900, tax: 1592, total: 21492, status: 'sent',
    lineItems: [{ description: 'Premium Plan - March 2026', quantity: 1, unitPrice: 19900, total: 19900 }],
  },
  // Overdue example
  {
    organizationId: ORG_ID, invoiceId: 'inv-kim-jan', customerId: 'cust-kim',
    invoiceNumber: 'INV-2026-011', invoiceDate: '2026-01-01', dueDate: '2026-01-31',
    subtotal: 14900, tax: 1192, total: 16092, status: 'overdue',
    lineItems: [{ description: 'Winter Plan - January 2026', quantity: 1, unitPrice: 14900, total: 14900 }],
  },
];

// ── Payment Methods ──────────────────────────────────────────────────────────

const paymentMethods = [
  { organizationId: ORG_ID, paymentMethodId: 'pm-johnson-visa', customerId: 'cust-johnson', type: 'credit_card', last4: '4242', isDefault: true, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-martinez-mc', customerId: 'cust-martinez', type: 'credit_card', last4: '5555', isDefault: true, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-chen-ach', customerId: 'cust-chen', type: 'ach', last4: '9876', isDefault: true, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-patel-visa', customerId: 'cust-patel', type: 'credit_card', last4: '1234', isDefault: true, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-nguyen-mc', customerId: 'cust-nguyen', type: 'credit_card', last4: '8888', isDefault: true, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-oconnor-ach', customerId: 'cust-oconnor', type: 'ach', last4: '3210', isDefault: true, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-brooks-visa', customerId: 'cust-brooks', type: 'credit_card', last4: '7777', isDefault: true, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-brooks-ach', customerId: 'cust-brooks', type: 'ach', last4: '6543', isDefault: false, status: 'active' },
  { organizationId: ORG_ID, paymentMethodId: 'pm-kim-visa', customerId: 'cust-kim', type: 'credit_card', last4: '9999', isDefault: true, status: 'active' },
];

// ── Invoice Schedules ────────────────────────────────────────────────────────

const invoiceSchedules = [
  { organizationId: ORG_ID, invoiceScheduleId: 'isched-johnson', customerId: 'cust-johnson', frequency: 'monthly', nextInvoiceDate: '2026-04-01', dayOfMonth: 1 },
  { organizationId: ORG_ID, invoiceScheduleId: 'isched-martinez', customerId: 'cust-martinez', frequency: 'monthly', nextInvoiceDate: '2026-04-01', dayOfMonth: 1 },
  { organizationId: ORG_ID, invoiceScheduleId: 'isched-chen', customerId: 'cust-chen', frequency: 'monthly', nextInvoiceDate: '2026-04-01', dayOfMonth: 1 },
  { organizationId: ORG_ID, invoiceScheduleId: 'isched-patel', customerId: 'cust-patel', frequency: 'monthly', nextInvoiceDate: '2026-04-01', dayOfMonth: 1 },
  { organizationId: ORG_ID, invoiceScheduleId: 'isched-oconnor', customerId: 'cust-oconnor', frequency: 'monthly', nextInvoiceDate: '2026-04-01', dayOfMonth: 1 },
  { organizationId: ORG_ID, invoiceScheduleId: 'isched-brooks', customerId: 'cust-brooks', frequency: 'monthly', nextInvoiceDate: '2026-04-01', dayOfMonth: 1 },
];

// ── Estimates ────────────────────────────────────────────────────────────────

const estimates = [
  // Draft — Patel considering add-on services
  {
    organizationId: ORG_ID, estimateId: 'est-patel-addon', customerId: 'cust-patel',
    propertyId: 'prop-patel-home', estimateNumber: 'EST-2026-001',
    estimateDate: '2026-03-01', expirationDate: '2026-03-31', status: 'draft',
    subtotal: 22800, tax: 0, total: 22800,
    lineItems: [
      { serviceTypeId: 'st-gutter-cleaning', description: 'Gutter Cleaning - 160 linear feet', quantity: 160, unit: 'linear feet', unitPrice: 50, total: 13000, estimatedDuration: 110 },
      { serviceTypeId: 'st-window-cleaning', description: 'Window Cleaning - 14 windows', quantity: 14, unit: 'windows', unitPrice: 800, total: 11200, estimatedDuration: 80 },
    ],
    notes: 'Add-on gutter and window cleaning for existing Ultimate plan customer',
  },
  // Sent — Martinez rental property
  {
    organizationId: ORG_ID, estimateId: 'est-martinez-rental', customerId: 'cust-martinez',
    propertyId: 'prop-martinez-rental', estimateNumber: 'EST-2026-002',
    estimateDate: '2026-02-20', expirationDate: '2026-03-20', status: 'sent',
    subtotal: 24500, tax: 0, total: 24500,
    lineItems: [
      { serviceTypeId: 'st-lawn-mowing', description: 'Lawn Mowing - 3000 sq ft', quantity: 3000, unit: 'sq ft', unitPrice: 5, total: 17000, estimatedDuration: 1530 },
      { serviceTypeId: 'st-pest-control', description: 'General Pest Control', quantity: 1, unit: 'per_visit', unitPrice: 7500, total: 7500, estimatedDuration: 45 },
    ],
    notes: 'Essential plan for rental property — tenant requested pest control',
  },
  // Accepted — Chen spring package
  {
    organizationId: ORG_ID, estimateId: 'est-chen-spring', customerId: 'cust-chen',
    propertyId: 'prop-chen-office', estimateNumber: 'EST-2026-003',
    estimateDate: '2026-02-15', status: 'accepted', acceptedAt: '2026-02-28T14:00:00.000Z',
    subtotal: 134000, tax: 0, total: 134000,
    lineItems: [
      { serviceTypeId: 'st-lawn-mowing', description: 'Lawn Mowing - 15000 sq ft', quantity: 15000, unit: 'sq ft', unitPrice: 5, total: 77000, estimatedDuration: 7530 },
      { serviceTypeId: 'st-window-cleaning', description: 'Window Cleaning - 60 windows', quantity: 60, unit: 'windows', unitPrice: 800, total: 48000, estimatedDuration: 310 },
      { serviceTypeId: 'st-sprinkler-startup', description: 'Sprinkler Spring Startup', quantity: 1, unit: 'per_visit', unitPrice: 7500, total: 7500, estimatedDuration: 45 },
      { serviceTypeId: 'st-pressure-washing', description: 'Pressure Washing - 3000 sq ft', quantity: 3000, unit: 'sq ft', unitPrice: 15, total: 50000, estimatedDuration: 1230 },
    ],
    notes: 'Spring deep-clean and startup package for office park',
  },
  // Rejected — Brooks cabin
  {
    organizationId: ORG_ID, estimateId: 'est-brooks-cabin', customerId: 'cust-brooks',
    propertyId: 'prop-brooks-cabin', estimateNumber: 'EST-2026-004',
    estimateDate: '2026-01-15', status: 'rejected',
    subtotal: 45000, tax: 0, total: 45000,
    lineItems: [
      { serviceTypeId: 'st-holiday-lights', description: 'Holiday Light Installation - 100 linear feet', quantity: 100, unit: 'linear feet', unitPrice: 200, total: 40000, estimatedDuration: 160 },
      { serviceTypeId: 'st-winterizing', description: 'Full Winterizing', quantity: 1, unit: 'per_visit', unitPrice: 15000, total: 15000, estimatedDuration: 120 },
    ],
    notes: 'Customer decided to handle holiday lights themselves',
  },
  // Invoiced — Nguyen triplex
  {
    organizationId: ORG_ID, estimateId: 'est-nguyen-triplex', customerId: 'cust-nguyen',
    propertyId: 'prop-nguyen-triplex', estimateNumber: 'EST-2026-005',
    estimateDate: '2026-01-20', status: 'invoiced', acceptedAt: '2026-01-25T10:00:00.000Z',
    invoiceId: 'inv-nguyen-est',
    subtotal: 33900, tax: 0, total: 33900,
    lineItems: [
      { serviceTypeId: 'st-lawn-mowing', description: 'Lawn Mowing - 4500 sq ft', quantity: 4500, unit: 'sq ft', unitPrice: 5, total: 24500, estimatedDuration: 2280 },
      { serviceTypeId: 'st-pest-control', description: 'General Pest Control', quantity: 1, unit: 'per_visit', unitPrice: 7500, total: 7500, estimatedDuration: 45 },
      { serviceTypeId: 'st-mosquito', description: 'Mosquito Treatment', quantity: 1, unit: 'per_visit', unitPrice: 6500, total: 6500, estimatedDuration: 30 },
    ],
    notes: 'Triplex spring services — converted to invoice',
  },
  // Expired — O'Connor holiday lights
  {
    organizationId: ORG_ID, estimateId: 'est-oconnor-lights', customerId: 'cust-oconnor',
    propertyId: 'prop-oconnor-hoa', estimateNumber: 'EST-2025-010',
    estimateDate: '2025-09-15', expirationDate: '2025-10-15', status: 'expired',
    subtotal: 120000, tax: 0, total: 120000,
    lineItems: [
      { serviceTypeId: 'st-holiday-lights', description: 'Holiday Lights - HOA common area', quantity: 500, unit: 'linear feet', unitPrice: 200, total: 120000, estimatedDuration: 560 },
    ],
    notes: 'HOA board did not approve in time — expired',
  },
];

// ── Service Schedules ────────────────────────────────────────────────────────

const serviceSchedules = [
  // Completed — past work
  { organizationId: ORG_ID, serviceScheduleId: 'sched-johnson-lawn-1', serviceId: 'ps-johnson-lawn', servicerId: 'svc-garcia', scheduledDate: '2026-02-24', scheduledTime: '09:00', estimatedDuration: 60, status: 'completed', completedAt: '2026-02-24T10:05:00.000Z' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-johnson-lawn-2', serviceId: 'ps-johnson-lawn', servicerId: 'svc-garcia', scheduledDate: '2026-03-10', scheduledTime: '09:00', estimatedDuration: 60, status: 'completed', completedAt: '2026-03-10T10:15:00.000Z' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-chen-lawn-1', serviceId: 'ps-chen-lawn', servicerId: 'svc-reyes', scheduledDate: '2026-03-03', scheduledTime: '07:00', estimatedDuration: 120, status: 'completed', completedAt: '2026-03-03T09:20:00.000Z' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-hoa-lawn-1', serviceId: 'ps-hoa-lawn', servicerId: 'svc-reyes', scheduledDate: '2026-02-28', scheduledTime: '07:00', estimatedDuration: 180, status: 'completed', completedAt: '2026-02-28T10:30:00.000Z' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-martinez-pest-1', serviceId: 'ps-martinez-pest', servicerId: 'svc-wilson', scheduledDate: '2026-02-15', scheduledTime: '10:00', estimatedDuration: 45, status: 'completed', completedAt: '2026-02-15T10:50:00.000Z' },
  // Scheduled — upcoming work
  { organizationId: ORG_ID, serviceScheduleId: 'sched-johnson-lawn-3', serviceId: 'ps-johnson-lawn', servicerId: 'svc-garcia', scheduledDate: '2026-03-24', scheduledTime: '09:00', estimatedDuration: 60, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-johnson-window-1', serviceId: 'ps-johnson-window', servicerId: 'svc-thompson', scheduledDate: '2026-03-18', scheduledTime: '13:00', estimatedDuration: 90, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-chen-lawn-2', serviceId: 'ps-chen-lawn', servicerId: 'svc-reyes', scheduledDate: '2026-03-10', scheduledTime: '07:00', estimatedDuration: 120, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-chen-hedge-1', serviceId: 'ps-chen-hedge', servicerId: 'svc-reyes', scheduledDate: '2026-03-12', scheduledTime: '07:00', estimatedDuration: 90, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-patel-lawn-1', serviceId: 'ps-patel-lawn', servicerId: 'svc-davis', scheduledDate: '2026-03-15', scheduledTime: '10:00', estimatedDuration: 55, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-patel-fert-1', serviceId: 'ps-patel-fert', servicerId: 'svc-thompson', scheduledDate: '2026-03-20', scheduledTime: '08:00', estimatedDuration: 30, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-hoa-lawn-2', serviceId: 'ps-hoa-lawn', servicerId: 'svc-reyes', scheduledDate: '2026-03-07', scheduledTime: '07:00', estimatedDuration: 180, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-hoa-hedge-1', serviceId: 'ps-hoa-hedge', servicerId: 'svc-reyes', scheduledDate: '2026-03-14', scheduledTime: '07:00', estimatedDuration: 240, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-brooks-lawn-1', serviceId: 'ps-brooks-lawn', servicerId: 'svc-davis', scheduledDate: '2026-03-17', scheduledTime: '11:00', estimatedDuration: 70, status: 'scheduled' },
  { organizationId: ORG_ID, serviceScheduleId: 'sched-martinez-lawn-1', serviceId: 'ps-martinez-lawn', servicerId: 'svc-garcia', scheduledDate: '2026-03-12', scheduledTime: '14:00', estimatedDuration: 45, status: 'scheduled' },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  SEED RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

const TABLE_NAME = process.env.TABLE_NAME || 'versa-table';
const ENDPOINT = process.env.LOCAL_DYNAMODB_ENDPOINT || 'http://localhost:8000';

const ddbClient = new DynamoDBClient({
  endpoint: ENDPOINT,
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

/**
 * Drop and recreate the table so we start fresh every time.
 */
async function clearDatabase() {
  try {
    await ddbClient.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    await ddbClient.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
    // Wait briefly for deletion to complete
    await new Promise(r => setTimeout(r, 500));
  } catch (e) {
    if (e.name !== 'ResourceNotFoundException') throw e;
  }

  await ddbClient.send(new CreateTableCommand({
    TableName: TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: 'pk', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'gsi1pk', AttributeType: 'S' },
      { AttributeName: 'gsi1sk', AttributeType: 'S' },
      { AttributeName: 'gsi2pk', AttributeType: 'S' },
      { AttributeName: 'gsi2sk', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'pk', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'gsi1',
        KeySchema: [
          { AttributeName: 'gsi1pk', KeyType: 'HASH' },
          { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'gsi2',
        KeySchema: [
          { AttributeName: 'gsi2pk', KeyType: 'HASH' },
          { AttributeName: 'gsi2sk', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  }));

  console.log('  ✓ Database cleared and table recreated\n');
}

async function upsert(entityName, items) {
  const entity = DBService.entities[entityName];
  if (!entity) {
    console.warn(`  ⚠ Entity "${entityName}" not found in DBService, skipping.`);
    return;
  }

  let created = 0;
  for (const item of items) {
    try {
      await entity.put(item).go();
      created++;
    } catch (err) {
      console.error(`  ✗ Failed to seed ${entityName} ${JSON.stringify(item).slice(0, 100)}:`, err.message);
    }
  }
  console.log(`  ✓ ${entityName}: ${created}/${items.length} items`);
}

async function seed() {
  console.log('Seeding local database...\n');

  await clearDatabase();

  await upsert('organization', [organization]);
  await upsert('propertyType', propertyTypes);
  await upsert('category', categories);
  await upsert('serviceType', serviceTypes);
  await upsert('costType', costTypes);
  await upsert('customer', customers);
  await upsert('account', accounts);
  await upsert('delegate', delegates);
  await upsert('property', properties);
  await upsert('plan', plans);
  await upsert('planService', planServices);
  await upsert('propertyService', propertyServices);
  await upsert('cost', costs);
  await upsert('employee', employees);
  await upsert('servicer', servicers);
  await upsert('capability', capabilities);
  await upsert('serviceSchedule', serviceSchedules);
  await upsert('paySchedule', paySchedules);
  await upsert('pay', pays);
  await upsert('invoice', invoices);
  await upsert('paymentMethod', paymentMethods);
  await upsert('invoiceSchedule', invoiceSchedules);
  await upsert('estimate', estimates);

  console.log('\nDatabase seeded successfully.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
