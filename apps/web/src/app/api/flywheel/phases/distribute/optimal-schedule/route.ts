import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TimeSlot {
  time: string;
  platforms: string[];
}

interface ScheduleData {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { platforms, timezone } = body;

    if (!platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: "No platforms specified" },
        { status: 400 }
      );
    }

    const prompt = `Generate an optimal weekly social media posting schedule for the following platforms: ${platforms.join(", ")}.

The user is in timezone: ${timezone || "UTC"}

Consider these best practices:
- Twitter/X: Best times are 8-10 AM, 12 PM, and 5-6 PM on weekdays
- LinkedIn: Best times are Tuesday-Thursday, 7-8 AM, 12 PM, and 5-6 PM
- Facebook: Best times are 1-4 PM on weekdays, peak engagement Wednesday
- Instagram: Best times are 11 AM-1 PM and 7-9 PM, especially Tuesday and Wednesday

Return a JSON object with this exact structure:
{
  "schedule": {
    "monday": [{ "time": "HH:MM", "platforms": ["platform1"] }],
    "tuesday": [...],
    "wednesday": [...],
    "thursday": [...],
    "friday": [...],
    "saturday": [...],
    "sunday": [...]
  }
}

Use 24-hour time format. Include 3-5 posting times spread throughout the week for each platform.
Only include the platforms specified: ${platforms.join(", ")}.
Keep weekends lighter (0-1 posts) unless it's a B2C brand.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a social media scheduling expert. Always respond with valid JSON only, no additional text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    const schedule: ScheduleData = result.schedule;

    // Validate structure
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    for (const day of days) {
      if (!schedule[day as keyof ScheduleData]) {
        schedule[day as keyof ScheduleData] = [];
      }
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error generating optimal schedule:", error);

    // Return a sensible fallback schedule
    const fallbackSchedule: ScheduleData = {
      monday: [{ time: "09:00", platforms: ["twitter", "linkedin"] }],
      tuesday: [{ time: "12:00", platforms: ["twitter"] }],
      wednesday: [
        { time: "09:00", platforms: ["linkedin"] },
        { time: "17:00", platforms: ["twitter"] },
      ],
      thursday: [{ time: "12:00", platforms: ["twitter"] }],
      friday: [{ time: "10:00", platforms: ["twitter", "linkedin"] }],
      saturday: [],
      sunday: [],
    };

    return NextResponse.json({ schedule: fallbackSchedule });
  }
}
