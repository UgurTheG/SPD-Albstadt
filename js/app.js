// Default
let images = []

for (let a = 1; a <= 5; a++) {
    images[a] = "resources/images/gallery/"+a+".jpeg"
}

let counter = 0

// Aktuelles

// News Preview
let partei_parent = document.querySelector(".partei .grid");
let partei_cell = partei_parent.querySelector(".cell");

fetch("../resources/data/data.json")
    .then((response) => {
        return response.json();
    })
    .then((data) => {

        const dataNewsFull = data.news_full
        for (let z = 0; z < dataNewsFull.length; z++) {
            const blog_clone = document.querySelector(".newspage .beitrag").cloneNode(true);
            document.querySelector(".newspage .beitrag").parentElement.appendChild(blog_clone);

            const { heading, date, text, image} = dataNewsFull[z];
            blog_clone.querySelector("h2").innerText = heading
            blog_clone.querySelector(".datum").innerText = date
            blog_clone.querySelector(".main").innerHTML = text
            blog_clone.querySelector("img").src = image
        }
        document.querySelector(".newspage").removeChild(document.querySelector(".newspage .beitrag"));

        for (let y = 0; y < data.news_fraktion.length; y++) {
            const clone_blog = document.querySelector("#fraktion_newspage .beitrag").cloneNode(true);
            document.querySelector("#fraktion_newspage .beitrag").parentElement.appendChild(clone_blog);
            const { heading, date, text, image} = data.news_fraktion[y];

            clone_blog.querySelector("h2").innerText = heading
            clone_blog.querySelector(".datum").innerText = date
            clone_blog.querySelector(".main").innerHTML = text
            clone_blog.querySelector("img").src = image
        }
        document.querySelector("#fraktion_newspage").removeChild(document.querySelector("#fraktion_newspage .beitrag"));

        let dataPartei = data.partei
        for (let l = 0; l < dataPartei.length; l++) {
            const partei_clone = partei_cell.cloneNode(true);
            partei_parent.appendChild(partei_clone);
            partei_clone.addEventListener("click", (e) => {
                e.currentTarget.parentElement.querySelectorAll(".active").forEach(f => f.classList.remove("active"));
                e.currentTarget.classList.toggle("active");
            });

            const { name, title, street, place, phone, mail, more, image } = dataPartei[l];

            partei_clone.querySelector(".name").innerHTML = name;
            partei_clone.querySelector(".text h2").innerHTML = name;
            partei_clone.querySelector(".text h3").innerHTML = title;
            partei_clone.querySelector(".partei_title").innerHTML = title

            if (mail !== "") {
                partei_clone.querySelector(".text .mail").innerHTML = "E-Mail: " + mail;
            }
            if (phone !== "") {
                partei_clone.querySelector(".text .phone").innerHTML = "Tel.: " + phone;
            }

            partei_clone.querySelector(".text .street").innerHTML = street;
            partei_clone.querySelector(".text .place").innerHTML = place;
            partei_clone.querySelector(".text .more").innerHTML = more;
            partei_clone.querySelector("img").src = image;
        }
        partei_parent.removeChild(partei_cell);
    });

document.querySelector(".content_abgeordneter .gallery .next").addEventListener("click", () => {
    counter++
    if (counter > images.length-1){
        counter = 1
    }
    document.querySelector(".gallery figure img").src = images[counter]
})

document.querySelector(".content_abgeordneter .gallery .previous").addEventListener("click", () => {
    document.querySelector(".gallery figure img").src = images[counter < 1 ? counter = images.length -1 : counter --]
})

let fraktioncell_partent = document.querySelector(".content_personen .flexbox .kreisraete .contents").childNodes
fraktioncell_partent.forEach(el => el.addEventListener('click', eventtt => {
    eventtt.currentTarget.classList.toggle("active")
}));

for (const element of ["aktuelles", "partei", "fraktion", "historie", "kontakte"]) {
   document.getElementById("trigger_"+element).addEventListener('click', _ => {
        document.getElementById("menu-icon").style.visibility = "visible";
    })
}

document.getElementById("menu-icon").addEventListener('click', _ => {
    document.getElementById("menu-icon").style.visibility = "hidden";
})

let fraktioncell_parent1 = document.querySelector(".content_personen .flexbox .gemeinderate .contents").childNodes
fraktioncell_parent1.forEach(el => el.addEventListener('click', eventt => {
    eventt.currentTarget.classList.toggle("active")
}));


let historie_heading = document.querySelectorAll(".absatz .text_heading")

historie_heading.forEach(el => el.addEventListener('click', ev =>  {
    ev.target.parentElement.classList.toggle("active")
}));