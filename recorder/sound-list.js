const createCheckMark = () => {
  const mark = document.createElement('span');
  mark.innerHTML = '&#9989;';
  return mark;
}

const createSoundListItem = s => {
  const listItem = document.createElement('li');
  const itemPlayer = new Audio();
  const itemDate = new Date(s.timestamp);
  const itemLabel = document.createElement('p');
  const playerContainer = document.createElement('div');

  playerContainer.classList.add('sound-player-container');

  itemPlayer.controls = true;
  itemPlayer.src = URL.createObjectURL(s.blob);
  itemLabel.innerText = `🎙 ${itemDate.toLocaleString()}`;

  playerContainer.appendChild(itemPlayer);
  listItem.appendChild(itemLabel);
  listItem.appendChild(playerContainer);

  return listItem;
}

export {
  createCheckMark,
  createSoundListItem
}
