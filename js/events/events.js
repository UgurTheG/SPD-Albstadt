class eventEntity {
    constructor(eventInstance, eventObjects) {
        this.eventInstance = eventInstance;
        this.eventObjects = eventObjects;
    }
}

let events = document.querySelector(".eintrag");
let event_parent_current = document.querySelector("#current");
let event_parent_next = document.querySelector("#next");

let month = new Date().getMonth() + 1
let n_month = month % 12 + 1

let year = new Date().getFullYear()

const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

document.querySelector("#kalendermonat").innerHTML = months[month-1]

fetch("../resources/data/events/events.json")
.then((response) => {
    return response.json();
})
.then((data) => {
    [new eventEntity(event_parent_current, data[`${month}_${year}`]), new eventEntity(event_parent_next, data[`${n_month}_${year}`])].forEach(eventObject => {
        insertEvents(eventObject.eventInstance, eventObject.eventObjects)
    });
    
    event_parent_current.removeChild(events);
})

function insertEvents(eventParentObject, eventOccurenceList) {
    eventOccurenceList.forEach(eventOccurence => {
        const event_clone = events.cloneNode(true);
        eventParentObject.appendChild(event_clone);
        
        const { event, header, text, time, place, image } = eventOccurence;
        insertData(event_clone, event, header, text, time, place, image);
    })
}

function insertData(event_clone, header, event, text, time, place, image) {
    event_clone.querySelector(".name").innerHTML = event;
    event_clone.querySelector(".event").innerHTML = header;
    event_clone.querySelector(".text").innerHTML = text;
    event_clone.querySelector(".time p").innerHTML = time;
    event_clone.querySelector(".place p").innerHTML = place
    event_clone.querySelector(".imageArea img").src = image
}