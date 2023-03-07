let news_parent = document.querySelector("#figure");
let preview_item = document.querySelector(".preview_item");

fetch("../resources/data/news/news.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        for (const dataNew of data.news) {
            const news_clone = preview_item.cloneNode(true);
            news_parent.appendChild(news_clone);

            news_clone.querySelector("h3").innerHTML = dataNew.heading;
            news_clone.querySelector("p").innerHTML = dataNew.text;
            news_clone.style.backgroundImage = "url(" + dataNew.image + ")"
        }
        news_parent.removeChild(preview_item);
    })