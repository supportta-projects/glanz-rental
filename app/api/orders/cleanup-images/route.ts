import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This API route should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// It deletes product images from completed orders older than 7 days

function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for image deletion");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Extract file path from Supabase Storage URL
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  
  // Format: https://[project].supabase.co/storage/v1/object/public/order-items/[filename]
  // We need: order-items/[filename]
  const match = url.match(/\/order-items\/(.+)$/);
  if (match && match[1]) {
    return `order-items/${match[1]}`;
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization check here
    // For example, check for a secret token in headers
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Step 1: Get orders ready for image deletion
    const { data: ordersForDeletion, error: fetchError } = await (supabaseAdmin
      .rpc as any)("get_orders_for_image_deletion");

    if (fetchError) {
      console.error("[Cleanup Images] Error fetching orders:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch orders for deletion", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!ordersForDeletion || ordersForDeletion.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orders found for image deletion",
        deleted: 0,
        updated: 0,
      });
    }

    // Step 2: Group by order and item for batch processing
    const itemsToUpdate = new Map<string, { itemId: string; photoUrl: string; storagePath: string | null }>();
    const filesToDelete = new Set<string>();

    for (const record of ordersForDeletion) {
      const storagePath = extractStoragePath(record.photo_url);
      if (storagePath) {
        filesToDelete.add(storagePath);
        itemsToUpdate.set(record.item_id, {
          itemId: record.item_id,
          photoUrl: record.photo_url,
          storagePath,
        });
      }
    }

    // Step 3: Delete files from Supabase Storage
    let deletedCount = 0;
    let failedDeletions: string[] = [];

    for (const filePath of filesToDelete) {
      try {
        // Extract just the filename from the path (remove 'order-items/' prefix)
        const fileName = filePath.replace("order-items/", "");
        
        const { error: deleteError } = await supabaseAdmin.storage
          .from("order-items")
          .remove([fileName]);

        if (deleteError) {
          console.error(`[Cleanup Images] Failed to delete ${filePath}:`, deleteError);
          failedDeletions.push(filePath);
        } else {
          deletedCount++;
        }
      } catch (error: any) {
        console.error(`[Cleanup Images] Error deleting ${filePath}:`, error);
        failedDeletions.push(filePath);
      }
    }

    // Step 4: Update order_items to set photo_url to NULL
    // Only update items whose files were successfully deleted (or don't exist)
    const itemIdsToUpdate = Array.from(itemsToUpdate.values())
      .filter(item => !failedDeletions.includes(item.storagePath || ""))
      .map(item => item.itemId);

    let updatedCount = 0;
    if (itemIdsToUpdate.length > 0) {
      // Update in batches to avoid query size limits
      const batchSize = 100;
      for (let i = 0; i < itemIdsToUpdate.length; i += batchSize) {
        const batch = itemIdsToUpdate.slice(i, i + batchSize);
        
        const { error: updateError } = await (supabaseAdmin
          .from("order_items") as any)
          .update({ photo_url: null })
          .in("id", batch);

        if (updateError) {
          console.error("[Cleanup Images] Error updating order_items:", updateError);
        } else {
          updatedCount += batch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Image cleanup completed",
      stats: {
        ordersProcessed: new Set(ordersForDeletion.map((r: any) => r.order_id)).size,
        itemsFound: ordersForDeletion.length,
        filesDeleted: deletedCount,
        itemsUpdated: updatedCount,
        failedDeletions: failedDeletions.length,
      },
      failedDeletions: failedDeletions.length > 0 ? failedDeletions : undefined,
    });
  } catch (error: any) {
    console.error("[Cleanup Images] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Allow GET for manual testing (remove in production or add auth)
export async function GET() {
  return NextResponse.json({
    message: "Image cleanup endpoint. Use POST to trigger cleanup.",
    note: "This endpoint should be called by a cron job.",
  });
}

