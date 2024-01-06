const startYear = 2023;
const endYear = 2016;

const ulElement = document.querySelector('.downloads ul');

for (let year = startYear; year >= endYear; year -= 1) {
  const liElement = document.createElement('li');
liElement.className = 'list-disc';
  const aElement = document.createElement('a');
  aElement.setAttribute('href', `resources/data/fraktion/haushaltsreden/${year}.pdf`);
  aElement.setAttribute('target', '_blank');
  aElement.setAttribute('rel', 'noopener noreferrer');
  aElement.textContent = `Haushaltsrede ${year}`;

  liElement.appendChild(aElement);

  ulElement.appendChild(liElement);
}
