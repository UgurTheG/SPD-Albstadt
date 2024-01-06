const parteiParent = document.querySelector('.partei .grid');
const parteiCell = parteiParent.querySelector('.cell');

fetch('resources/data/partei/mitglieder.json')
  .then((response) => response.json())
  .then((data) => {
    data.forEach((element) => {
      const parteiClone = parteiCell.cloneNode(true);
     
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
        parteiClone.querySelector('.text .phone').innerHTML = `Telefonnummer: ${phone}`;
      }

      parteiClone.querySelector('.text .street').innerHTML = street;
      parteiClone.querySelector('.text .place').innerHTML = place;
      if (more.length !== 0) {
        const unorderedList = document.createElement('ul');
        more.forEach((responsability) => {
          const list = document.createElement('li');
          list.innerHTML = responsability;
          unorderedList.appendChild(list);
        });
        parteiClone.querySelector('.text .more').appendChild(unorderedList);
      }
      parteiClone.querySelector('img').src = image;
      parteiClone.addEventListener('click', (e) => {
        const tmpClass = e.currentTarget.className;

        e.currentTarget.parentElement.querySelectorAll('.active').forEach((f) => f.classList.remove('active'));
        if (!tmpClass.includes('active')){
          e.currentTarget.classList.toggle('active');
        }

      });
      parteiParent.appendChild(parteiClone);
    });

    parteiParent.removeChild(parteiCell);
  });
