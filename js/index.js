const left = document.querySelector(".title");
const right = document.querySelector(".navigator");
const content = document.querySelector(".menupunkt");
const browserhistory = [];
const navs = [".aktuelles", ".partei", ".fraktion", ".historie", ".kontakte"];
const navTrigger = [
  "#trigger_aktuelles",
  "#trigger_partei",
  "#trigger_fraktion",
  "#trigger_historie",
  "#trigger_kontakte",
];
for (const contentKey of navs) {
  document.querySelector(contentKey).style.display = "none";
}

for(const navTriggerElement of navTrigger){
  const navAnchor = document.querySelector(navTriggerElement);
    navAnchor.addEventListener("click", function (event) {
      event.preventDefault();
      browserhistory.push(navTriggerElement)
  })
}
const returnToHome = document.querySelector("#menu-icon");
returnToHome.addEventListener("click", function (event) {
      event.preventDefault();
      browserhistory.pop();
  })

document.addEventListener("keydown", KeyCheck);  //or however you are calling your method
function KeyCheck(event)
{
   var KeyID = event.keyCode;
   switch(KeyID)
   {
    case 8:
      if (browserhistory.length !== 0) {
        browserhistory.pop();
        document.getElementById("menu-icon").click();
      }
   }
}


//aktuelles
document.querySelector(".trigger_aktuelles").onclick = function () {
  left.classList.toggle("active");
  right.classList.toggle("active");
  content.classList.toggle("active");
  document.querySelector(".bottom").classList.remove("active");
  document.querySelector(".top").classList.remove("active");

  document.querySelector(".aktuelles").style.display = "block";
  document.querySelector(".aktuelles .mainpage").style.display = "block";
  document.querySelector(".aktuelles .newspage").style.display = "none";
  document.querySelector(".partei").style.display = "none";
  document.querySelector(".fraktion").style.display = "none";
  document.querySelector(".historie").style.display = "none";
  document.querySelector(".kontakte").style.display = "none";
};
//partei
document.querySelector(".trigger_partei").onclick = function () {
  left.classList.toggle("active");
  right.classList.toggle("active");
  content.classList.toggle("active");
  document.querySelector(".bottom").classList.remove("active");
  document.querySelector(".top").classList.remove("active");
  document.querySelector("#partei").classList.add("active");
  document.querySelector("#toPartei").classList.add("active");

  document.querySelector(".aktuelles").style.display = "none";
  document.querySelector(".partei").style.display = "block";
  document.querySelector(".fraktion").style.display = "none";
  document.querySelector(".historie").style.display = "none";
  document.querySelector(".kontakte").style.display = "none";
};
//fraktion
document.querySelector(".trigger_fraktion").onclick = function () {
  left.classList.toggle("active");
  right.classList.toggle("active");
  content.classList.toggle("active");
  document.querySelector(".bottom").classList.remove("active");
  document.querySelector(".top").classList.remove("active");
  document.querySelector("#toMand").classList.add("active");

  document.querySelector(".aktuelles").style.display = "none";
  document.querySelector(".partei").style.display = "none";
  document.querySelector(".fraktion").style.display = "block";
  document.querySelector(".historie").style.display = "none";
  document.querySelector(".kontakte").style.display = "none";

  document.querySelector(".content_personen").classList.add("active");

  document
    .querySelectorAll(".selector ul li.active")
    .forEach((f) => f.classList.remove("active"));
  // document.querySelectorAll(".selector ul li")[0].classList.add("active")
  //selector.classList.remove("active");
};
//historie
document.querySelector(".trigger_historie").onclick = function () {
  left.classList.toggle("active");
  right.classList.toggle("active");
  content.classList.toggle("active");
  document.querySelector(".bottom").classList.remove("active");
  document.querySelector(".top").classList.remove("active");

  document.querySelector(".aktuelles").style.display = "none";
  document.querySelector(".partei").style.display = "none";
  document.querySelector(".fraktion").style.display = "none";
  document.querySelector(".historie").style.display = "block";
  document.querySelector(".kontakte").style.display = "none";
};
//kontakte
document.querySelector(".trigger_kontakte").onclick = function () {
  left.classList.toggle("active");
  right.classList.toggle("active");
  content.classList.toggle("active");
  document.querySelector(".bottom").classList.remove("active");
  document.querySelector(".top").classList.remove("active");

  document.querySelector(".aktuelles").style.display = "none";
  document.querySelector(".partei").style.display = "none";
  document.querySelector(".fraktion").style.display = "none";
  document.querySelector(".historie").style.display = "none";
  document.querySelector(".kontakte").style.display = "block";
};

