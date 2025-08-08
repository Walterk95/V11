
// --- State ---
let gameState = {
  timer: { minutes: 20, seconds: 0, isRunning: false, period: 1, maxPeriods: 3, periodLength: 20 },
  teams: {
    1: { name: 'Canadiens de Montréal', shots: 0, onTarget: 0, goals: 0, currentLineIndex: 0 },
    2: { name: 'Maple Leafs de Toronto', shots: 0, onTarget: 0, goals: 0, currentLineIndex: 0 }
  },
  players: { 1: [], 2: [] },
  lines: { 1: [], 2: [] },
  goalies: { 1: [], 2: [] },
  activeGoalies: { 1: null, 2: null },
  shots: [],
  events: [],
  selectedShotType: null,
  settings: { playersOnIce: 5, rinkSize: 'full' }
};

let timerInterval = null;
let currentEditingPlayer = null;
let currentEditingLine = null;

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  cacheDom();
  wireEvents();
  initializeRink();
  loadSampleData();
  updateDisplay();
});

// --- Cache ---
const $ = (id) => document.getElementById(id);
let DOM = {};
function cacheDom() {
  DOM.timerDisplay = $('timerDisplay');
  DOM.periodInfo = $('periodInfo');
  DOM.timerBtn = $('timerBtn');
  DOM.nextPeriodBtn = $('nextPeriodBtn');
  DOM.showTimeBtn = $('showTimeBtn');
  DOM.undoBtn = $('undoBtn');
  DOM.deselectBtn = $('deselectBtn');
  DOM.clearRinkBtn = $('clearRinkBtn');
  DOM.saveBtn = $('saveBtn');
  DOM.resetBtn = $('resetBtn');

  DOM.playersOnIce = $('playersOnIce');
  DOM.rinkSize = $('rinkSize');
  DOM.periods = $('periods');
  DOM.periodLength = $('periodLength');

  DOM.team1Name = $('team1Name');
  DOM.team2Name = $('team2Name');

  DOM.addPlayerTeam1 = $('addPlayerTeam1');
  DOM.addPlayerTeam2 = $('addPlayerTeam2');

  DOM.addLineBtn = $('addLineBtn');
  DOM.linesContainer = $('lines-container');

  DOM.team1PrevLine = $('team1PrevLine');
  DOM.team1NextLine = $('team1NextLine');
  DOM.team2PrevLine = $('team2PrevLine');
  DOM.team2NextLine = $('team2NextLine');

  DOM.goalBtn = $('goalBtn');
  DOM.onTargetBtn = $('onTargetBtn');
  DOM.offTargetBtn = $('offTargetBtn');
  DOM.shotIndicator = $('shotIndicator');

  DOM.team1Players = $('team1-players');
  DOM.team2Players = $('team2-players');

  DOM.eventsList = $('eventsList');

  // Modals & inputs
  DOM.timeModal = $('timeModal');
  DOM.modalMinutes = $('modalMinutes');
  DOM.modalSeconds = $('modalSeconds');
  DOM.closeTimeModalBtn = $('closeTimeModalBtn');
  DOM.cancelTimeBtn = $('cancelTimeBtn');
  DOM.confirmTimeBtn = $('confirmTimeBtn');

  DOM.playerModal = $('playerModal');
  DOM.playerModalTitle = $('playerModalTitle');
  DOM.playerNumber = $('playerNumber');
  DOM.playerName = $('playerName');
  DOM.playerPosition = $('playerPosition');
  DOM.closePlayerModalBtn = $('closePlayerModalBtn');
  DOM.cancelPlayerBtn = $('cancelPlayerBtn');
  DOM.savePlayerBtn = $('savePlayerBtn');

  DOM.lineModal = $('lineModal');
  DOM.lineModalTitle = $('lineModalTitle');
  DOM.lineName = $('lineName');
  DOM.lineTeam = $('lineTeam');
  DOM.linePlayerOptions = $('linePlayerOptions');
  DOM.selectedPlayersPreview = $('selectedPlayersPreview');
  DOM.selectedPlayersList = $('selectedPlayersList');
  DOM.selectedCount = $('selectedCount');
  DOM.closeLineModalBtn = $('closeLineModalBtn');
  DOM.cancelLineBtn = $('cancelLineBtn');
  DOM.saveLineBtn = $('saveLineBtn');

  DOM.rinkCanvas = $('rinkCanvas');
  DOM.toast = $('toast');
  DOM.toastMessage = $('toastMessage');
}

