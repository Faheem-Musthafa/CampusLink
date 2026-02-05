import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    Timestamp,
    QueryConstraint
} from "firebase/firestore";
import { db } from "./config";
import type { VerifiedAlumni, AlumniFilters, ValidationResult, BulkImportResult } from "@/types";

/**
 * Add a verified alumni record
 */
export async function addVerifiedAlumni(
    data: Omit<VerifiedAlumni, "isUsed" | "addedAt" | "updatedAt">,
    adminId: string
): Promise<string> {
    if (!db) throw new Error("Firestore not initialized");

    const { admissionNumber, ...rest } = data;

    // Check if admission number already exists
    const existingDoc = await getDoc(doc(db, "verifiedAlumni", admissionNumber));
    if (existingDoc.exists()) {
        throw new Error("Admission number already exists");
    }

    const alumniData = {
        admissionNumber,
        ...rest,
        isUsed: false,
        addedBy: adminId,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "verifiedAlumni", admissionNumber), alumniData);

    return admissionNumber;
}

/**
 * Bulk add verified alumni from CSV data
 */
export async function bulkAddVerifiedAlumni(
    records: Array<Omit<VerifiedAlumni, "isUsed" | "addedBy" | "addedAt" | "updatedAt">>,
    adminId: string
): Promise<BulkImportResult> {
    if (!db) throw new Error("Firestore not initialized");

    const result: BulkImportResult = {
        total: records.length,
        successful: 0,
        failed: 0,
        errors: [],
    };

    for (const record of records) {
        try {
            await addVerifiedAlumni({ ...record, addedBy: adminId }, adminId);
            result.successful++;
        } catch (error) {
            result.failed++;
            result.errors.push({
                admissionNo: record.admissionNumber,
                reason: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }

    return result;
}

/**
 * Get a verified alumni record by admission number
 */
export async function getVerifiedAlumni(admissionNo: string): Promise<VerifiedAlumni | null> {
    if (!db) throw new Error("Firestore not initialized");

    const docRef = doc(db, "verifiedAlumni", admissionNo);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return null;
    }

    const data = docSnap.data() as Record<string, unknown> & {
        addedAt?: Timestamp;
        updatedAt?: Timestamp;
        claimedAt?: Timestamp;
        name?: string;
        fullName?: string;
    };
    
    return {
        ...data,
        // Support both 'name' (from admin panel) and 'fullName' (from type)
        fullName: data.fullName || data.name || "",
        addedAt: data.addedAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        claimedAt: data.claimedAt?.toDate(),
    } as VerifiedAlumni;
}

/**
 * Get all verified alumni with optional filters
 */
export async function getAllVerifiedAlumni(filters?: AlumniFilters): Promise<VerifiedAlumni[]> {
    if (!db) throw new Error("Firestore not initialized");

    const q = collection(db, "verifiedAlumni");
    const constraints: QueryConstraint[] = [];

    if (filters?.graduationYear) {
        constraints.push(where("graduationYear", "==", filters.graduationYear));
    }

    if (filters?.course) {
        constraints.push(where("course", "==", filters.course));
    }

    if (filters?.isUsed !== undefined) {
        constraints.push(where("isUsed", "==", filters.isUsed));
    }

    const queryRef = constraints.length > 0 ? query(q as any, ...constraints) : q;
    const snapshot = await getDocs(queryRef as any);

    let results = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as Record<string, unknown> & {
            addedAt?: Timestamp;
            updatedAt?: Timestamp;
            claimedAt?: Timestamp;
        };
        return {
            ...data,
            addedAt: data.addedAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            claimedAt: data.claimedAt?.toDate(),
        } as VerifiedAlumni;
    });

    // Client-side search filter
    if (filters?.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        results = results.filter(alumni =>
            alumni.fullName.toLowerCase().includes(searchLower) ||
            alumni.admissionNumber.toLowerCase().includes(searchLower)
        );
    }

    return results;
}

/**
 * Update a verified alumni record
 */
export async function updateVerifiedAlumni(
    admissionNo: string,
    data: Partial<Omit<VerifiedAlumni, "admissionNumber" | "addedBy" | "addedAt">>
): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const docRef = doc(db, "verifiedAlumni", admissionNo);

    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a verified alumni record
 */
export async function deleteVerifiedAlumni(admissionNo: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const alumniData = await getVerifiedAlumni(admissionNo);

    if (alumniData?.isUsed) {
        throw new Error("Cannot delete an admission number that has been claimed by a user");
    }

    await deleteDoc(doc(db, "verifiedAlumni", admissionNo));
}

/**
 * Validate an admission number
 */
export async function validateAdmissionNumber(
    admissionNo: string,
    userName?: string,
    graduationYear?: number
): Promise<ValidationResult> {
    const alumniData = await getVerifiedAlumni(admissionNo.toUpperCase());

    if (!alumniData) {
        return {
            isValid: false,
            status: "not_found",
            message: "Admission number not found in our records",
        };
    }

    if (alumniData.isUsed) {
        return {
            isValid: false,
            status: "already_used",
            message: "This admission number has already been registered",
            alumniData,
        };
    }

    // Check name match (fuzzy match)
    if (userName) {
        const nameSimilarity = calculateNameSimilarity(userName, alumniData.fullName);
        if (nameSimilarity < 0.6) {
            return {
                isValid: false,
                status: "name_mismatch",
                message: `Name mismatch. Expected: ${alumniData.fullName}`,
                alumniData,
                suggestedName: alumniData.fullName,
            };
        }
    }

    // Check graduation year - return warning but still allow verification
    // The year can be corrected from the alumni data
    if (graduationYear && alumniData.graduationYear && graduationYear !== alumniData.graduationYear) {
        // Still valid but with a warning - user can proceed with correct year from DB
        return {
            isValid: true,
            status: "year_corrected",
            message: `Graduation year adjusted to match records: ${alumniData.graduationYear}`,
            alumniData,
            suggestedName: alumniData.fullName,
            correctedYear: alumniData.graduationYear,
        };
    }

    return {
        isValid: true,
        status: "valid",
        message: "Admission number verified successfully",
        alumniData,
        suggestedName: alumniData.fullName,
    };
}

/**
 * Claim an admission number for a user
 */
export async function claimAdmissionNumber(
    admissionNo: string,
    userId: string
): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const alumniData = await getVerifiedAlumni(admissionNo.toUpperCase());

    if (!alumniData) {
        throw new Error("Admission number not found");
    }

    if (alumniData.isUsed) {
        throw new Error("Admission number already claimed");
    }

    await updateVerifiedAlumni(admissionNo.toUpperCase(), {
        isUsed: true,
        claimedBy: userId,
        claimedAt: new Date(),
    });
}

/**
 * Release an admission number (if user account is deleted)
 */
export async function releaseAdmissionNumber(admissionNo: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    await updateVerifiedAlumni(admissionNo.toUpperCase(), {
        isUsed: false,
        claimedBy: undefined,
        claimedAt: undefined,
    });
}

/**
 * Simple name similarity calculator (Levenshtein distance based)
 */
function calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    
    const s1 = name1.toLowerCase().trim();
    const s2 = name2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLength);
}

function levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s2.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s1.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) {
            costs[s1.length] = lastValue;
        }
    }
    return costs[s1.length];
}
