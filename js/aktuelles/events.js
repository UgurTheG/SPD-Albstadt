const currentEvents = document.querySelector('#current');
const futureEvents = document.querySelector('#next');

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const nextMonth = (currentMonth % 12) + 1;
const nextYear = (currentMonth % 12) + 1 === 1 ? currentYear + 1 : currentYear;

const current = new Intl.DateTimeFormat(
  'de',
  { month: 'long' },
).format(new Date());
document.querySelector('#kalendermonat').innerHTML = `${current} ${currentYear}`;

const future = new Intl.DateTimeFormat(
  'de',
  { month: 'long' },
).format(new Date(nextYear, nextMonth - 1));
document.querySelector('#kalendernachmonat').innerHTML = `${future} ${nextYear}`;

function createHeadline(headline) {
  const headlineDiv = document.createElement('div');
  headlineDiv.className = 'headline';

  const eventDiv = document.createElement('div');
  eventDiv.className = 'event';
  eventDiv.innerHTML = 'Veranstaltung';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'name';
  nameDiv.innerHTML = headline;

  headlineDiv.appendChild(eventDiv);
  headlineDiv.appendChild(nameDiv);

  return headlineDiv;
}

function createTimeDiv(timeInformation) {
  const timeDiv = document.createElement('div');
  timeDiv.className = 'time';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'icon';
  const img = document.createElement('img');
  img.src = 'resources/images/calender.svg';
  img.alt = '';
  iconDiv.appendChild(img);

  const p = document.createElement('p');
  p.innerHTML = timeInformation;
  timeDiv.appendChild(iconDiv);
  timeDiv.appendChild(p);

  return timeDiv;
}

function createPlaceDiv(place) {
  const placeDiv = document.createElement('div');
  placeDiv.className = 'place';

  const iconDiv = document.createElement('div');
  iconDiv.className = 'icon';
  const img = document.createElement('img');
  img.src = 'resources/images/location.png';
  img.alt = '';
  iconDiv.appendChild(img);

  const p = document.createElement('p');
  p.innerHTML = place;
  placeDiv.appendChild(iconDiv);
  placeDiv.appendChild(p);

  return placeDiv;
}
function createDetails(sheetInfo) {
  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'details';

  const timeDiv = createTimeDiv(sheetInfo.Datum);
  const placeDiv = createPlaceDiv(sheetInfo.Ort);

  detailsDiv.appendChild(timeDiv);
  detailsDiv.appendChild(placeDiv);

  return detailsDiv;
}
function createDescription(sheetInfo) {
  const descriptionDiv = document.createElement('div');
  descriptionDiv.className = 'description';

  const textDiv = document.createElement('div');
  textDiv.className = 'text';
  textDiv.textContent = sheetInfo.Thema || 'Veranstaltung';

  const detailsDiv = createDetails(sheetInfo);

  descriptionDiv.appendChild(textDiv);
  descriptionDiv.appendChild(detailsDiv);

  return descriptionDiv;
}

function createStructure(sheetInfo) {
  const eintragDiv = document.createElement('div');
  eintragDiv.className = 'eintrag';

  const informationenDiv = document.createElement('div');
  informationenDiv.className = 'informationen';

  const headlineDiv = createHeadline(sheetInfo.Name);
  const descriptionDiv = createDescription(sheetInfo);

  informationenDiv.appendChild(headlineDiv);
  informationenDiv.appendChild(descriptionDiv);

  const imageAreaDiv = document.createElement('div');
  imageAreaDiv.className = 'imageArea';
  const img = document.createElement('img');
  img.src = sheetInfo.Images || '';
  img.alt = '';
  imageAreaDiv.appendChild(img);

  eintragDiv.appendChild(informationenDiv);
  eintragDiv.appendChild(imageAreaDiv);
  return eintragDiv;
}
function checkDateTime(sheetDate, sheetTime, sheetMonth) {
  return sheetDate.includes(sheetTime) && sheetDate.toLowerCase().includes(sheetMonth);
}
fetch('../resources/data/aktuelles/Termine.xlsx')
  .then((response) => response.arrayBuffer())
  .then((data) => {
    const workbook = XLSX.read(data, { type: 'array' });
    workbook.SheetNames.forEach((sheetName) => {
      XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]).forEach((sheetInfo) => {
        const eventElement = createStructure(sheetInfo);
        if (checkDateTime(sheetInfo.Datum, currentYear, current.toLowerCase())) {
          currentEvents.appendChild(eventElement);
        } else if (checkDateTime(sheetInfo.Datum, nextYear, future.toLowerCase())) {
          futureEvents.appendChild(eventElement);
        }
      });
    });
  });