// --- Events ---
function wireEvents() {
  DOM.timerBtn.addEventListener('click', toggleTimer);
  DOM.showTimeBtn.addEventListener('click', showTimeModal);
  DOM.nextPeriodBtn.addEventListener('click', nextPeriod);
  DOM.undoBtn.addEventListener('click', undoLastShot);
  DOM.deselectBtn.addEventListener('click', deselectShotType);
  DOM.clearRinkBtn.addEventListener('click', clearRink);
  DOM.saveBtn.addEventListener('click', saveMatch);
  DOM.resetBtn.addEventListener('click', resetMatch);

  DOM.playersOnIce.addEventListener('change', updateGameSettings);
  DOM.rinkSize.addEventListener('change', updateGameSettings);
  DOM.periods.addEventListener('change', updateGameSettings);
  DOM.periodLength.addEventListener('change', updateGameSettings);

  DOM.team1Name.addEventListener('input', () => {
    gameState.teams[1].name = DOM.team1Name.value;
    updateDisplay();
    drawRink();
  });
  DOM.team2Name.addEventListener('input', () => {
    gameState.teams[2].name = DOM.team2Name.value;
    updateDisplay();
    drawRink();
  });

  DOM.addPlayerTeam1.addEventListener('click', () => addPlayer(1));
  DOM.addPlayerTeam2.addEventListener('click', () => addPlayer(2));

  DOM.addLineBtn.addEventListener('click', showAddLineModal);

  DOM.team1PrevLine.addEventListener('click', () => prevLine(1));
  DOM.team1NextLine.addEventListener('click', () => nextLine(1));
  DOM.team2PrevLine.addEventListener('click', () => prevLine(2));
  DOM.team2NextLine.addEventListener('click', () => nextLine(2));

  DOM.goalBtn.addEventListener('click', () => selectShotType('goal'));
  DOM.onTargetBtn.addEventListener('click', () => selectShotType('onTarget'));
  DOM.offTargetBtn.addEventListener('click', () => selectShotType('offTarget'));

  // Time modal
  DOM.closeTimeModalBtn.addEventListener('click', () => closeModal('timeModal'));
  DOM.cancelTimeBtn.addEventListener('click', () => closeModal('timeModal'));
  DOM.confirmTimeBtn.addEventListener('click', updateTime);

  // Player modal
  DOM.closePlayerModalBtn.addEventListener('click', () => closeModal('playerModal'));
  DOM.cancelPlayerBtn.addEventListener('click', () => closeModal('playerModal'));
  DOM.savePlayerBtn.addEventListener('click', savePlayer);

  // Line modal
  DOM.closeLineModalBtn.addEventListener('click', () => closeModal('lineModal'));
  DOM.cancelLineBtn.addEventListener('click', () => closeModal('lineModal'));
  DOM.saveLineBtn.addEventListener('click', saveLine);
  DOM.lineTeam.addEventListener('change', updateLinePlayerOptions);

  // Delegation for players (edit/remove)
  DOM.team1Players.addEventListener('click', onPlayersListClick(1));
  DOM.team2Players.addEventListener('click', onPlayersListClick(2));

  // Rink
  window.addEventListener('resize', initializeRink);
  DOM.rinkCanvas.addEventListener('click', handleRinkClick);
}

// Delegated click handler builder
function onPlayersListClick(teamId) {
  return (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);
    if (action === 'edit') editPlayer(teamId, id);
    if (action === 'remove') removePlayer(teamId, id);
  };
}

// --- Timer ---
function toggleTimer() {
  if (gameState.timer.isRunning) {
    clearInterval(timerInterval);
    gameState.timer.isRunning = false;
    DOM.timerBtn.innerHTML = '<i class="fa-solid fa-play"></i> Démarrer';
    DOM.timerBtn.className = 'btn-primary';
  } else {
    timerInterval = setInterval(updateTimer, 1000);
    gameState.timer.isRunning = true;
    DOM.timerBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    DOM.timerBtn.className = 'btn-danger';
  }
}

function updateTimer() {
  if (gameState.timer.seconds > 0) gameState.timer.seconds--;
  else if (gameState.timer.minutes > 0) { gameState.timer.minutes--; gameState.timer.seconds = 59; }
  else {
    clearInterval(timerInterval);
    gameState.timer.isRunning = false;
    addEvent('Fin de la période ' + gameState.timer.period, 'fa-solid fa-flag-checkered');
    showToast('Fin de la période !');
    DOM.timerBtn.innerHTML = '<i class="fa-solid fa-play"></i> Démarrer';
    DOM.timerBtn.className = 'btn-primary';
  }
  updateDisplay();
}

function showTimeModal() {
  DOM.modalMinutes.value = gameState.timer.minutes;
  DOM.modalSeconds.value = gameState.timer.seconds;
  DOM.timeModal.classList.add('active');
}

function updateTime() {
  const minutes = parseInt(DOM.modalMinutes.value) || 0;
  const seconds = parseInt(DOM.modalSeconds.value) || 0;
  gameState.timer.minutes = Math.max(0, Math.min(60, minutes));
  gameState.timer.seconds = Math.max(0, Math.min(59, seconds));
  updateDisplay();
  closeModal('timeModal');
  addEvent(`Temps modifié: ${formatTime(gameState.timer.minutes, gameState.timer.seconds)}`, 'fa-solid fa-clock');
}

function nextPeriod() {
  if (gameState.timer.period < gameState.timer.maxPeriods) {
    gameState.timer.period++;
    gameState.timer.minutes = gameState.timer.periodLength;
    gameState.timer.seconds = 0;
    if (gameState.timer.isRunning) {
      clearInterval(timerInterval);
      gameState.timer.isRunning = false;
      DOM.timerBtn.innerHTML = '<i class="fa-solid fa-play"></i> Démarrer';
      DOM.timerBtn.className = 'btn-primary';
    }
    updateDisplay();
    addEvent('Début de la période ' + gameState.timer.period, 'fa-solid fa-play');
    showToast('Période ' + gameState.timer.period + ' commencée');
  } else {
    addEvent('Fin du match', 'fa-solid fa-flag-checkered');
    showToast('Match terminé !');
  }
}

// --- Players ---
function addPlayer(teamId) {
  currentEditingPlayer = { teamId, isNew: true };
  DOM.playerModalTitle.textContent = 'Ajouter un joueur';
  DOM.playerNumber.value = '';
  DOM.playerName.value = '';
  DOM.playerPosition.value = 'C';
  DOM.playerModal.classList.add('active');
}

function editPlayer(teamId, playerId) {
  const player = gameState.players[teamId].find(p => p.id === playerId);
  if (!player) return;
  currentEditingPlayer = { teamId, playerId, isNew: false };
  DOM.playerModalTitle.textContent = 'Modifier le joueur';
  DOM.playerNumber.value = player.number;
  DOM.playerName.value = player.name;
  DOM.playerPosition.value = player.position;
  DOM.playerModal.classList.add('active');
}

