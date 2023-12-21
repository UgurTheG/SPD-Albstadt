const lineDiv = document.querySelector('.line');

for (let startYear = 1965; startYear <= 2025; startYear += 5) {
  const yearDiv = document.createElement('div');
  yearDiv.textContent = startYear;
  lineDiv.appendChild(yearDiv);
}
const slide = document.querySelector('.slide');

fetch('resources/data/historie/kommunalePersoenlichkeiten.json')
  .then((response) => response.json())
  .then((data) => {
    data.forEach((item) => {
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';

      const textArea = document.createElement('div');
      textArea.className = 'textArea';

      const h3 = document.createElement('h3');
      h3.textContent = item.name;

      const p = document.createElement('p');
      item.roles.forEach((role) => {
        p.innerHTML += `${role.role}<br />${role.period}<br />`;
      });

      const imgArea = document.createElement('div');
      imgArea.className = 'imgArea';

      let imagePath = 'resources/images/logo.png';
      const img = document.createElement('img');
      if (item.img !== '') {
        imagePath = `resources/images/timeline/${item.img}`;
      }
      img.src = imagePath;
      img.alt = '';

      textArea.appendChild(h3);
      textArea.appendChild(p);

      imgArea.appendChild(img);

      timestamp.appendChild(textArea);
      timestamp.appendChild(imgArea);

      slide.appendChild(timestamp);
    });
  });
