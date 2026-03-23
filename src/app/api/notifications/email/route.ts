import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { title, body, recipientIds } = await request.json();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Email not configured" }, { status: 503 });
    }

    const resend = new Resend(apiKey);

    // In production, fetch recipient emails from Firestore
    // For MVP, we send a batch email notification
    // Note: Resend free tier supports up to 100 emails/day
    await resend.emails.send({
      from: "ResLife <notifications@reslife.app>",
      to: ["admin@school.edu"], // Placeholder — in production, batch to all recipients
      subject: `[ResLife] ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">${title}</h2>
          <p style="color: #374151; line-height: 1.6;">${body}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">
            This notification was sent by ResLife Residence Management System.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