function savePlayer() {
  const number = parseInt(DOM.playerNumber.value);
  const name = (DOM.playerName.value || '').trim();
  const position = DOM.playerPosition.value;
  if (!number || !name) { showToast('Veuillez remplir tous les champs', 'error'); return; }

  // unique number per team
  const exists = gameState.players[currentEditingPlayer.teamId].some(p => p.number === number && (!currentEditingPlayer.playerId || p.id !== currentEditingPlayer.playerId));
  if (exists) { showToast('Ce numéro est déjà utilisé', 'error'); return; }

  if (currentEditingPlayer.isNew) {
    const id = Date.now();
    const newPlayer = { id, number, name, position, stats: { goals:0, assists:0, shots:0 } };
    gameState.players[currentEditingPlayer.teamId].push(newPlayer);
    if (position === 'G') {
      const g = { id, name, number, stats: { saves:0, goals:0, shots:0 } };
      gameState.goalies[currentEditingPlayer.teamId].push(g);
      if (!gameState.activeGoalies[currentEditingPlayer.teamId]) gameState.activeGoalies[currentEditingPlayer.teamId] = id;
    }
    addEvent(`Joueur ajouté: #${number} ${name} (${position})`, 'fa-solid fa-user-plus');
  } else {
    const teamId = currentEditingPlayer.teamId;
    const player = gameState.players[teamId].find(p => p.id === currentEditingPlayer.playerId);
    if (!player) return;
    const oldPos = player.position;
    player.number = number; player.name = name; player.position = position;
    if (oldPos === 'G' && position !== 'G') {
      gameState.goalies[teamId] = gameState.goalies[teamId].filter(g => g.id !== player.id);
      if (gameState.activeGoalies[teamId] === player.id) gameState.activeGoalies[teamId] = gameState.goalies[teamId][0]?.id || null;
    } else if (oldPos !== 'G' && position === 'G') {
      const g = { id: player.id, name, number, stats: { saves:0, goals:0, shots:0 } };
      gameState.goalies[teamId].push(g);
      if (!gameState.activeGoalies[teamId]) gameState.activeGoalies[teamId] = player.id;
    } else if (position === 'G') {
      const g = gameState.goalies[teamId].find(x => x.id === player.id);
      if (g) { g.name = name; g.number = number; }
    }
    addEvent(`Joueur modifié: #${number} ${name} (${position})`, 'fa-solid fa-user-pen');
  }
  closeModal('playerModal');
  updateDisplay();
  showToast('Joueur sauvegardé');
}

function removePlayer(teamId, playerId) {
  if (!confirm('Supprimer ce joueur ?')) return;
  const player = gameState.players[teamId].find(p => p.id === playerId);
  gameState.players[teamId] = gameState.players[teamId].filter(p => p.id !== playerId);
  if (player?.position === 'G') {
    gameState.goalies[teamId] = gameState.goalies[teamId].filter(g => g.id !== playerId);
    if (gameState.activeGoalies[teamId] === playerId) {
      gameState.activeGoalies[teamId] = gameState.goalies[teamId][0]?.id || null;
    }
  }
  gameState.lines[teamId].forEach(line => line.players = line.players.filter(p => p.id !== playerId));
  addEvent(`Joueur supprimé: #${player?.number ?? ''} ${player?.name ?? ''}`, 'fa-solid fa-user-minus');
  updateDisplay();
  showToast('Joueur supprimé');
}

// --- Lines ---
function showAddLineModal() {
  currentEditingLine = { isNew: true };
  DOM.lineModalTitle.textContent = 'Créer une ligne';
  DOM.lineName.value = '';
  DOM.lineTeam.value = '1';
  updateLinePlayerOptions();
  DOM.lineModal.classList.add('active');
}

function editLine(teamId, lineId) {
  const line = gameState.lines[teamId].find(l => l.id === lineId);
  if (!line) return;
  currentEditingLine = { teamId, lineId, isNew: false };
  DOM.lineModalTitle.textContent = 'Modifier la ligne';
  DOM.lineName.value = line.name;
  DOM.lineTeam.value = String(teamId);
  updateLinePlayerOptions();
  // check those players
  line.players.forEach(p => {
    const cb = DOM.linePlayerOptions.querySelector(`input[data-player-id="${p.id}"]`);
    if (cb) cb.checked = true;
  });
  updateSelectedPlayersPreview();
  DOM.lineModal.classList.add('active');
}

function updateLinePlayerOptions() {
  const teamId = parseInt(DOM.lineTeam.value, 10);
  const players = gameState.players[teamId].filter(p => p.position !== 'G');
  DOM.linePlayerOptions.innerHTML = '';

  if (!players.length) {
    DOM.linePlayerOptions.innerHTML = '<p class="text-dim center">Aucun joueur disponible. Ajoutez des joueurs d\'abord.</p>';
    updateSelectedPlayersPreview();
    return;
  }

  players.forEach(p => {
    const div = document.createElement('div');
    div.className = 'player-checkbox-item';
    div.innerHTML = `
      <input type="checkbox" data-player-id="${p.id}">
      <div class="player-info">
        <div class="player-number-badge">${p.number}</div>
        <div style="flex:1;">
          <div style="font-weight:500">${p.name}</div>
          <div class="position-badge">${p.position}</div>
        </div>
      </div>
    `;
    const cb = div.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', updateSelectedPlayersPreview);
    div.addEventListener('click', (e) => { if (e.target.tagName !== 'INPUT') { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }});
    DOM.linePlayerOptions.appendChild(div);
  });
  updateSelectedPlayersPreview();
}

