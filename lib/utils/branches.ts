import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/lib/types";

/**
 * Gets the main/default branch ID
 * Main branch is identified by name "Glanz Costumes Collection"
 * or by matching address/phone
 */
export async function getMainBranchId(): Promise<string | null> {
  const supabase = createClient();
  
  try {
    // Try to find by name first (exact match or contains "Glanz Costumes Collection")
    const { data: branchByName, error: nameError } = await supabase
      .from("branches")
      .select("id")
      .ilike("name", "%Glanz Costumes Collection%")
      .limit(1)
      .maybeSingle();
    
    if (!nameError && branchByName) {
      return (branchByName as any).id;
    }
    
    // Fallback: Try to find by address (contains "Panampilly Nagar" or "Eranakulam")
    const { data: branchByAddress, error: addressError } = await supabase
      .from("branches")
      .select("id")
      .or("address.ilike.%Panampilly Nagar%,address.ilike.%Eranakulam%")
      .limit(1)
      .maybeSingle();
    
    if (!addressError && branchByAddress) {
      return (branchByAddress as any).id;
    }
    
    // Fallback: Get the first branch (if only one exists)
    const { data: branches, error: firstError } = await supabase
      .from("branches")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1);
    
    if (!firstError && branches && branches.length > 0) {
      return (branches[0] as any).id;
    }
    
    return null;
  } catch (error) {
    console.error("[getMainBranchId] Error:", error);
    return null;
  }
}

/**
 * Gets the main branch with full details
 */
export async function getMainBranch(): Promise<Branch | null> {
  const supabase = createClient();
  
  try {
    // Try to find by name first (exact match or contains "Glanz Costumes Collection")
    const { data: branchByName, error: nameError } = await supabase
      .from("branches")
      .select("*")
      .ilike("name", "%Glanz Costumes Collection%")
      .limit(1)
      .maybeSingle();
    
    if (!nameError && branchByName) {
      return branchByName as Branch;
    }
    
    // Fallback: Try to find by address
    const { data: branchByAddress, error: addressError } = await supabase
      .from("branches")
      .select("*")
      .or("address.ilike.%Panampilly Nagar%,address.ilike.%Eranakulam%")
      .limit(1)
      .maybeSingle();
    
    if (!addressError && branchByAddress) {
      return branchByAddress as Branch;
    }
    
    // Fallback: Get the first branch
    const { data: branches, error: firstError } = await supabase
      .from("branches")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1);
    
    if (!firstError && branches && branches.length > 0) {
      return branches[0] as Branch;
    }
    
    return null;
  } catch (error) {
    console.error("[getMainBranch] Error:", error);
    return null;
  }
}

