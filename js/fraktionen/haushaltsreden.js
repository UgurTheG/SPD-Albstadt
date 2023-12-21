const startYear = 2023;
const endYear = 2016;

const ulElement = document.querySelector('.downloads ul');

for (let year = startYear; year >= endYear; year--) {
    const liElement = document.createElement('li');

    const aElement = document.createElement('a');
    aElement.setAttribute('href', `resources/Haushaltsrede für ${year}.pdf`);
    aElement.setAttribute('target', '_blank');
    aElement.setAttribute('rel', 'noopener noreferrer');
    aElement.textContent = `Haushaltsrede ${year}`;

    liElement.appendChild(aElement);

    ulElement.appendChild(liElement);
}