function updateSelectedPlayersPreview() {
  const cbs = DOM.linePlayerOptions.querySelectorAll('input[type="checkbox"]:checked');
  const teamId = parseInt(DOM.lineTeam.value, 10);
  DOM.selectedCount.textContent = cbs.length;
  if (!cbs.length) {
    DOM.selectedPlayersList.innerHTML = '<span class="text-dim italic">Aucun joueur sélectionné</span>';
  } else {
    const selected = [];
    cbs.forEach(cb => {
      const id = parseInt(cb.dataset.playerId, 10);
      const p = gameState.players[teamId].find(x => x.id === id);
      if (p) selected.push(p);
    });
    DOM.selectedPlayersList.innerHTML = selected.map(p => `<div class="selected-player-tag">#${p.number} ${p.name} <span class="position-badge">${p.position}</span></div>`).join('');
  }
}

function saveLine() {
  const name = (DOM.lineName.value || '').trim();
  const teamId = parseInt(DOM.lineTeam.value, 10);
  if (!name) { showToast('Veuillez entrer un nom pour la ligne', 'error'); return; }
  const cbs = DOM.linePlayerOptions.querySelectorAll('input[type="checkbox"]:checked');
  if (!cbs.length) { showToast('Veuillez sélectionner au moins un joueur', 'error'); return; }
  if (cbs.length > 6) { showToast('Maximum 6 joueurs par ligne', 'error'); return; }

  const players = [];
  cbs.forEach(cb => {
    const id = parseInt(cb.dataset.playerId, 10);
    const p = gameState.players[teamId].find(x => x.id === id);
    if (p) players.push(p);
  });

  if (currentEditingLine?.isNew) {
    const newLine = { id: Date.now(), name, players, isActive: false };
    gameState.lines[teamId].push(newLine);
    if (gameState.lines[teamId].length === 1) {
      gameState.teams[teamId].currentLineIndex = 0;
      newLine.isActive = true;
    }
    addEvent(`Ligne créée: ${name} (${players.length} joueurs)`, 'fa-solid fa-users');
  } else {
    const line = gameState.lines[currentEditingLine.teamId].find(l => l.id === currentEditingLine.lineId);
    if (line) { line.name = name; line.players = players; addEvent(`Ligne modifiée: ${name}`, 'fa-solid fa-users'); }
  }
  closeModal('lineModal');
  updateDisplay();
  showToast('Ligne sauvegardée');
}

function removeLine(teamId, lineId) {
  if (!confirm('Supprimer cette ligne ?')) return;
  const idx = gameState.lines[teamId].findIndex(l => l.id === lineId);
  if (idx === -1) return;
  const name = gameState.lines[teamId][idx].name;
  gameState.lines[teamId].splice(idx, 1);
  if (gameState.teams[teamId].currentLineIndex >= gameState.lines[teamId].length) {
    gameState.teams[teamId].currentLineIndex = Math.max(0, gameState.lines[teamId].length - 1);
  }
  addEvent(`Ligne supprimée: ${name}`, 'fa-solid fa-users');
  updateDisplay();
  showToast('Ligne supprimée');
}

function activateLine(teamId, lineId) {
  const i = gameState.lines[teamId].findIndex(l => l.id === lineId);
  if (i === -1) return;
  gameState.lines[teamId].forEach(l => l.isActive = false);
  gameState.lines[teamId][i].isActive = true;
  gameState.teams[teamId].currentLineIndex = i;
  updateDisplay();
  showToast(`Ligne activée: ${gameState.lines[teamId][i].name}`);
}

function nextLine(teamId) {
  if (!gameState.lines[teamId].length) return;
  const cur = gameState.teams[teamId].currentLineIndex;
  const next = (cur + 1) % gameState.lines[teamId].length;
  if (gameState.lines[teamId][cur]) gameState.lines[teamId][cur].isActive = false;
  gameState.lines[teamId][next].isActive = true;
  gameState.teams[teamId].currentLineIndex = next;
  updateDisplay();
  addEvent(`Changement de ligne: ${gameState.lines[teamId][next].name}`, 'fa-solid fa-right-left');
}

function prevLine(teamId) {
  if (!gameState.lines[teamId].length) return;
  const cur = gameState.teams[teamId].currentLineIndex;
  const prev = cur === 0 ? gameState.lines[teamId].length - 1 : cur - 1;
  if (gameState.lines[teamId][cur]) gameState.lines[teamId][cur].isActive = false;
  gameState.lines[teamId][prev].isActive = true;
  gameState.teams[teamId].currentLineIndex = prev;
  updateDisplay();
  addEvent(`Changement de ligne: ${gameState.lines[teamId][prev].name}`, 'fa-solid fa-right-left');
}

// --- Shot selection ---
function selectShotType(type) {
  gameState.selectedShotType = type;
  [DOM.goalBtn, DOM.onTargetBtn, DOM.offTargetBtn].forEach(b => b.classList.remove('selected'));
  const map = { goal: DOM.goalBtn, onTarget: DOM.onTargetBtn, offTarget: DOM.offTargetBtn };
  map[type].classList.add('selected');
  DOM.deselectBtn.classList.remove('is-hidden');
  DOM.shotIndicator.classList.add('active');
  const names = { goal: 'But', onTarget: 'Tir cadré', offTarget: 'Tir non cadré' };
  DOM.shotIndicator.textContent = `${names[type]} sélectionné - Cliquez sur la patinoire`;
}

function deselectShotType() {
  gameState.selectedShotType = null;
  [DOM.goalBtn, DOM.onTargetBtn, DOM.offTargetBtn].forEach(b => b.classList.remove('selected'));
  DOM.deselectBtn.classList.add('is-hidden');
  DOM.shotIndicator.classList.remove('active');
  DOM.shotIndicator.textContent = 'Sélectionnez un type de tir puis cliquez sur la patinoire';
}

// --- Rink ---
function initializeRink() {
  const canvas = DOM.rinkCanvas;
  const container = canvas.parentElement;
  const width = container.clientWidth;
  const height = Math.round(width / 2);
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  drawRink();
}

