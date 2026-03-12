
    
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


export default async function handler(req, res) {   
    // 1. Security Check: Only allow POST requests.
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 2. Securely get the Supabase API key from Vercel's environment variables.
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: { message: "API key is not configured on the server." } });
    }

    try {
        // --- Step 3: Read the full  berita data from the server's file system ---
        const { data, error } = await supabase
            .from('redakto') //ini buat panggil nama tabel Redakto di Supabase
            .select('*') //ini buat ambil semua data dari tabel berita di Supabase 
            .limit(25); //ini buat batasi jumlah data yang diambil dari Supabase, misalnya 1000 data pertama, biar gak terlalu banyak dan berat saat diproses di serverless function ini. Kamu bisa sesuaikan limit ini sesuai kebutuhan dan kapasitas serverless function kita.

            if (error) {
                console.log("Error appeared while fetching data from Supabase:", error.message);
            }
            else {
                console.log("Data fetched successfully from Supabase:", data.length, "records");
            }

        
         // --- Step 4: Get user prompt and validate ---
        // --- OPTIMIZATION: Create a lightweight version of the data for the AI ---
        const { userPrompt } = req.body;
        const lightweightBeritaData = data.map(item => {
            return {
                category: item.news_kateg,
                title: item.news_title,
                content: item.news_content
            }
        });

        // --- Step 5: Construct the detailed system prompt using the lightweight data ---
        const systemPrompt = `
            # ROLE
            You are Redakto, an advanced news editor in Jawa Pos. You have a deep understanding of many types pf news with different topics and writing styles. You are also a skilled writer who can write in a warm and conversational tone, for light news. But you are also skilled in writing in a more formal and informative tone, for hard news. You can also write in a more creative and engaging way, for feature news.
            Your purpose is to provide helps for users to edit their raw news into a ready-to-publish news according to the topic and writing style they want. You will analyze the raw news, identify the key points, and rewrite it in a way that is clear, concise, with the right writing style and linguistic rules according the topic. You will also ensure that the news is accurate and follows journalistic standards. 
            You also must correct the typographical and grammatical errors in the user's raw news according to the correct Indonesian language rules. You will make sure that the news is well-structured and easy to read. You will also provide a conversational and engaging paragraph at the beginning of your response to address the user's raw news, before giving the recommendations for the rewritten news.
            # CONTEXT
            You will receive a user's raw news and a Supabase database of example of many news articles. The database contains the news' name category, news title, and news content. You will use this database to understand the different writing styles and topics, and to help you rewrite the user's raw news in a way that is suitable for the desired topic and writing style.
            and the following database of news examples that I provided below. Each news article in the database has a news category, title, and content. You will analyze the news category, title, and content to understand the writing style and topic of each news article. You will use this understanding to rewrite the user's raw news in a way that is suitable for the desired topic and writing style:
            ${JSON.stringify(lightweightBeritaData, null, 2)} 

            # TASK
            1. Analyze the user's raw news and identify the key points and the desired topic and writing style.
            2. Identify up to 3 of the most similar news articles from the database that match the user's desired topic and writing style. Study the news category, title, and content to understand the writing style and topic.
            3. Rewrite the user's raw news in a clear, concise, and engaging way that follows the identified writing style and topic. Ensure that the news provided is accurate and follows the correct writing styles according to the topic and correct linguistic standards.
            4. Edit and rewrite the typographical and grammatical errors in the user's raw news according to the correct Indonesian language rules. Ensure that the news is well-structured and easy to read.
            

            # OUTPUT FORMAT
            - Your response MUST be paragraphs of text.
            - The JSON object must have exactly four keys: "answer", "category", "title", and "content".
            - The answer must be started with a conversational and engaging paragraph that addresses the user's raw news before giving the recommendations for the rewritten news. This paragraph should be written in a warm and conversational tone, as if you are explaining the news to a friend, for example, "Wah, berita kausistika yang kamu buat ini menarik banget! Aku bisa bantu kamu untuk menyusunnya jadi lebih rapi dan enak dibaca. Yuk, kita buat contoh berita yang cocok dengan topik dan gaya penulisan yang kamu inginkan, biar kita bisa buat berita kamu jadi siap rilis!"
            - "category": A string containing the category of the rewritten news article, which should be the same as the category of the most similar news article you found in the database. If no similar news articles are found, this should be an empty string.
            - "title": A string containing the title of the rewritten news article.
            - "content": A string containing the rewritten news content of the raw news that you have rewritten.
            - Example for a successful match:
              {
                "answer": "Wah, berita kausistika yang kamu buat ini menarik banget! Aku bisa bantu kamu untuk menyusunnya jadi lebih rapi dan enak dibaca. Yuk, kita buat contoh berita yang cocok dengan topik dan gaya penulisan yang kamu inginkan, biar kita bisa buat berita kamu jadi siap rilis!",
                "category": "METROPOLIS",
                "title": "Bubarkan  Kerumunan dengan Lempar Batu atau Botol",
                "content": the rewritten news content that you have rewritten
                ]
              }
            - If  the user query is none about news or articles, for example, if the user says something like, "Apa itu hukum Archimedes?," or another question regarding scientific concepts or other topics none related to news or articles, the response should acknowledge the question but indicate that the AI cannot provide a recommendation based on the information given, and encourage the user to provide more news-related details .
              {
                "answer": "Waduh, sepertinya Redakto belum bisa memberikan rekomendasi atau jawaban. Coba jelaskan dengan kata-kata lain ya.",
                 "content": ""
              }
            - If the user query (raw news given is unclear or too vague), the "content" field MUST be empty, and the "answer" should encourage the user to provide more details.
              {
                 "answer": "Maaf, Redakto tidak dapat memahami berita kamu dengan jelas. Bisakah kamu memberikan lebih banyak detail?",
                 "content": ""
              }
            - If the user says something like, "Halo, saya butuh bantuan menyunting berita," the response should acknowledge the greeting and then ask for more details.
              {
                 "answer": "Halo! Redakto bisa membantu menyunting berita kamu. Apa yang ingin kamu sunting?",
                 "content": ""
              }
            - If the user says something like, "Terima kasih," the response should acknowledge the gratitude and offer further assistance.
              {
                 "answer": "Sama-sama! Jika ada berita lain yang ingin disunting lagi, jangan ragu untuk bertanya pada Redakto ya!",
                 "content": ""
              }
            - If the user says something like, "Bagaimana kabarmu?" the response should acknowledge the greeting and offer a friendly reply.
              {
                 "answer": "Halo! Redakto baik-baik saja, terima kasih. Bagaimana dengan kamu? Apakah ada yang bisa Redakto bantu?",
                 "content": ""
              }
            - If the user says something like, "Hai redakto" or "Halo redakto," the response should acknowledge the greeting and offer assistance.
              {
                 "answer": "Hai! Redakto di sini untuk membantu. Apa yang bisa Redakto bantu hari ini?",
                 "content": ""
              }
            
        `;

        // --- Step 6: Prepare and send the request to the Groq API ---
        const API_URL = `https://api.groq.com/openai/v1/chat/completions`;
        const payload = {
            model: "openai/gpt-oss-120b",
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
        const aiResponse = JSON.parse(responseText); //Kayak ngebuka paket jawaban yang dikirim AI dari Groq

        if (!aiResponse || !aiResponse.answer || !aiResponse.category || !aiResponse.title || !aiResponse.content) {
            throw new Error("AI response did not follow the required JSON format."); //Ngecek apakah isi paket ato jawaban AI sesai dengan format yang diminta, kalo gak sesuai, bakal error
        } //! = tidak. Jadi kalo isi jawabanny gak ada aiResponse, atau gak punya key answer, atau gak punya key category, atau gak punya key title, atau gak punya key content, maka bakal error.

        res.status(200).json({ //Kalo isi paket jawaban AI sesuai dnegan format, jawabannya bakal dikirim ke frontend
            pembuka: aiResponse.answer,
            category: aiResponse.category,
            title: aiResponse.title,
            content: aiResponse.content //tapi jawaban yg dikirim dibungkus lagi sama label baru (pembuka, category, title, content) biar lebih jelas dan gampang diproses di frontend dan lebih gampang saat dipanggil oleh js ke frontend.
        });
        



    } catch (error) { //ini buat nangkep error yang terjadi di serverless function ini, misalnya error saat fetch data dari Supabase, error saat request ke Groq API, atau error saat parsing response dari Groq API. Kalo ada error, bakal ditangkap disini dan dikirim ke frontend dengan status 500 (Internal Server Error) dan pesan error yang jelas.
        console.error("Error in serverless function:", error);
        res.status(500).json({ error: { message: `An internal server error occurred: ${error.message}` } });
    }
}