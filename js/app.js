// News Preview
fetch('../resources/data/news/news.json')
  .then((response) => response.json())
  .then((data) => {
    const dataNewsFull = data.news;
    dataNewsFull.forEach((element) => {
      const newsPageBeitrag = document.querySelector('.newspage .beitrag').cloneNode(true);
      document.querySelector('.newspage').appendChild(newsPageBeitrag);

      const {
        heading, date, text, image,
      } = element;
      newsPageBeitrag.querySelector('h2').innerText = heading;
      newsPageBeitrag.querySelector('.datum').innerText = date;
      newsPageBeitrag.querySelector('.main').innerHTML = text;
      newsPageBeitrag.querySelector('img').src = image;
    });

    document.querySelector('.newspage').removeChild(document.querySelector('.newspage .beitrag'));
  });

  fetch('../resources/data/data.json')
  .then((response) => response.json())
  .then((data) => {
data.news_fraktion.forEach((element) => {
      const newsPageBeitragClone = document.querySelector('#fraktion_newspage .beitrag').cloneNode(true);
      document.querySelector('#fraktion_newspage').appendChild(newsPageBeitragClone);
      const {
        heading, date, text, image,
      } = element;

      newsPageBeitragClone.querySelector('h2').innerText = heading;
      newsPageBeitragClone.querySelector('.datum').innerText = date;
      newsPageBeitragClone.querySelector('.main').innerHTML = text;
      newsPageBeitragClone.querySelector('img').src = image;
    });

    document.querySelector('#fraktion_newspage').removeChild(document.querySelector('#fraktion_newspage .beitrag'));
  });


['aktuelles', 'partei', 'fraktion', 'historie', 'kontakte'].forEach((element) => {
  document.getElementById(`trigger_${element}`).addEventListener('click', () => {
    document.getElementById('menu-icon').style.visibility = 'visible';
  });
});

document.getElementById('menu-icon').addEventListener('click', () => {
  document.getElementById('menu-icon').style.visibility = 'hidden';
});

const historieHeading = document.querySelectorAll('.absatz .text_heading');

historieHeading.forEach((el) => el.addEventListener('click', (ev) => {
  ev.target.parentElement.classList.toggle('active');
}));
