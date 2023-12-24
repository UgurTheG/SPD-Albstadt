const left = document.querySelector('.title');
const right = document.querySelector('.navigator');
const content = document.querySelector('.menupunkt');
const navs = ['.aktuelles', '.partei', '.fraktion', '.historie', '.kontakte'];

navs.forEach((contentKey) => {
  document.querySelector(contentKey).style.display = 'none';
});

// aktuelles
document.querySelector('.trigger_aktuelles').onclick = () => {
  left.classList.toggle('active');
  right.classList.toggle('active');
  content.classList.toggle('active');
  document.getElementById('bottom').classList.remove('active');
  document.getElementById('top').classList.remove('active');

  document.querySelector('.aktuelles').style.display = 'block';
  document.querySelector('.aktuelles .mainpage').style.display = 'block';
  document.querySelector('.aktuelles .newspage').style.display = 'none';
  document.querySelector('.partei').style.display = 'none';
  document.querySelector('.fraktion').style.display = 'none';
  document.querySelector('.historie').style.display = 'none';
  document.querySelector('.kontakte').style.display = 'none';
};
// partei
document.querySelector('.trigger_partei').onclick = () => {
  left.classList.toggle('active');
  right.classList.toggle('active');
  content.classList.toggle('active');
  document.getElementById('bottom').classList.remove('active');
  document.getElementById('top').classList.remove('active');
  document.querySelector('#partei').classList.add('active');
  document.querySelector('#toPartei').classList.add('active');

  document.querySelector('.aktuelles').style.display = 'none';
  document.querySelector('.partei').style.display = 'block';
  document.querySelector('.fraktion').style.display = 'none';
  document.querySelector('.historie').style.display = 'none';
  document.querySelector('.kontakte').style.display = 'none';
};
// fraktion
document.querySelector('.trigger_fraktion').onclick = () => {
  left.classList.toggle('active');
  right.classList.toggle('active');
  content.classList.toggle('active');
  document.getElementById('bottom').classList.remove('active');
  document.getElementById('top').classList.remove('active');
  document.querySelector('#toMand').classList.add('active');

  document.querySelector('.aktuelles').style.display = 'none';
  document.querySelector('.partei').style.display = 'none';
  document.querySelector('.fraktion').style.display = 'block';
  document.querySelector('.historie').style.display = 'none';
  document.querySelector('.kontakte').style.display = 'none';

  document.querySelector('.content_personen').classList.add('active');

  document
    .querySelectorAll('.selector ul li.active')
    .forEach((f) => f.classList.remove('active'));
};
// historie
document.querySelector('.trigger_historie').onclick = () => {
  left.classList.toggle('active');
  right.classList.toggle('active');
  content.classList.toggle('active');
  document.getElementById('bottom').classList.remove('active');
  document.getElementById('top').classList.remove('active');

  document.querySelector('.aktuelles').style.display = 'none';
  document.querySelector('.partei').style.display = 'none';
  document.querySelector('.fraktion').style.display = 'none';
  document.querySelector('.historie').style.display = 'block';
  document.querySelector('.kontakte').style.display = 'none';
};
// kontakte
document.querySelector('.trigger_kontakte').onclick = () => {
  left.classList.toggle('active');
  right.classList.toggle('active');
  content.classList.toggle('active');
  document.getElementById('bottom').classList.remove('active');
  document.getElementById('top').classList.remove('active');

  document.querySelector('.aktuelles').style.display = 'none';
  document.querySelector('.partei').style.display = 'none';
  document.querySelector('.fraktion').style.display = 'none';
  document.querySelector('.historie').style.display = 'none';
  document.querySelector('.kontakte').style.display = 'block';
};

document.getElementById('menu-icon').onclick = () => {
  left.classList.toggle('active');
  right.classList.toggle('active');
  document.getElementById('bottom').classList.toggle('active');
  document.getElementById('top').classList.toggle('active');

  document.querySelector('.loading').style.animation = 'none';
  document.querySelector('#loading_icon').style.animation = 'none';
};

