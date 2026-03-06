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
            1. Analyze the user's raw news and identify the key points and the desired topic and writing style.
            2. Identify up to 3 of the most similar news articles from the database that match the user's desired topic and writing style. Study the news category, title, and content to understand the writing style and topic.
            3. Rewrite the user's raw news in a clear, concise, and engaging way that follows the identified writing style and topic. Ensure that the news provided is accurate and follows the correct writing styles according to the topic and correct linguistic standards.
            

            # OUTPUT FORMAT
            - Your response MUST be paragraphs of text.
            - The Supabase object must have exactly three keys: "news category", "title", and "recommendations".
            - "news category": A string containing the news category of the rewritten news article, which should be the same as the news category of the most similar news article you found in the database. If no similar news articles are found, this should be an empty string.
            - "title": A string containing the title of the rewritten news article.
            - "recommendations": An array of strings, where each string is the rewritten news content of the the raw news that you have rewritten. The array should contain up to 3 rewritten news articles, depending on how many similar news articles you found in the database.
            - Example for a successful match:
              {
                "news category": "METROPOLIS",
                "title": "Bubarkan  Kerumunan dengan Lempar Batu atau Botol",
                "recommendations": [
                  "Keresahan Warga yang Terganggu Balapan Liar 

Balap liar tiap malam bikin resah masyarakat. Warga tak hanya mengandalkan aparat untuk membubarkan kerumunan. Mereka punyac ara sendiri menjaga wilayahnya agar bebas dariba lap liar.

Wiwit, warga Kelurahan Tenggilis Mejoyo, kerap mengusir anakanak dan pemuda yang terlibat balap liar di Jalan Panjang Jiwo. Mereka seringkali menutup jalan itu dengan sepeda motor. Lampu merah dijadikan garis start sekaligus finis. Warga terganggu dengan suara bising motor dan kehadiran mereka.

Wiwit bersama warga lainnya membubarkan gerombolan balap liar dengan melempar batu sampai botol air minum.

Karena massa cukup banyak, dia takut ada maksud lain seperti merampas barang atau tindakan kriminal lain. "Tak balang batu, kadang botol ya seadanya biar bubar pokoknya," terang Wiwit kemarin (21/12).

Seluruh pintu masuk perkampungan juga ditutup. Hanya ada satu pintu utama yang dibuka lebar. Itu pun dijaga warga. Pagar masuk kampung ditinggikan. "Mereka itu di jalanan pun berani menghadang pengendara. Makanya akhirnya kami usir," tuturnya.

Ahmad Samuji, warga Dukuh Menanggal mengungkapkan, kerap melihat anak usia SMP dan SMA balap liar di Jalan Ahmad Yani tak jauh dari mal. Biasanya mereka terlihat bergerombol sekitar pukul 00.30 WIB. Dia yang kerap lewat pada jam tersebut sangat terganggu. "Ya jam segitu kan jalanan relatif sepi. Biasanya mereka kejarkejaran sama polisi patroli," tuturnya.

Suprapto, warga Kelurahan Panjang Jiwo, menyampaikan, setiap Jumat dan Sabtu tengah malam selalu ada balap liar. Seperti di Jalan Jagir, Jalan Panjang Jiwo, dan Jalan Prapen. Warga yang berdagang dan baru pulang dari Pasar Mangga Dua takut di sepanjang jalan tersebut. Pedagang lebih banyak minggir saat ada balapan. "Mereka pilih kasih jalan daripada terjadi apaapa," ucapnya.

Ada Korban Jiwa

Balap liar tidak hanya mengganggu ketertiban dan kenyamanan melainkan juga berpotensi menyebabkan kecelakaan hingga korban jiwa. Achmad Dzaky. Warga Simogunung Barat Tol, hingga kini masih dikepung duka setelah meninggalnya sang ibunda, Shinta Iryani, pada awal Januari. Shinda diduga menjadi korban tabrakan kelompok balap liar di Jalan Diponegoro.

"Waktu itu ibu lewat di celah-celah kerumunan balap liar. Sudah menepi ke sisi kiri untuk menghindar gerombolan," ungkap Dzaky, pada Jawa Pos kemarin. Tiga penabrak sang ibu hingga meninggal tak diketahui keberadaannya sampai sekarang.(ida/leh/jun)"
                ]
              }
            - If  
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