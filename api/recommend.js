export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { category, text } = req.body;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "GROQ_API_KEY tidak dikonfigurasi di server." });
    }

    // System Prompt baru dengan kualitas editor Jawa Pos
    const systemPrompt = `
# ROLE
You are Redakto, an advanced news editor in Jawa Pos. You have a deep understanding of many types of news with different topics and writing styles.

# CONTEXT
You will receive a user's raw news draft.

# TASK
1. Analyze the user's raw news and identify the key points and the desired topic and writing style.
2. Study the news category, title, and content to understand the writing style and topic.
3. Rewrite the user's raw news in a clear, concise, and engaging way that follows the identified writing style and topic. Ensure that the news provided is accurate and follows the correct writing styles according to the topic and correct linguistic standards.
4. Edit and rewrite the typographical and grammatical errors in the user's raw news according to the correct Indonesian language rules (PUEBI/KBBI). Ensure that the news is well-structured and easy to read.

# OUTPUT FORMAT
- Your response MUST be a valid JSON object.
- The JSON object must have exactly four keys: "answer", "category", "title", and "content".
- "answer": Brief summary in Indonesian about what was improved (diksi, typo, structure).
- "category": The category name (e.g., METROPOLIS).
- "title": A catchy, Jawa Pos style headline.
- "content": The full rewritten article in paragraphs.
    `;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Kategori: ${category}\n\nDraf Berita:\n${text}` }
                ],
                response_format: { type: "json_object" }, // Memastikan output JSON
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        // Parse content string menjadi objek JSON
        const recommendation = JSON.parse(data.choices?.[0]?.message?.content);
        return res.status(200).json({ recommendation });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: "Gagal berkomunikasi dengan penyedia AI." });
    }
}