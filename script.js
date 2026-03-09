// =============================
// START WRITING BUTTON (HOME)
// =============================

const startButton = document.querySelector(".start-btn");

if (startButton) {
    startButton.addEventListener("click", function () {
        window.location.href = "editor.html";
    });
}


// =============================
// OPEN NEWS TYPE LIST
// =============================

const newsBtn = document.getElementById("newsBtn");
const newsList = document.getElementById("newsList");

if (newsBtn) {
    newsBtn.addEventListener("click", function () {

        if (newsList.style.display === "block") {
            newsList.style.display = "none";
        } else {
            newsList.style.display = "block";
        }

    });
}


// =============================
// SELECT NEWS TYPE
// =============================

const items = document.querySelectorAll(".news-list div");

items.forEach(item => {

    item.addEventListener("click", function () {

        newsBtn.innerText = this.innerText;
        newsList.style.display = "none";

    });

});


// =============================
// AI PROCESSING BUTTON
// =============================

const aiBtn = document.getElementById("aiBtn");
const processingCard = document.getElementById("processingCard");
const aiResult = document.getElementById("aiResult");

if(aiBtn){

aiBtn.addEventListener("click", function(){

processingCard.style.display = "block";
aiResult.style.display = "none";

setTimeout(function(){

processingCard.style.display = "none";
aiResult.style.display = "block";

},2000);

});

}