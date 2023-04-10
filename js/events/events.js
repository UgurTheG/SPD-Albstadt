class eventEntity {
  constructor(instance, objects) {
    this.instance = instance;
    this.objects = objects;
  }
}

let events = document.querySelector(".eintrag");
let event_parent_current = document.querySelector("#current");
let event_parent_next = document.querySelector("#next");

let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

let nextMonth = (currentMonth % 12) + 1;

document.querySelector("#kalendermonat").innerHTML = new Intl.DateTimeFormat(
  "de",
  { month: "long" }
).format(new Date());

fetch("../resources/data/events/events.json")
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    [
      new eventEntity(event_parent_current, data[currentYear][currentMonth]),
      new eventEntity(event_parent_next, data[currentYear][nextMonth]),
    ].forEach((eventEntry) => {
      eventEntry.objects.forEach((eventOccurence) => {
        const event_clone = events.cloneNode(true);
        eventEntry.instance.appendChild(event_clone);
        insertData(event_clone, eventOccurence);
      });
    });

    event_parent_current.removeChild(events);
  });

function insertData(event_clone, eventOccurence) {
  event_clone.querySelector(".name").innerHTML = eventOccurence.event;
  event_clone.querySelector(".event").innerHTML = eventOccurence.header;
  event_clone.querySelector(".text").innerHTML = eventOccurence.text;
  event_clone.querySelector(".time p").innerHTML = eventOccurence.time;
  event_clone.querySelector(".place p").innerHTML = eventOccurence.place;
  event_clone.querySelector(".imageArea img").src = eventOccurence.image;
}
