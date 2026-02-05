import { NextRequest, NextResponse } from "next/server";
import { validateAdmissionNumber } from "@/lib/firebase/alumni-verification";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { admissionNumber, userName, graduationYear } = body;

        if (!admissionNumber) {
            return NextResponse.json(
                { error: "Admission number is required" },
                { status: 400 }
            );
        }

        const result = await validateAdmissionNumber(
            admissionNumber,
            userName,
            graduationYear
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("Admission validation error:", error);
        return NextResponse.json(
            { error: "Failed to validate admission number" },
            { status: 500 }
        );
    }
}
