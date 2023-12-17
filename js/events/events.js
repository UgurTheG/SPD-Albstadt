let events = document.querySelector(".eintraege");
let eventObject = document.querySelector(".eintrag");
let event_parent_current = document.querySelector("#current");
let event_parent_next = document.querySelector("#next");

let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

let nextMonth = (currentMonth % 12) + 1;
let nextYear = (currentMonth % 12) + 1 == 1? currentYear + 1 : currentYear;

let currentMonthFormat = new Intl.DateTimeFormat(
  "de",
  { month: "long" }
).format(new Date());
document.querySelector("#kalendermonat").innerHTML = currentMonthFormat

let nextMonthFormat = new Intl.DateTimeFormat(
  "de",
  { month: "long" }
).format(new Date(nextYear, nextMonth -1));

fetch("../resources/data/events/Jahresplanung SPD Albstadt für die Homepage.xlsx")
  .then(response => response.arrayBuffer())
  .then(data => {
    const workbook = XLSX.read(data, { type: 'array' });
    for (const sheetName of workbook.SheetNames) {
      for (let sheetInfo of XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])) {
        let eventsClone = eventObject.cloneNode(true);
        eventsClone.style.display='';
        insertData(eventsClone, sheetInfo);
        if (sheetInfo.Datum.includes(currentYear) && sheetInfo.Datum.toLowerCase().includes(currentMonthFormat.toLowerCase())) {
          event_parent_current.appendChild(eventsClone);
        } else if (sheetInfo.Datum.includes(nextYear) && sheetInfo.Datum.toLowerCase().includes(nextMonthFormat.toLowerCase())) {
          event_parent_next.appendChild(eventsClone);
        }
      }
    }
  });

function insertData(eventClone, eventOccurence) {
  eventClone.querySelector(".name").innerHTML = "Veranstaltung";
  eventClone.querySelector(".event").innerHTML = eventOccurence.Name;
  eventClone.querySelector(".text").innerHTML = eventOccurence.Thema;
  eventClone.querySelector(".time p").innerHTML = eventOccurence.Datum;
  eventClone.querySelector(".place p").innerHTML = eventOccurence.Ort;
  eventClone.querySelector(".imageArea img").src = eventOccurence.Images;
}
