import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This route uses the service role key to create auth users
// The service role key should be in your environment variables
// If not available, we'll use a workaround with the client
function getSupabaseAdmin() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Add debugging - this will show in your SERVER terminal, not browser console
  console.log("[API Route] Environment variables check:", {
    hasServiceRoleKey: !!serviceRoleKey,
    serviceRoleKeyLength: serviceRoleKey?.length || 0,
    serviceRoleKeyFirstChars: serviceRoleKey?.substring(0, 20) || "NOT FOUND",
    hasSupabaseUrl: !!supabaseUrl,
    supabaseUrl: supabaseUrl || "NOT FOUND",
  });

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
  }

  // If service role key is available, use it
  if (serviceRoleKey) {
    console.log("[API Route] Service role key found, creating admin client");
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Fallback: return null and handle in the route
  console.error("[API Route] Service role key NOT found in environment variables");
  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log("[API Route] POST /api/staff/create called");
    const body = await request.json();
    const { email, password, full_name, phone, role, branch_id, username } = body;

    // Validation
    if (!email || !password || !full_name || !phone || !role || !branch_id || !username) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    console.log("[API Route] Attempting to get Supabase admin client...");
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      console.error("[API Route] Supabase admin client is null - service role key missing");
      return NextResponse.json(
        { error: "Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in environment variables." },
        { status: 500 }
      );
    }

    console.log("[API Route] Supabase admin client created successfully, creating auth user...");
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("[API Route] Auth user creation error:", authError.message);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error("[API Route] Auth user creation failed - no user returned");
      return NextResponse.json(
        { error: "Failed to create auth user" },
        { status: 500 }
      );
    }

    console.log("[API Route] Auth user created successfully:", authData.user.id);
    // Step 2: Create profile
    const { data: profileData, error: profileError } = await (supabaseAdmin
      .from("profiles") as any)
      .insert([
        {
          id: authData.user.id,
          username,
          role,
          branch_id,
          full_name,
          phone,
        },
      ])
      .select("*, branch:branches(*)")
      .single();

    if (profileError) {
      console.error("[API Route] Profile creation error:", profileError.message);
      // If profile creation fails, try to delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: profileError.message },
        { status: 400 }
      );
    }

    console.log("[API Route] Staff created successfully:", profileData?.id);
    return NextResponse.json({ data: profileData }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

