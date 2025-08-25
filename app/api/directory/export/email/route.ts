import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { members, origin } = await req.json();

    const memberList = members
      .map(
        (m: any, i: number) =>
          `${i + 1}. ${m.name} (${m.email})\n   - Profile: ${origin}/profile/${m.id}\n }`
      )
      .join("\n\n");

    const subject = `Recommended Developers (${members.length})`;
    const body = `Hi,\n\nHere are some recommended developers:\n\n${memberList}\n\nBest regards,\n[Your Name]`;

    const gmailDraftURL = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    return NextResponse.json({ gmailDraftURL });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Failed to create email draft" },
      { status: 500 }
    );
  }
}
