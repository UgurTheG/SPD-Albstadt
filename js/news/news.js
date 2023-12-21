const newsFigure = document.querySelector('#figure');
const previewItem = document.querySelector('.preview_item');

fetch('../resources/data/news/news.json')
  .then((response) => response.json())
  .then((data) => {
    data.news.forEach((dataNew) => {
      const newsClone = previewItem.cloneNode(true);
      newsFigure.appendChild(newsClone);

      newsClone.querySelector('h3').innerHTML = dataNew.heading;
      newsClone.querySelector('p').innerHTML = dataNew.text;
      newsClone.style.backgroundImage = `url(${dataNew.image})`;
    });
    newsFigure.removeChild(previewItem);
  });