function drawRink() {
  const canvas = DOM.rinkCanvas;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const margin = 20;
  const rinkWidth = canvas.width - 2 * margin;
  const rinkHeight = canvas.height - 2 * margin;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  function drawRoundedRink(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI/2, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI/2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + h - r, r, Math.PI/2, Math.PI);
    ctx.lineTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 3*Math.PI/2);
    ctx.closePath();
  }

  // Mask
  ctx.save();
  drawRoundedRink(margin, margin, rinkWidth, rinkHeight, 60);
  ctx.clip();

  // Ice
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(margin, margin, rinkWidth, rinkHeight);

  // Subtle halves
  ctx.fillStyle = 'rgba(220, 38, 38, 0.05)';
  ctx.fillRect(margin, margin, rinkWidth / 2, rinkHeight);
  ctx.fillStyle = 'rgba(30, 64, 175, 0.05)';
  ctx.fillRect(centerX, margin, rinkWidth / 2, rinkHeight);
  ctx.restore();

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  drawRoundedRink(margin, margin, rinkWidth, rinkHeight, 60);
  ctx.stroke();

  // Goal lines
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;
  const goalLineOffset = rinkWidth * 0.08;
  ctx.beginPath(); ctx.moveTo(margin + goalLineOffset, margin); ctx.lineTo(margin + goalLineOffset, margin + rinkHeight); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(canvas.width - margin - goalLineOffset, margin); ctx.lineTo(canvas.width - margin - goalLineOffset, margin + rinkHeight); ctx.stroke();

  // Blue lines
  ctx.strokeStyle = '#1e40af';
  ctx.lineWidth = 3;
  const blueLineOffset = rinkWidth * 0.375;
  ctx.beginPath(); ctx.moveTo(margin + blueLineOffset, margin); ctx.lineTo(margin + blueLineOffset, margin + rinkHeight); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(canvas.width - margin - blueLineOffset, margin); ctx.lineTo(canvas.width - margin - blueLineOffset, margin + rinkHeight); ctx.stroke();

  // Center line
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(centerX, margin); ctx.lineTo(centerX, margin + rinkHeight); ctx.stroke();

  // Center circle
  ctx.strokeStyle = '#1e40af';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI); ctx.stroke();
  // Center dot
  ctx.fillStyle = '#dc2626';
  ctx.beginPath(); ctx.arc(centerX, centerY, 5, 0, 2*Math.PI); ctx.fill();

  // Faceoff circles & dots
  const faceoffRadius = 30;
  const faceoffOffset = rinkWidth * 0.2;
  const faceoffY1 = margin + rinkHeight * 0.3;
  const faceoffY2 = margin + rinkHeight * 0.7;

  ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2;
  [ [margin + faceoffOffset, faceoffY1], [margin + faceoffOffset, faceoffY2],
    [canvas.width - margin - faceoffOffset, faceoffY1], [canvas.width - margin - faceoffOffset, faceoffY2] ]
  .forEach(([x,y]) => { ctx.beginPath(); ctx.arc(x,y,faceoffRadius,0,2*Math.PI); ctx.stroke(); ctx.beginPath(); ctx.fillStyle = '#dc2626'; ctx.arc(x,y,3,0,2*Math.PI); ctx.fill(); });

  // Creases
  const creaseRadius = 25;
  ctx.fillStyle = 'rgba(135,206,250,0.4)'; ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(margin + goalLineOffset, centerY, creaseRadius, -Math.PI/2, Math.PI/2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(canvas.width - margin - goalLineOffset, centerY, creaseRadius, Math.PI/2, -Math.PI/2); ctx.closePath(); ctx.fill(); ctx.stroke();

  // Goals (simple)
  const goalHeight = 50, goalDepth = 15;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(margin - goalDepth, centerY - goalHeight/2, goalDepth, goalHeight);
  ctx.fillRect(canvas.width - margin, centerY - goalHeight/2, goalDepth, goalHeight);

  // Team labels
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#dc2626';
  ctx.fillText('↖ ' + gameState.teams[2].name, margin + 10, margin - 5);
  ctx.fillStyle = '#1e40af';
  const txt = gameState.teams[1].name + ' ↗';
  const m = ctx.measureText(txt).width;
  ctx.fillText(txt, canvas.width - margin - m - 10, margin - 5);

  // Shots
  gameState.shots.forEach(s => drawShot(s.x, s.y, s.type, s.team));
}

function handleRinkClick(e) {
  if (!gameState.selectedShotType) { showToast('Sélectionnez d\'abord un type de tir', 'error'); return; }
  const rect = DOM.rinkCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (DOM.rinkCanvas.width / rect.width);
  const y = (e.clientY - rect.top) * (DOM.rinkCanvas.height / rect.height);
  const team = x < DOM.rinkCanvas.width / 2 ? 2 : 1;
  recordShot(x, y, gameState.selectedShotType, team);
}

function recordShot(x, y, type, team) {
  const shot = { id: Date.now(), x, y, type, team, time: formatTime(gameState.timer.minutes, gameState.timer.seconds), period: gameState.timer.period };
  gameState.shots.push(shot);
  gameState.teams[team].shots++;
  if (type === 'onTarget' || type === 'goal') {
    gameState.teams[team].onTarget++;
    const opp = team === 1 ? 2 : 1;
    const gid = gameState.activeGoalies[opp];
    if (gid) {
      const g = gameState.goalies[opp].find(x => x.id === gid);
      if (g) {
        g.stats.shots++;
        if (type === 'onTarget') g.stats.saves++;
        if (type === 'goal') g.stats.goals++;
      }
    }
  }
  if (type === 'goal') gameState.teams[team].goals++;
  const names = { goal: 'But', onTarget: 'Tir cadré', offTarget: 'Tir non cadré' };
  const icons = { goal: 'fa-solid fa-bullseye', onTarget:'fa-solid fa-circle-dot', offTarget:'fa-solid fa-circle-xmark' };
  const line = getCurrentLine(team)?.name || 'Aucune ligne active';
  addEvent(`${names[type]} - ${gameState.teams[team].name}`, icons[type], line);
  drawShot(x,y,type,team);
  updateDisplay();
  showToast(`${names[type]} enregistré pour ${gameState.teams[team].name}`);
  deselectShotType();
}

