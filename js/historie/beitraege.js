const historyPosts = document.querySelector('#accordion-nested-parent');
const templateHeading = document.querySelector('#accordion-collapse-heading-1');
const templateContent = document.querySelector('#accordion-collapse-body-1');
let idCounter = 0;

fetch('resources/data/historie/historie.json')
  .then((response) => response.json())
  .then((data) => {
    const fragment = document.createDocumentFragment();

    data.forEach((historyEntry) => {
      const historyPostHeading = templateHeading.cloneNode(true);
      const historyPostContent = templateContent.cloneNode(true);
      const headingId = `accordion-collapse-heading-${++idCounter}`;

      historyPostHeading.querySelector('#historyHeader').textContent = historyEntry.title;
      historyPostContent.querySelector('#historyContent').textContent = historyEntry.content;

      historyPostHeading.id = headingId;

      const button = historyPostHeading.querySelector('#historyButton');
      button.dataset.accordionTarget = `#accordion-collapse-body-${idCounter}`;
      button.setAttribute('aria-controls', `accordion-collapse-body-${idCounter}`);

      historyPostContent.id = `accordion-collapse-body-${idCounter}`;
      historyPostContent.setAttribute('aria-labelledby', headingId);

      historyEntry.images.forEach((imageSrc) => {
        const historyImage = document.createElement("img");
        historyImage.className = 'swiper-slide';
        historyImage.src = imageSrc;
        historyPostContent.querySelector('#historySlider').appendChild(historyImage);
      });

      fragment.appendChild(historyPostHeading);
      fragment.appendChild(historyPostContent);
    });
    historyPosts.removeChild(templateHeading);
    historyPosts.removeChild(templateContent);

    historyPosts.appendChild(fragment);
  })
  .catch(error => {
    console.error('Error fetching historical data:', error);
  });
