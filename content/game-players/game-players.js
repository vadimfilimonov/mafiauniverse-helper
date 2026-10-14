const GAME_PLAYERS_TABLE_SELECTOR = 'table[asp-for="GamePlayers"]';
const PLAYER_NAME_SELECTOR = "input.GamePlayers_Player_Name";
const PLAYER_VOTE_CONTROL_SELECTOR = '[id^="AddOnVote_"]';
const GUN_ICON_SELECTOR = "thead .fa-gun";
const ACTIVE_PLAYER_CONTROL_CLASS = "add-player-to-vote";
const MUTED_PLAYER_NAME_CLASSES = [
  "text-muted",
  "text-decoration-line-through",
];

function updatePlayerNameAppearance(playerNameInput) {
  const playerRow = playerNameInput.closest("tr");
  const playerVoteControl = playerRow?.querySelector(
    PLAYER_VOTE_CONTROL_SELECTOR,
  );
  const hasActivePlayerControl = Boolean(
    playerVoteControl?.classList.contains(ACTIVE_PLAYER_CONTROL_CLASS),
  );

  MUTED_PLAYER_NAME_CLASSES.forEach((className) => {
    playerNameInput.classList.toggle(className, !hasActivePlayerControl);
    playerVoteControl?.classList.toggle(className, !hasActivePlayerControl);
  });
}

function updateGamePlayersAppearance(gamePlayersTable) {
  const playerNameInputs = gamePlayersTable.querySelectorAll(PLAYER_NAME_SELECTOR);

  playerNameInputs.forEach(updatePlayerNameAppearance);
}

function replaceOneGunHeading(gamePlayersTable) {
  const gunIcon = gamePlayersTable.querySelector(GUN_ICON_SELECTOR);
  const oneGunHeading = gunIcon?.closest("th");
  const isOneGunHeading = oneGunHeading instanceof HTMLTableCellElement;

  if (!isOneGunHeading) {
    return;
  }

  oneGunHeading.textContent = "ПУ";
}

function applyGamePlayersAdjustments(gamePlayersTable) {
  updateGamePlayersAppearance(gamePlayersTable);
  replaceOneGunHeading(gamePlayersTable);
}

function observeGamePlayersAdjustments(gamePlayersTable) {
  const gamePlayersObserver = new MutationObserver(() => {
    applyGamePlayersAdjustments(gamePlayersTable);
  });

  gamePlayersObserver.observe(gamePlayersTable, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
}

function initializeGamePlayers() {
  const gamePlayersTable = document.querySelector(GAME_PLAYERS_TABLE_SELECTOR);
  const isGamePlayersTable = gamePlayersTable instanceof HTMLTableElement;

  if (!isGamePlayersTable) {
    return;
  }

  applyGamePlayersAdjustments(gamePlayersTable);
  observeGamePlayersAdjustments(gamePlayersTable);
}

initializeGamePlayers();
