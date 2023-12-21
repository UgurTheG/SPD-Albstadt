const container = document.getElementById('historiebeitraege');

fetch('resources/data/historie/historie.json')
  .then((response) => response.json())
  .then((data) => {
    data.forEach((period) => {
      const absatzDiv = document.createElement('div');
      absatzDiv.className = 'absatz';

      const heading = document.createElement('h3');
      heading.className = 'text_heading';
      heading.innerHTML = `${period.title} <div class="arrow"><</div>`;
      absatzDiv.appendChild(heading);

      const contentParagraph = document.createElement('p');
      contentParagraph.className = 'textcontent';
      contentParagraph.innerHTML = period.content;
      contentParagraph.style.textAlign = 'justify';
      absatzDiv.appendChild(contentParagraph);

      const imgAreaDiv = document.createElement('div');
      imgAreaDiv.className = 'imgArea';
      const figure = document.createElement('figure');
      period.images.forEach((imageSrc) => {
        const img = document.createElement('img');
        img.src = imageSrc;
        figure.appendChild(img);
      });
      imgAreaDiv.appendChild(figure);

      absatzDiv.appendChild(imgAreaDiv);
      absatzDiv.childNodes.forEach((el) => el.addEventListener('click', (ev) => {
        ev.target.parentElement.classList.toggle('active');
      }));
      container.appendChild(absatzDiv);
    });
  });
