// =============================
// CONFIGURATION & STATE
// =============================

/**
 * VERCEL CONFIGURATION
 * Dengan Vercel Dev, frontend memanggil serverless functions.
 * Endpoint "/api/recommend" akan dipetakan secara otomatis ke
 * file yang berada di /api/recommend.js.
 */
const BACKEND_URL = "/api/recommend";

let selectedCategory = "";

// =============================
// SELECTORS
// =============================
const startButton = document.querySelector(".start-btn");
const newsBtn = document.getElementById("newsBtn");
const newsList = document.getElementById("newsList");
const newsItems = document.querySelectorAll(".news-list div");
const newsInput = document.querySelector(".news-input");
const aiBtn = document.getElementById("aiBtn");
const processingCard = document.getElementById("processingCard");
const aiResult = document.getElementById("aiResult");
const aiResultText = aiResult?.querySelector("p");

// =============================
// NAVIGATION
// =============================
if (startButton) {
    startButton.addEventListener("click", () => {
        window.location.href = "editor.html";
    });
}

// =============================
// CATEGORY SELECTION
// =============================
if (newsBtn && newsList) {
    newsBtn.addEventListener("click", () => {
        newsList.style.display = newsList.style.display === "block" ? "none" : "block";
    });

    newsItems.forEach(item => {
        item.addEventListener("click", function () {
            selectedCategory = this.innerText;
            newsBtn.innerText = `Category: ${selectedCategory}`;
            newsList.style.display = "none";
            newsBtn.style.background = "#e0e0e0"; 
        });
    });
}

// =============================
// AI CORE LOGIC (VERCEL API CALL)
// =============================

/**
 * Mengirim draf ke Vercel Serverless Function
 */
async function getAIRecommendation(category, text) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ category, text })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Server Error");
        }

        // Sekarang kita mengembalikan objek JSON lengkap (answer, category, title, content)
        return result.recommendation;
    } catch (error) {
        throw error;
    }
}

// =============================
// UI INTERACTION
// =============================
if (aiBtn) {
    aiBtn.addEventListener("click", async () => {
        const textValue = newsInput.value.trim();

        if (!selectedCategory) {
            alert("Silakan pilih Kategori Berita terlebih dahulu!");
            return;
        }
        if (!textValue) {
            alert("Silakan ketik draf berita Anda sebelum meminta rekomendasi.");
            return;
        }

        processingCard.style.display = "block";
        aiResult.style.display = "none";
        aiBtn.disabled = true;
        aiBtn.innerText = "SEDANG MEMPROSES...";

        try {
            const recommendation = await getAIRecommendation(selectedCategory, textValue);
            
            // Format tampilan hasil AI dari objek JSON
            const formattedHTML = `
                <div style="margin-bottom: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px; border-left: 5px solid #0f2137;">
                    <strong>Ringkasan Editor:</strong><br>
                    ${recommendation.answer}
                </div>
                <div style="margin-bottom: 10px;">
                    <span style="background: #0f2137; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        ${recommendation.category}
                    </span>
                </div>
                <h2 style="font-size: 24px; margin-bottom: 15px; color: #333;">${recommendation.title}</h2>
                <div style="white-space: pre-wrap; line-height: 1.8; text-align: justify;">
                    ${recommendation.content}
                </div>
            `;

            aiResultText.innerHTML = formattedHTML;
            aiResult.style.display = "block";
        } catch (error) {
            console.error("Vercel API Error:", error);
            aiResultText.innerText = "Kesalahan: " + error.message;
            aiResult.style.display = "block";
        } finally {
            processingCard.style.display = "none";
            aiBtn.disabled = false;
            aiBtn.innerText = "GET AI RECOMMENDATIONS";
        }
    });
}