function drawShot(x, y, type, team) {
  const ctx = DOM.rinkCanvas.getContext('2d');
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
  if (type === 'goal') {
    ctx.fillStyle = '#22c55e'; ctx.beginPath();
    for (let i=0;i<5;i++){ const a=(i*4*Math.PI)/5 - Math.PI/2; const ia=((i*4+2)*Math.PI)/5 - Math.PI/2;
      if(i===0) ctx.moveTo(x+12*Math.cos(a), y+12*Math.sin(a)); else ctx.lineTo(x+12*Math.cos(a), y+12*Math.sin(a));
      ctx.lineTo(x+6*Math.cos(ia), y+6*Math.sin(ia));
    } ctx.closePath(); ctx.fill();
    ctx.shadowColor='transparent'; ctx.fillStyle='#fff'; ctx.font='bold 10px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('B', x, y);
  } else if (type === 'onTarget') {
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(x,y,8,0,2*Math.PI); ctx.fill();
    ctx.shadowColor='transparent'; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,3,0,2*Math.PI); ctx.fill();
  } else {
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(x,y,6,0,2*Math.PI); ctx.fill();
    ctx.shadowColor='transparent'; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x-3,y-3); ctx.lineTo(x+3,y+3); ctx.moveTo(x+3,y-3); ctx.lineTo(x-3,y+3); ctx.stroke();
  }
  ctx.shadowColor = 'transparent';
}

function clearRink() {
  if (!confirm('Effacer tous les tirs ?')) return;
  gameState.shots = [];
  drawRink();
  addEvent('Patinoire effacée', 'fa-solid fa-eraser');
  showToast('Patinoire effacée');
}

function undoLastShot() {
  if (!gameState.shots.length) { showToast('Aucun tir à annuler', 'error'); return; }
  const last = gameState.shots.pop();
  gameState.teams[last.team].shots--;
  if (last.type === 'onTarget' || last.type === 'goal') {
    gameState.teams[last.team].onTarget--;
    const opp = last.team === 1 ? 2 : 1;
    const gid = gameState.activeGoalies[opp];
    if (gid) {
      const g = gameState.goalies[opp].find(x => x.id === gid);
      if (g) {
        g.stats.shots--;
        if (last.type === 'onTarget') g.stats.saves--;
        if (last.type === 'goal') g.stats.goals--;
      }
    }
  }
  if (last.type === 'goal') gameState.teams[last.team].goals--;
  drawRink();
  updateDisplay();
  addEvent('Dernier tir annulé', 'fa-solid fa-rotate-left');
  showToast('Dernier tir annulé');
}


// --- Line selects under canvas ---
function renderLineSelects(){
  const s1 = document.getElementById('team1LineSelect');
  const s2 = document.getElementById('team2LineSelect');
  if(!s1 || !s2) return;

  // Build options
  const build = (teamId, selectEl) => {
    const lines = gameState.lines[teamId] || [];
    if (!lines.length) {
      selectEl.innerHTML = '<option value="">(aucune ligne)</option>';
      selectEl.disabled = true;
      return;
    }
    selectEl.disabled = false;
    selectEl.innerHTML = lines.map((l, i) => {
      const selected = i === gameState.teams[teamId].currentLineIndex ? 'selected' : '';
      return `<option value="${l.id}" ${selected}>${l.name}</option>`;
    }).join('');
  };
  build(1, s1);
  build(2, s2);

  // Change handlers
  s1.onchange = (e) => {
    const id = parseInt(e.target.value, 10);
    const idx = gameState.lines[1].findIndex(l => l.id === id);
    if (idx >= 0) {
      gameState.lines[1].forEach(l => l.isActive = false);
      gameState.lines[1][idx].isActive = true;
      gameState.teams[1].currentLineIndex = idx;
      addEvent(`Ligne activée: ${gameState.lines[1][idx].name}`, 'fa-solid fa-right-left');
      updateDisplay();
    }
  };
  s2.onchange = (e) => {
    const id = parseInt(e.target.value, 10);
    const idx = gameState.lines[2].findIndex(l => l.id === id);
    if (idx >= 0) {
      gameState.lines[2].forEach(l => l.isActive = false);
      gameState.lines[2][idx].isActive = true;
      gameState.teams[2].currentLineIndex = idx;
      addEvent(`Ligne activée: ${gameState.lines[2][idx].name}`, 'fa-solid fa-right-left');
      updateDisplay();
    }
  };
}
// --- Display ---
function updateDisplay() {
  // Timer
  DOM.timerDisplay.textContent = formatTime(gameState.timer.minutes, gameState.timer.seconds);
  DOM.periodInfo.textContent = `Période ${gameState.timer.period} sur ${gameState.timer.maxPeriods}`;

  // Names
  DOM.team1Name.value = gameState.teams[1].name;
  DOM.team2Name.value = gameState.teams[2].name;

  // Score
  $('team1Score').textContent = gameState.teams[1].goals;
  $('team2Score').textContent = gameState.teams[2].goals;

  // Team stats
  [1,2].forEach(updateTeamStats);

  // Players
  updatePlayersDisplay();

  // Lines
  updateLinesDisplay();

  // Goalies
  updateGoaliesDisplay();

  // Current line labels
  updateCurrentLineDisplay();

  // Events
  updateEventsDisplay();
  renderLineSelects();
}

