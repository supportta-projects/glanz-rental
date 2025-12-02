# Booking-to-Rental Workflow Implementation

## Overview
Implemented a simple and professional booking-to-rental workflow that distinguishes between when an order is booked vs when the rental actually starts. This follows rental business best practices.

## Key Features

### 1. **Booking Date Tracking**
- Added `booking_date` field to track when order was created/booked
- Separate from `start_date` which is when rental actually starts
- Automatically set to current timestamp when order is created

### 2. **Scheduled vs Active Status**
- **Scheduled**: Order booked for future date (start_date > today)
- **Active**: Order starts today or rental has begun (start_date <= today)
- Automatic status assignment based on start date

### 3. **Simple "Start Rental" Action**
- One-click button for scheduled orders
- Converts scheduled → active when customer picks up items
- Updates start_datetime to current time
- Moves order to "Ongoing" tab automatically

### 4. **Smart Category Classification**
- **Scheduled**: Only if status = "scheduled" AND start_date > today
- **Ongoing**: If start_date = today OR status = "active" (rental has started)
- Prevents today's rentals from showing as "scheduled"

## Database Changes

### Migration: `supabase-migrations/add-booking-date.sql`
- Adds `booking_date` TIMESTAMP field
- Adds `scheduled` status to OrderStatus enum
- Creates index for booking_date queries
- Updates existing orders with booking_date = created_at

## Code Changes

### 1. TypeScript Types (`lib/types/index.ts`)
- Added `"scheduled"` to `OrderStatus` type
- Added `booking_date?: string` to `Order` interface

### 2. Order Queries (`lib/queries/orders.ts`)
- Updated queries to fetch `booking_date`
- Added `"scheduled"` to status filter types
- Added `useStartRental()` mutation hook
- Updated `useCreateOrder()` to:
  - Set `booking_date` to current timestamp
  - Determine status: `"scheduled"` if start_date > today, else `"active"`

### 3. Orders Page (`app/(dashboard)/orders/page.tsx`)
- Updated `getOrderCategory()` to properly detect scheduled orders
- Added "Start Rental" button for scheduled orders
- Added `handleStartRental()` handler
- Updated status filter to include "scheduled"

## User Workflow

### Creating an Order
1. Staff creates order with customer
2. Sets rental start date (when items will be picked up)
3. Sets rental end date
4. **System automatically**:
   - Sets `booking_date` = now (when order was booked)
   - Sets `status` = "scheduled" if start_date > today
   - Sets `status` = "active" if start_date = today

### Starting a Scheduled Rental
1. Scheduled order appears in "Scheduled" tab
2. When customer arrives to pick up items:
   - Staff clicks "Start Rental" button
   - Order status changes to "active"
   - Order moves to "Ongoing" tab
   - `start_datetime` updates to current time

### Category Display
- **Scheduled Tab**: Shows orders with status="scheduled" AND start_date > today
- **Ongoing Tab**: Shows orders with status="active" OR start_date = today
- **Today's Rentals**: Always show as "Ongoing", never "Scheduled"

## Benefits

✅ **Clear Distinction**: Booking date vs rental start date
✅ **Simple Workflow**: One button to start rental
✅ **Accurate Categories**: Today's rentals are ongoing, not scheduled
✅ **Professional**: Follows rental business best practices
✅ **Flexible**: Supports advance bookings and same-day rentals

## Testing Checklist

- [ ] Create order with future start date → Status = "scheduled"
- [ ] Create order with today's start date → Status = "active"
- [ ] Scheduled order appears in "Scheduled" tab
- [ ] Click "Start Rental" → Order moves to "Ongoing" tab
- [ ] Booking date is recorded correctly
- [ ] Category counts update correctly
- [ ] Real-time updates work

## Migration Steps

1. Run SQL migration in Supabase SQL Editor:
   ```sql
   -- File: supabase-migrations/add-booking-date.sql
   ```

2. Verify migration:
   - Check `booking_date` column exists
   - Check `scheduled` status is in enum
   - Check existing orders have booking_date set

3. Test the workflow:
   - Create new order with future date
   - Verify it shows as "scheduled"
   - Click "Start Rental"
   - Verify it moves to "ongoing"

## Notes

- Booking date is automatically set and cannot be manually changed
- Start rental action updates start_datetime to current time
- Category logic ensures today's rentals are never "scheduled"
- All changes are real-time and update immediately

