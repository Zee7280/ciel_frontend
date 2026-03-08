export interface AISummaryResponse {
    summary?: string;
    error?: string;
}

export async function generateAISummary(section: string, data: any): Promise<AISummaryResponse> {
    try {
        const response = await fetch("/api/ai/summarize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ section, data }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to generate summary");
        }

        return await response.json();
    } catch (error: any) {
        return { error: error.message };
    }
}