function updateTeamStats(teamId) {
  const t = gameState.teams[teamId];
  $(`team${teamId}Shots`).textContent = t.shots;
  $(`team${teamId}OnTarget`).textContent = t.onTarget;
  $(`team${teamId}Goals`).textContent = t.goals;
  const pct = t.shots > 0 ? ((t.onTarget / t.shots) * 100).toFixed(1) : '0.0';
  $(`team${teamId}ShotPercentage`).textContent = pct + '%';
}

function updatePlayersDisplay() {
  [1,2].forEach(teamId => {
    const container = teamId === 1 ? DOM.team1Players : DOM.team2Players;
    container.innerHTML = '';
    gameState.players[teamId].forEach(p => {
      const card = document.createElement('div');
      card.className = 'player-card';
      card.innerHTML = `
        <div class="player-number">${p.number}</div>
        <div class="player-name">${p.name}</div>
        <div class="player-position">${p.position}</div>
        <div class="player-actions">
          <button class="btn-secondary" data-action="edit" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-danger" data-action="remove" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

function updateLinesDisplay() {
  DOM.linesContainer.innerHTML = '';
  [1,2].forEach(teamId => {
    gameState.lines[teamId].forEach(line => {
      const div = document.createElement('div');
      div.className = `line-card ${line.isActive ? 'active' : ''}`;
      const playersHtml = line.players.map(p => `<div class="line-player">#${p.number} ${p.name}<br><small>${p.position}</small></div>`).join('');
      div.innerHTML = `
        <div class="line-header">
          <div class="line-title">${line.name}</div>
          <div style="font-size:.9rem; color:var(--text-dim)">${gameState.teams[teamId].name}</div>
        </div>
        <div class="line-players">${playersHtml}</div>
        <div class="line-controls">
          <button class="btn-secondary" data-edit-line="${line.id}" data-team="${teamId}"><i class="fa-solid fa-pen"></i> Modifier</button>
          <button class="btn-primary" data-activate-line="${line.id}" data-team="${teamId}" ${line.isActive ? 'disabled' : ''}>
            <i class="fa-solid fa-play"></i> ${line.isActive ? 'Active' : 'Activer'}
          </button>
          <button class="btn-danger" data-remove-line="${line.id}" data-team="${teamId}"><i class="fa-solid fa-trash"></i> Supprimer</button>
        </div>
      `;
      // Attach line buttons
      div.querySelector('[data-edit-line]')?.addEventListener('click', () => editLine(teamId, line.id));
      div.querySelector('[data-activate-line]')?.addEventListener('click', () => activateLine(teamId, line.id));
      div.querySelector('[data-remove-line]')?.addEventListener('click', () => removeLine(teamId, line.id));
      DOM.linesContainer.appendChild(div);
    });
  });
}

function updateGoaliesDisplay() {
  [1,2].forEach(teamId => {
    const container = $(`team${teamId}Goalies`);
    container.innerHTML = '';
    gameState.goalies[teamId].forEach(g => {
      const isActive = gameState.activeGoalies[teamId] === g.id;
      const savePct = g.stats.shots > 0 ? (((g.stats.shots - g.stats.goals) / g.stats.shots) * 100).toFixed(1) : '0.0';
      const card = document.createElement('div');
      card.className = `goalie-card ${isActive ? 'active' : ''}`;
      card.innerHTML = `
        <button class="edit-goalie"><i class="fa-solid fa-pen"></i></button>
        <div class="goalie-name">#${g.number} ${g.name}</div>
        <div class="goalie-stats-grid">
          <div><div class="goalie-stat-label">Arrêts</div><div class="goalie-stat-value">${g.stats.saves}</div></div>
          <div><div class="goalie-stat-label">Buts</div><div class="goalie-stat-value">${g.stats.goals}</div></div>
        </div>
        <div class="goalie-global-stats">
          <div class="goalie-global-value">${savePct}%</div>
          <div class="goalie-global-label">% d'arrêts</div>
        </div>
      `;
      card.addEventListener('click', () => setActiveGoalie(teamId, g.id));
editPlayer(teamId, g.id); });
      container.appendChild(card);
    });
    $(`team${teamId}GoalieTitle`).textContent = gameState.teams[teamId].name;
  });
}

function updateCurrentLineDisplay() {
  [1,2].forEach(teamId => {
    const current = getCurrentLine(teamId);
    $(`team${teamId}-current-line`).textContent = current ? current.name : '-';
  });
}

function setActiveGoalie(teamId, goalieId) {
  gameState.activeGoalies[teamId] = goalieId;
  updateDisplay();
  const g = gameState.goalies[teamId].find(x => x.id === goalieId);
  if (g) { addEvent(`Gardien actif: ${g.name} (${gameState.teams[teamId].name})`, 'fa-solid fa-user-shield'); showToast(`${g.name} est maintenant le gardien actif`); }
}

