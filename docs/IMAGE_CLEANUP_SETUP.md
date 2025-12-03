# Order Image Cleanup Setup

This document explains how to set up automatic deletion of product images from completed orders after 7 days.

## Overview

When an order is completely returned (status = "completed", not "partially_returned"), the product images will be automatically deleted from storage 7 days after the completion date. The order data remains intact, but the `photo_url` fields in `order_items` will be set to `NULL`.

## Database Setup

1. **Run the migration**:
   ```sql
   -- Run this in Supabase SQL Editor
   -- File: supabase-migrations/auto-delete-order-images.sql
   ```

   This migration:
   - Adds `completed_at` timestamp to `orders` table
   - Creates a trigger to automatically set `completed_at` when order status changes to "completed"
   - Creates helper functions for image deletion

## API Route Setup

The cleanup API route is located at:
- **Path**: `/app/api/orders/cleanup-images/route.ts`
- **Method**: POST
- **Authentication**: Requires `CRON_SECRET` environment variable (optional but recommended)

## Environment Variables

Add to your `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_secret_token_for_cron_jobs
```

## Setting Up Cron Job

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in your project root:
```json
{
  "crons": [
    {
      "path": "/api/orders/cleanup-images",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs daily at 2 AM UTC.

### Option 2: GitHub Actions

Create `.github/workflows/cleanup-images.yml`:
```yaml
name: Cleanup Order Images

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cleanup
        run: |
          curl -X POST https://your-domain.com/api/orders/cleanup-images \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: External Cron Service

Use services like:
- **cron-job.org**: Free cron job service
- **EasyCron**: Reliable cron service
- **Supabase Edge Functions**: Use pg_cron extension

Configure to call:
```
POST https://your-domain.com/api/orders/cleanup-images
Authorization: Bearer YOUR_CRON_SECRET
```

## Manual Testing

You can manually trigger the cleanup:

```bash
curl -X POST https://your-domain.com/api/orders/cleanup-images \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or test locally:
```bash
curl -X POST http://localhost:3000/api/orders/cleanup-images \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How It Works

1. **Order Completion**: When an order status changes to "completed", the `completed_at` timestamp is automatically set.

2. **Cleanup Process** (runs daily):
   - Finds all orders with:
     - `status = 'completed'`
     - `status != 'partially_returned'` (only fully completed orders)
     - `completed_at < NOW() - INTERVAL '7 days'`
     - Has items with non-null `photo_url`
   
3. **Image Deletion**:
   - Extracts file paths from `photo_url` values
   - Deletes files from Supabase Storage (`order-items` bucket)
   - Updates `order_items` to set `photo_url = NULL`
   - Keeps all other order data intact

4. **Error Handling**:
   - If file deletion fails, the `photo_url` is NOT updated (data integrity)
   - Failed deletions are logged and returned in the response
   - Process continues even if some files fail to delete

## Important Notes

- **Only fully completed orders**: Orders with `status = 'partially_returned'` are NOT processed
- **7-day grace period**: Images are kept for 7 days after completion for potential disputes
- **Data preservation**: All order data remains, only images are deleted
- **Idempotent**: Safe to run multiple times (won't duplicate work)
- **Storage access**: Requires `SUPABASE_SERVICE_ROLE_KEY` for storage deletion

## Monitoring

The API returns a response with statistics:
```json
{
  "success": true,
  "message": "Image cleanup completed",
  "stats": {
    "ordersProcessed": 5,
    "itemsFound": 12,
    "filesDeleted": 12,
    "itemsUpdated": 12,
    "failedDeletions": 0
  }
}
```

Monitor these stats to ensure the cleanup is working correctly.

## Troubleshooting

1. **Images not deleting**: Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly
2. **No orders found**: Verify that orders have `completed_at` set (check trigger is working)
3. **Permission errors**: Ensure storage bucket policies allow deletion
4. **Cron not running**: Verify cron job configuration and check logs

