import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskNotificationRequest {
  userId: string;
  taskId: string;
  taskTitle: string;
  type: "assigned" | "updated";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, taskId, taskTitle, type }: TaskNotificationRequest = await req.json();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check notification settings
    const { data: settings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Default to true if no settings exist
    const shouldSendEmail = type === "assigned" 
      ? (settings?.email_task_assigned ?? true)
      : (settings?.email_task_updated ?? true);

    if (!shouldSendEmail) {
      console.log("Email notifications disabled for user:", userId);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "Email notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subject = type === "assigned" 
      ? "New Task Assigned to You" 
      : "Task Updated";

    const message = type === "assigned"
      ? `You have been assigned to "${taskTitle}"`
      : `Task "${taskTitle}" has been updated`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "ProjectFlow <onboarding@resend.dev>",
      to: [profile.email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .task-card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📋 ${subject}</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${profile.name}</strong>,</p>
              <p>${message}</p>
              <div class="task-card">
                <strong>${taskTitle}</strong>
              </div>
              <p>Log in to your account to view task details and take action.</p>
              <p class="footer">This email was sent by ProjectFlow. You can manage your notification preferences in Settings.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email in the database
    await supabase.from("email_logs").insert({
      to_user_id: userId,
      to_email: profile.email,
      subject: subject,
      body: message,
    });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