document.querySelector(".menu-icon").onclick = function () {
  left.classList.toggle("active");
  right.classList.toggle("active");
  document.querySelector(".bottom").classList.toggle("active");
  document.querySelector(".top").classList.toggle("active");

  document.querySelector(".loading").style.animation = "none";
  document.querySelector("#loading_icon").style.animation = "none";
};

document.querySelector("#toNews").onclick = function () {
  document.querySelector(".loading").style.animation =
    "loading 2s cubic-bezier( 0.4, 0.51, 0.19, 1)";
  document.querySelector("#loading_icon").style.animation =
    "rotate 3s infinite";

  setTimeout(function () {
    document.querySelector(".aktuelles").style.display = "block";
    document.querySelector(".aktuelles .mainpage").style.display = "none";
    document.querySelector(".aktuelles .newspage").style.display = "block";
    document.querySelector(".partei").style.display = "none";
    document.querySelector(".fraktion").style.display = "none";
    document.querySelector(".historie").style.display = "none";
    document.querySelector(".kontakte").style.display = "none";
    window.scrollTo(0, 0);
  }, 300);
};

const menup = document.querySelector("#menu_partei");
const parteimenu_parent = menup.querySelector("ul").childNodes;

parteimenu_parent.forEach((el) =>
  el.addEventListener("click", (event) => {
    event.currentTarget.parentElement
      .querySelectorAll(".active")
      .forEach((f) => f.classList.remove("active"));
    event.target.classList.add("active");
  })
);

document.querySelector("#toPartei").onclick = function () {
  document.querySelector("#schwerpunkte").classList.remove("active");
  document.querySelector("#abgeordneter").classList.remove("active");
  document.querySelector("#partei").classList.add("active");
  document.querySelector("#parteiinfo").innerHTML =
    "Das sind die Mitglieder des SPD Albstadt Vorstandes, dieser wurde bei der Jahreshauptversammlung im Juli 2022 gewählt. ";
};
document.querySelector("#toSchwerpunkte").onclick = function () {
  document.querySelector("#schwerpunkte").classList.add("active");
  document.querySelector("#abgeordneter").classList.remove("active");
  document.querySelector("#partei").classList.remove("active");
  document.querySelector("#parteiinfo").innerHTML =
    "Im Mittelpunkt unserer politischen Arbeit für Albstadt stehen die folgenden Punkte. Haben wir dieselbe Meinung, dann lasst Ihr uns das Wissen und wir versuchen gemeinsam das umzusetzen. ";
};
document.querySelector("#toAbgeordneter").onclick = function () {
  document.querySelector("#schwerpunkte").classList.remove("active");
  document.querySelector("#abgeordneter").classList.add("active");
  document.querySelector("#partei").classList.remove("active");
  document.querySelector("#parteiinfo").innerHTML =
    "Robin Mesarosch ist seit der Bundestagswahl 2021 unser Abgeordneter für den Wahlkreis Zollernalb-Sigmaringen. In Berlin ist er in den Ausschüssen für Digitalisierung sowie Klimaschutz und Energie. Darum kämpft er auch in unserer Region und unserer Stadt für diese Themen. Für mehr Informationen zu seiner Arbeit entweder bei Facebook, Instagram oder Twitter vorbeischauen oder auf den unteren roten Balken mit Robin Mesarosch klicken und Ihr kommt auf seine Website. ";
};

const menuf = document.querySelector("#menu_fraktion");
const fraktionmenu_parent = menuf.querySelector("ul").childNodes;

fraktionmenu_parent.forEach((ele) =>
  ele.addEventListener("click", (event) => {
    event.currentTarget.parentElement
      .querySelectorAll(".active")
      .forEach((f) => f.classList.remove("active"));
    event.target.classList.add("active");
  })
);

document.querySelector("#toMand").onclick = function () {
  document.querySelector(".content_personen").classList.add("active");
  document.querySelector(".content_ausfraktion").classList.remove("active");
  document.querySelector("#fraktioninfo").innerHTML =
    "Das sind unsere Mitglieder, die erfolgreich bei den letzten Kommunalwahlen waren. Nun gestalten sie Politik vor Ort mit, entweder im Gemeinderat Albstadt oder im Kreistag Zollernalb. Wollt Ihr mehr zu unserer Arbeit wissen, dann schaut bei der Rubrik „Neues aus der Fraktion“ vorbei. ";
};
document.querySelector("#toNewsFraktion").onclick = function () {
  document.querySelector(".content_personen").classList.remove("active");
  document.querySelector(".content_ausfraktion").classList.add("active");
  document.querySelector("#fraktioninfo").innerHTML =
    "Bei dieser Rubrik teilen wir unsere Ansichten, Inhalte und wie wir bei wichtigen Abstimmungen entschieden haben. Das in kürze und auf den Punkt gebracht. ";
};