document.querySelector('#toNews').onclick = () => {
  document.querySelector('.loading').style.animation = 'loading 2s cubic-bezier( 0.4, 0.51, 0.19, 1)';
  document.querySelector('#loading_icon').style.animation = 'rotate 3s infinite';

  setTimeout(() => {
    document.querySelector('.aktuelles').style.display = 'block';
    document.querySelector('.aktuelles .mainpage').style.display = 'none';
    document.querySelector('.aktuelles .newspage').style.display = 'block';
    document.querySelector('.partei').style.display = 'none';
    document.querySelector('.fraktion').style.display = 'none';
    document.querySelector('.historie').style.display = 'none';
    document.querySelector('.kontakte').style.display = 'none';
    window.scrollTo(0, 0);
  }, 300);
};

document.querySelector('#menu_partei').querySelector('ul').childNodes.forEach((el) => el.addEventListener('click', (event) => {
  event.currentTarget.parentElement
    .querySelectorAll('.active')
    .forEach((f) => f.classList.remove('active'));
  event.target.classList.add('active');
}));

document.querySelector('#toPartei').onclick = () => {
  document.querySelector('#schwerpunkte').classList.remove('active');
  document.querySelector('#abgeordneter').classList.remove('active');
  document.querySelector('#partei').classList.add('active');
  document.querySelector('#parteiinfo').innerHTML = 'Das sind die Mitglieder des SPD Albstadt Vorstandes, dieser wurde bei der Jahreshauptversammlung im Juli 2022 gewählt. ';
};
document.querySelector('#toSchwerpunkte').onclick = () => {
  document.querySelector('#schwerpunkte').classList.add('active');
  document.querySelector('#abgeordneter').classList.remove('active');
  document.querySelector('#partei').classList.remove('active');
  document.querySelector('#parteiinfo').innerHTML = 'Im Mittelpunkt unserer politischen Arbeit für Albstadt stehen die folgenden Punkte. Haben wir dieselbe Meinung, dann lasst Ihr uns das Wissen und wir versuchen gemeinsam das umzusetzen. ';
};
document.querySelector('#toAbgeordneter').onclick = () => {
  document.querySelector('#schwerpunkte').classList.remove('active');
  document.querySelector('#abgeordneter').classList.add('active');
  document.querySelector('#partei').classList.remove('active');
  document.querySelector('#parteiinfo').innerHTML = 'Robin Mesarosch ist seit der Bundestagswahl 2021 unser Abgeordneter für den Wahlkreis Zollernalb-Sigmaringen. In Berlin ist er in den Ausschüssen für Digitalisierung sowie Klimaschutz und Energie. Darum kämpft er auch in unserer Region und unserer Stadt für diese Themen. Für mehr Informationen zu seiner Arbeit entweder bei Facebook, Instagram oder Twitter vorbeischauen oder auf den unteren roten Balken mit Robin Mesarosch klicken und Ihr kommt auf seine Website. ';
};

document.querySelector('#menu_fraktion').querySelector('ul').childNodes.forEach((ele) => ele.addEventListener('click', (event) => {
  event.currentTarget.parentElement
    .querySelectorAll('.active')
    .forEach((f) => f.classList.remove('active'));
  event.target.classList.add('active');
}));

document.querySelector('#toMand').onclick = () => {
  document.querySelector('.content_personen').classList.add('active');
  document.querySelector('.content_ausfraktion').classList.remove('active');
  document.querySelector('#fraktioninfo').innerHTML = 'Das sind unsere Mitglieder, die erfolgreich bei den letzten Kommunalwahlen waren. Nun gestalten sie Politik vor Ort mit, entweder im Gemeinderat Albstadt oder im Kreistag Zollernalb. Wollt Ihr mehr zu unserer Arbeit wissen, dann schaut bei der Rubrik „Neues aus der Fraktion“ vorbei. ';
};
document.querySelector('#toNewsFraktion').onclick = () => {
  document.querySelector('.content_personen').classList.remove('active');
  document.querySelector('.content_ausfraktion').classList.add('active');
  document.querySelector('#fraktioninfo').innerHTML = 'Bei dieser Rubrik teilen wir unsere Ansichten, Inhalte und wie wir bei wichtigen Abstimmungen entschieden haben. Das in kürze und auf den Punkt gebracht. ';
};
