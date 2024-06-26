function fraktionElements(elementType) {
    const ratElement = `.content_personen .flexbox .${elementType} .contents`;
    fetch(`resources/data/fraktion/${elementType}/${elementType}.json`)
        .then((response) => response.json())
        .then((data) => {
            data.forEach((profile) => {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell';
                // Image Area
                const imgAreaDiv = document.createElement('div');
                imgAreaDiv.className = 'imgArea';
                const img = document.createElement('img');
                img.src = profile.image;
                img.alt = '';
                imgAreaDiv.appendChild(img);

                // Text Area
                const textDiv = document.createElement('div');
                textDiv.className = 'text';
                const h2 = document.createElement('h2');
                h2.innerHTML = `${profile.name}<br /><span>${profile.subtitle}</span>`;
                const addressDiv = document.createElement('div');
                addressDiv.className = 'adresse';
                addressDiv.innerHTML = `${profile.address}<br>${profile.zipCode}`;
                const emailDiv = document.createElement('div');
                emailDiv.className = 'kontaktieren';
                emailDiv.innerHTML = `E-Mail: ${profile.email}`;

                // Funktion Area
                const funktionDiv = document.createElement('div');
                funktionDiv.className = 'funktion';
                const p = document.createElement('p');
                p.innerHTML = profile.functions.paragraph;
                p.className = 'text-justify';
                const ul = document.createElement('ul');
                ul.className = "list-disc";
                profile.functions.listItems.forEach((item) => {
                    const li = document.createElement('li');
                    li.textContent = item;
                    ul.appendChild(li);
                });

                funktionDiv.appendChild(p);
                funktionDiv.appendChild(document.createElement('br'));
                funktionDiv.appendChild(ul);

                textDiv.appendChild(h2);
                textDiv.appendChild(addressDiv);
                textDiv.appendChild(emailDiv);
                textDiv.appendChild(funktionDiv);

                cellDiv.appendChild(imgAreaDiv);
                cellDiv.appendChild(textDiv);

                document.querySelector(ratElement).appendChild(cellDiv);
            });
            document.querySelector(`.content_personen .flexbox .${elementType} .contents`).childNodes.forEach((mitgliedElement) => mitgliedElement.addEventListener('click', (gruppenEntry) => {
                gruppenEntry.currentTarget.classList.toggle('active');
            }));
        });
}

fraktionElements('gemeinderat');
fraktionElements('kreisrat');