// --- Events list & helpers ---
function formatTime(m,s){ return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

function addEvent(description, icon, lineInfo=null){
  const evt = { time: formatTime(gameState.timer.minutes, gameState.timer.seconds), description, icon, lineInfo, timestamp: Date.now() };
  gameState.events.unshift(evt);
  if (gameState.events.length > 50) gameState.events = gameState.events.slice(0,50);
  updateEventsDisplay();
}

function updateEventsDisplay() {
  DOM.eventsList.innerHTML = '';
  gameState.events.forEach(evt => {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.innerHTML = `
      <div class="event-time">${evt.time}</div>
      <div class="event-icon"><i class="${evt.icon}"></i></div>
      <div style="flex:1;">
        <div>${evt.description}</div>
        ${evt.lineInfo ? `<div style="font-size:.8rem;color:var(--text-dim);margin-top:.25rem;"><i class="fa-solid fa-users" style="margin-right:.25rem;"></i>${evt.lineInfo}</div>` : ''}
      </div>`;
    DOM.eventsList.appendChild(item);
  });
}

function showToast(message, type='success'){
  DOM.toastMessage.textContent = message;
  const icon = DOM.toast.querySelector('.toast-icon i');
  if (type === 'error') {
    icon.className = 'fa-solid fa-triangle-exclamation';
    DOM.toast.style.background = 'var(--error)';
  } else {
    icon.className = 'fa-solid fa-check';
    DOM.toast.style.background = 'var(--bg-light)';
  }
  DOM.toast.classList.add('show');
  setTimeout(() => DOM.toast.classList.remove('show'), 3000);
}

function closeModal(id){ $(id).classList.remove('active'); }

// --- Settings ---
function updateGameSettings() {
  gameState.settings.playersOnIce = parseInt(DOM.playersOnIce.value, 10);
  gameState.settings.rinkSize = DOM.rinkSize.value;
  gameState.timer.maxPeriods = parseInt(DOM.periods.value, 10);
  gameState.timer.periodLength = parseInt(DOM.periodLength.value, 10);
  DOM.periodInfo.textContent = `Période ${gameState.timer.period} sur ${gameState.timer.maxPeriods}`;
  addEvent('Paramètres de jeu mis à jour', 'fa-solid fa-gear');
}

// --- Data ---
function saveMatch() {
  const data = JSON.stringify(gameState, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hockey-match-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Match sauvegardé');
}

function resetMatch() {
  if (!confirm('Réinitialiser le match ?')) return;
  if (gameState.timer.isRunning) { clearInterval(timerInterval); gameState.timer.isRunning = false; }
  gameState = {
    timer: { minutes: 20, seconds: 0, isRunning: false, period: 1, maxPeriods: 3, periodLength: 20 },
    teams: {
      1: { name: 'Canadiens de Montréal', shots: 0, onTarget: 0, goals: 0, currentLineIndex: 0 },
      2: { name: 'Maple Leafs de Toronto', shots: 0, onTarget: 0, goals: 0, currentLineIndex: 0 }
    },
    players: { 1: [], 2: [] },
    lines: { 1: [], 2: [] },
    goalies: { 1: [], 2: [] },
    activeGoalies: { 1: null, 2: null },
    shots: [],
    events: [],
    selectedShotType: null,
    settings: { playersOnIce: 5, rinkSize: 'full' }
  };
  DOM.timerBtn.innerHTML = '<i class="fa-solid fa-play"></i> Démarrer';
  DOM.timerBtn.className = 'btn-primary';
  deselectShotType();
  drawRink();
  loadSampleData();
  updateDisplay();
  addEvent('Match réinitialisé', 'fa-solid fa-rotate-right');
  showToast('Match réinitialisé');
}

function getCurrentLine(teamId) {
  const idx = gameState.teams[teamId].currentLineIndex;
  return gameState.lines[teamId][idx] || null;
}

function loadSampleData() {
  const t1 = [
    { id: 1, number: 31, name: 'Carey Price', position: 'G', stats: { goals:0, assists:0, shots:0 } },
    { id: 2, number: 6, name: 'Shea Weber', position: 'RD', stats: { goals:0, assists:0, shots:0 } },
    { id: 3, number: 8, name: 'Ben Chiarot', position: 'LD', stats: { goals:0, assists:0, shots:0 } },
    { id: 4, number: 14, name: 'Nick Suzuki', position: 'C', stats: { goals:0, assists:0, shots:0 } },
    { id: 5, number: 22, name: 'Cole Caufield', position: 'RW', stats: { goals:0, assists:0, shots:0 } },
    { id: 6, number: 92, name: 'Jonathan Drouin', position: 'LW', stats: { goals:0, assists:0, shots:0 } }
renderLineSelects();

  ];
  const t2 = [
    { id: 7, number: 34, name: 'Auston Matthews', position: 'C', stats: { goals:0, assists:0, shots:0 } },
    { id: 8, number: 16, name: 'Mitch Marner', position: 'RW', stats: { goals:0, assists:0, shots:0 } },
    { id: 9, number: 88, name: 'William Nylander', position: 'LW', stats: { goals:0, assists:0, shots:0 } },
    { id: 10, number: 44, name: 'Morgan Rielly', position: 'LD', stats: { goals:0, assists:0, shots:0 } },
    { id: 11, number: 3, name: 'Justin Holl', position: 'RD', stats: { goals:0, assists:0, shots:0 } },
    { id: 12, number: 36, name: 'Jack Campbell', position: 'G', stats: { goals:0, assists:0, shots:0 } }
  ];
  gameState.players[1] = t1;
  gameState.players[2] = t2;
  gameState.goalies[1] = [ { id: 1, name:'Carey Price', number:31, stats:{ saves:0, goals:0, shots:0 } } ];
  gameState.goalies[2] = [ { id: 12, name:'Jack Campbell', number:36, stats:{ saves:0, goals:0, shots:0 } } ];
  gameState.activeGoalies[1] = 1;
  gameState.activeGoalies[2] = 12;
  gameState.lines[1] = [ { id: 1, name:'Ligne 1', players: t1.filter(p => p.position !== 'G').slice(0,5), isActive:true } ];
  gameState.lines[2] = [ { id: 2, name:'Ligne 1', players: t2.filter(p => p.position !== 'G').slice(0,5), isActive:true } ];
  gameState.teams[1].currentLineIndex = 0;
  gameState.teams[2].currentLineIndex = 0;
}
