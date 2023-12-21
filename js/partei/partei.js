const parteiParent = document.querySelector('.partei .grid');
const parteiCell = parteiParent.querySelector('.cell');

fetch('resources/data/partei/mitglieder.json')
  .then((response) => response.json())
  .then((data) => {
    data.forEach((element) => {
      const parteiClone = parteiCell.cloneNode(true);
      parteiParent.appendChild(parteiClone);
      parteiClone.addEventListener('click', (e) => {
        e.currentTarget.parentElement.querySelectorAll('.active').forEach((f) => f.classList.remove('active'));
        e.currentTarget.classList.toggle('active');
      });

      const {
        name, title, street, place, phone, mail, more, image,
      } = element;

      parteiClone.querySelector('.name').innerHTML = name;
      parteiClone.querySelector('.text h2').innerHTML = name;
      parteiClone.querySelector('.text h3').innerHTML = title;
      parteiClone.querySelector('.partei_title').innerHTML = title;

      if (mail !== '') {
        parteiClone.querySelector('.text .mail').innerHTML = `E-Mail: ${mail}`;
      }
      if (phone !== '') {
        parteiClone.querySelector('.text .phone').innerHTML = `Tel.: ${phone}`;
      }

      parteiClone.querySelector('.text .street').innerHTML = street;
      parteiClone.querySelector('.text .place').innerHTML = place;
      parteiClone.querySelector('.text .more').innerHTML = more;
      parteiClone.querySelector('img').src = image;
    });

    parteiParent.removeChild(parteiCell);
  });
