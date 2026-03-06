// File: /api/recommend.js
// This is a Vercel Serverless Function that acts as a secure backend.

// Import Node.js modules to read files from the server's file system
import path from 'path';
import { promises as fs } from 'fs';

/**
 * Handles the incoming request from the frontend.
 * @param {object} req - The request object, containing the user's prompt.
 * @param {object} res - The response object, used to send the result back to the frontend.
 */
export default async function handler(req, res) {
    // 1. Security Check: Only allow POST requests.
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 2. Securely get the Groq API key from Vercel's environment variables.
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: { message: "API key is not configured on the server." } });
    }

    try {
        // --- Step 3: Read the full Jamu data from the server's file system ---
        const jsonDirectory = path.join(process.cwd(), 'data');
        const fileContents = await fs.readFile(path.join(jsonDirectory, 'jamu.json'), 'utf8');
        const jamuData = JSON.parse(fileContents);

        // --- Step 4: Get user prompt and validate ---
        const { userPrompt } = req.body;
        if (!userPrompt) {
            return res.status(400).json({ error: { message: "Missing userPrompt in the request body." } });
        }
        
        // --- OPTIMIZATION: Create a lightweight version of the data for the AI ---
        // We remove the 'Cara Membuat' field as it's long and not needed for the initial recommendation.
        const lightweightJamuData = jamuData.map(item => {
            const { Nama, Manfaat, Funfact, Daerah } = item;
            return { Nama, Manfaat, Funfact, Daerah };
        });

        // --- Step 5: Construct the detailed system prompt using the lightweight data ---
        const systemPrompt = `
            # ROLE
            You are Redakto, an advanced news editor in Jawa Pos. You have a deep understanding of many types pf news with different topics and writing styles. You are also a skilled writer who can write in a warm and conversational tone, for light news.
            Your purpose is to provide helps for users to edit their raw news into a ready-to-publish news according to the topic and writing style they want. You will analyze the raw news, identify the key points, and rewrite it in a way that is clear, concise, with the right writing style and linguistic rules according the topic. You will also ensure that the news is accurate and follows journalistic standards. 

            # CONTEXT
            You will receive a user's raw news and a Supabase database of example of many news articles. The database contains the news' name category, news title, and news content. You will use this database to understand the different writing styles and topics, and to help you rewrite the user's raw news in a way that is suitable for the desired topic and writing style.
            Database:
            ${JSON.stringify(lightweightJamuData, null, 2)}

            # TASK
            1. Analyze the user's query to understand their needs, symptoms, or preferences.
            2. Identify up to 3 of the most suitable Jamu from the database based on the query.
            3. Generate a warm, conversational response as Mbok Sri introducing your recommendations in Indonesian. Start with something like "Tentu, ini yang bisa saya rekomendasikan untuk kamu..." and briefly mention why you chose them.
            4. After your conversational answer, provide the exact names of the recommended Jamu for the system to process.

            # OUTPUT FORMAT
            - Your response MUST be a single, valid JSON object.
            - The JSON object must have exactly two keys: "answer" and "recommendations".
            - "answer": A string containing your friendly, conversational response in Indonesian.
            - "recommendations": An array of strings, where each string is the exact 'Nama' of a recommended item from the database.
            - Example for a successful match:
              {
                "answer": "Tentu, untuk keluhanmu, sepertinya Jamu Kunyit Asam dan Wedang Uwuh sangat cocok. Keduanya bisa membantu menyegarkan badan dan meredakan pegal-pegal.",
                "recommendations": ["Jamu Kunyit Asam", "Wedang Uwuh"]
              }
            - If no matches are found, the "recommendations" array MUST be empty, and the "answer" should politely state that nothing suitable was found.
              {
                "answer": "Waduh, sepertinya Mbok belum menemukan jamu yang pas untuk keluhanmu. Coba jelaskan dengan kata-kata lain ya.",
                 "recommendations": []
              }
            - If the user query is unclear or too vague, the "recommendations" array MUST be empty, and the "answer" should encourage the user to provide more details.
              {
                 "answer": "Maaf, Mbok belum dapat memahami keluhanmu dengan jelas. Bisakah kamu memberikan lebih banyak detail?",
                 "recommendations": []
              }
            - If the user says something like, "Halo, saya butuh rekomendasi jamu," the response should acknowledge the greeting and then ask for more details.
              {
                 "answer": "Halo! Mbok bisa membantu merekomendasikan jamu. Apa keluhan atau kebutuhan kamu?",
                 "recommendations": []
              }
            - If the user says something like, "Terima kasih," the response should acknowledge the gratitude and offer further assistance.
              {
                 "answer": "Sama-sama! Jika ada yang ingin ditanyakan lagi, jangan ragu untuk bertanya pada Mbok ya!",
                 "recommendations": []
              }
            - If the user says something like, "Bagaimana kabarmu?" the response should acknowledge the greeting and offer a friendly reply.
              {
                 "answer": "Halo! Mbok baik-baik saja, terima kasih. Bagaimana dengan kamu? Apakah ada yang bisa Mbok bantu?",
                 "recommendations": []
              }
            - If the user says something like, "Hai mbok" or "Halo mbok," the response should acknowledge the greeting and offer assistance.
              {
                 "answer": "Hai! Mbok di sini untuk membantu. Apa yang bisa Mbok bantu hari ini?",
                 "recommendations": []
              }
            - Do NOT include any other text, explanations, or markdown formatting outside the JSON structure.
        `;

        // --- Step 6: Prepare and send the request to the Groq API ---
        const API_URL = `https://api.groq.com/openai/v1/chat/completions`;
        const payload = {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { "type": "json_object" }
        };

        const groqResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!groqResponse.ok) {
            const errorBody = await groqResponse.json();
            console.error("Groq API Error:", errorBody);
            throw new Error(`API Error: ${groqResponse.status} - ${errorBody.error?.message || 'Unknown error'}`);
        }

        const result = await groqResponse.json();
        const responseText = result.choices[0]?.message?.content;
        if (!responseText) {
            throw new Error("AI response was empty or malformed.");
        }

        // --- Step 7: Process the AI response and send results to the client ---
        const aiResponse = JSON.parse(responseText);

        if (!aiResponse || typeof aiResponse.answer !== 'string' || !Array.isArray(aiResponse.recommendations)) {
            throw new Error("AI response did not follow the required JSON format.");
        }

        const recommendedNames = aiResponse.recommendations;
        
        // Filter the ORIGINAL full jamuData to find the complete objects for the recommended items
        const foundItems = jamuData.filter(item => recommendedNames.includes(item.Nama));

        // Send a new object containing both the AI's conversational answer and the FULL item data
        res.status(200).json({
            aiAnswer: aiResponse.answer,
            recommendedItems: foundItems
        });

    } catch (error) {
        console.error("Error in serverless function:", error);
        res.status(500).json({ error: { message: `An internal server error occurred: ${error.message}` } });
    }
}