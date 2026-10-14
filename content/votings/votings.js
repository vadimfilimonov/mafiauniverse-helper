const VOTINGS_TABLE_ID = "Votings";
const FORMATTED_VOTINGS_ID = "FormattedVotings";
const MAX_PLAYERS = 10;
const VOTING_VALUE_PATTERN = /\[в(\d+)-(\d+)\]/gi;
const DEPARTED_PLAYERS_PATTERN = /уш(?:[её]л|ли)\s+([\d,\s]+)/i;
const VOTING_TITLE = "Голосование";
const REVOTE_TITLE = "Переголосование";
const NOMINATION_LABEL = "Выставление";
const VOTES_LABEL = "Голоса";

function parseVoting(votingRow) {
  const votingText = votingRow.textContent.trim();
  const entries = Array.from(votingText.matchAll(VOTING_VALUE_PATTERN))
    .slice(0, MAX_PLAYERS)
    .map((match) => ({
      playerNumber: match[1],
      votesCount: match[2],
    }));
  const departedPlayerNumbers = new Set(
    votingText.match(DEPARTED_PLAYERS_PATTERN)?.[1].match(/\d+/g) ?? [],
  );

  return { entries, departedPlayerNumbers };
}

function getMostVotedPlayerNumbers(entries) {
  const highestVotesCount = Math.max(
    0,
    ...entries.map((entry) => Number(entry.votesCount)),
  );
  const hasVotes = highestVotesCount > 0;

  if (!hasVotes) {
    return new Set();
  }

  return new Set(
    entries
      .filter((entry) => Number(entry.votesCount) === highestVotesCount)
      .map((entry) => entry.playerNumber),
  );
}

function doSetsMatch(firstSet, secondSet) {
  return (
    firstSet.size === secondSet.size &&
    Array.from(firstSet).every((value) => secondSet.has(value))
  );
}

function getVotings(votingRows) {
  const votings = [];

  votingRows.map(parseVoting).forEach((voting) => {
    const hasVotingEntries = voting.entries.length > 0;

    if (hasVotingEntries) {
      votings.push(voting);
      return;
    }

    const previousVoting = votings.at(-1);
    const hasPreviousVoting = previousVoting !== undefined;
    const hasDepartedPlayers = voting.departedPlayerNumbers.size > 0;

    if (hasPreviousVoting && hasDepartedPlayers) {
      previousVoting.departedPlayerNumbers = voting.departedPlayerNumbers;
    }
  });

  return votings;
}

function didTiedPlayersStay(votings, votingIndex) {
  const voting = votings[votingIndex];
  const previousVoting = votings[votingIndex - 1];
  const hasPreviousVoting = previousVoting !== undefined;
  const hasFollowingVoting = votingIndex < votings.length - 1;
  const hasDepartedPlayers = voting.departedPlayerNumbers.size > 0;
  const mostVotedPlayerNumbers = getMostVotedPlayerNumbers(voting.entries);
  const previousMostVotedPlayerNumbers = hasPreviousVoting
    ? getMostVotedPlayerNumbers(previousVoting.entries)
    : new Set();
  const isTiedVote = mostVotedPlayerNumbers.size > 1;
  const hasSameTiedResult =
    hasPreviousVoting &&
    doSetsMatch(mostVotedPlayerNumbers, previousMostVotedPlayerNumbers);

  return (
    isTiedVote &&
    hasSameTiedResult &&
    !hasDepartedPlayers &&
    hasFollowingVoting
  );
}

function isVotingContinuation(previousVoting, voting) {
  const previousMostVotedPlayerNumbers = getMostVotedPlayerNumbers(
    previousVoting.entries,
  );
  const currentPlayerNumbers = new Set(
    voting.entries.map((entry) => entry.playerNumber),
  );
  const hasTiedPreviousVote = previousMostVotedPlayerNumbers.size > 1;

  return (
    hasTiedPreviousVote &&
    doSetsMatch(previousMostVotedPlayerNumbers, currentPlayerNumbers)
  );
}

function getVotingGroups(votings) {
  return votings.reduce((votingGroups, voting, votingIndex) => {
    const previousVoting = votings[votingIndex - 1];
    const isContinuation =
      previousVoting !== undefined &&
      isVotingContinuation(previousVoting, voting);

    if (isContinuation) {
      votingGroups.at(-1).push(voting);
      return votingGroups;
    }

    votingGroups.push([voting]);

    return votingGroups;
  }, []);
}

function createVotingCell(tagName, text) {
  const cell = document.createElement(tagName);
  cell.textContent = text;

  return cell;
}

function createVotingDataRow(
  label,
  entries,
  mostVotedPlayerNumbers,
  departedPlayerNumbers,
  tiedPlayersStayed,
  propertyName,
  playersCount,
  playerNumbers = entries.map((entry) => entry.playerNumber),
) {
  const votingRow = document.createElement("tr");
  votingRow.classList.add("voting-data-row");
  votingRow.append(createVotingCell("th", label));

  for (let playerIndex = 0; playerIndex < playersCount; playerIndex += 1) {
    const playerNumber = playerNumbers[playerIndex];
    const entry = entries.find(
      (votingEntry) => votingEntry.playerNumber === playerNumber,
    );
    const cellText = entry?.[propertyName] ?? "";
    const cell = createVotingCell("td", cellText);
    const hasVotingEntry = entry !== undefined;
    const isMostVotedPlayer =
      hasVotingEntry && mostVotedPlayerNumbers.has(playerNumber);
    const isDepartedPlayer =
      hasVotingEntry && departedPlayerNumbers.has(playerNumber);
    const isStayedTiedPlayer = tiedPlayersStayed && isMostVotedPlayer;

    if (isDepartedPlayer) {
      cell.classList.add("departed-player");
    } else if (isStayedTiedPlayer) {
      cell.classList.add("stayed-player");
    }

    votingRow.append(cell);
  }

  return votingRow;
}

function createFormattedVotingRound(
  voting,
  playersCount,
  tiedPlayersStayed,
) {
  const mostVotedPlayerNumbers = getMostVotedPlayerNumbers(voting.entries);
  const votingFragment = document.createDocumentFragment();

  votingFragment.append(
    createVotingDataRow(
      NOMINATION_LABEL,
      voting.entries,
      mostVotedPlayerNumbers,
      voting.departedPlayerNumbers,
      tiedPlayersStayed,
      "playerNumber",
      playersCount,
    ),
    createVotingDataRow(
      VOTES_LABEL,
      voting.entries,
      mostVotedPlayerNumbers,
      voting.departedPlayerNumbers,
      tiedPlayersStayed,
      "votesCount",
      playersCount,
    ),
  );

  return votingFragment;
}

function getVotingGroupPlayerNumbers(votingGroup) {
  return Array.from(
    new Set(
      votingGroup.flatMap((voting) =>
        voting.entries.map((entry) => entry.playerNumber),
      ),
    ),
  );
}

function createFormattedRevoteRow(
  voting,
  playersCount,
  playerNumbers,
  tiedPlayersStayed,
) {
  const mostVotedPlayerNumbers = getMostVotedPlayerNumbers(voting.entries);

  return createVotingDataRow(
    REVOTE_TITLE,
    voting.entries,
    mostVotedPlayerNumbers,
    voting.departedPlayerNumbers,
    tiedPlayersStayed,
    "votesCount",
    playersCount,
    playerNumbers,
  );
}

function createFormattedVotingGroup(
  votingGroup,
  votingNumber,
  playersCount,
  votings,
) {
  const votingFragment = document.createDocumentFragment();
  const titleRow = document.createElement("tr");
  const headingCell = createVotingCell("th", `${VOTING_TITLE} ${votingNumber}`);
  headingCell.colSpan = playersCount + 1;
  titleRow.append(headingCell);
  votingFragment.append(titleRow);
  const playerNumbers = getVotingGroupPlayerNumbers(votingGroup);

  votingGroup.forEach((voting, roundIndex) => {
    const isRevote = roundIndex > 0;
    const votingIndex = votings.indexOf(voting);
    const tiedPlayersStayed = didTiedPlayersStay(votings, votingIndex);

    const formattedVoting = isRevote
      ? createFormattedRevoteRow(
          voting,
          playersCount,
          playerNumbers,
          tiedPlayersStayed,
        )
      : createFormattedVotingRound(voting, playersCount, tiedPlayersStayed);

    votingFragment.append(formattedVoting);
  });

  return votingFragment;
}

function getFormattedVotingsContainer(votingsTable) {
  const formattedVotingsContainer = document.getElementById(
    FORMATTED_VOTINGS_ID,
  );
  const formattedVotingsContainerExists = formattedVotingsContainer !== null;

  if (formattedVotingsContainerExists) {
    return formattedVotingsContainer;
  }

  const newFormattedVotingsContainer = document.createElement("div");
  newFormattedVotingsContainer.id = FORMATTED_VOTINGS_ID;
  votingsTable.insertAdjacentElement("afterend", newFormattedVotingsContainer);

  return newFormattedVotingsContainer;
}

function createFormattedVotingsColumnGroup(playersCount) {
  const columnGroup = document.createElement("colgroup");
  const labelColumn = document.createElement("col");
  labelColumn.classList.add("voting-label-column");
  columnGroup.append(labelColumn);

  for (let playerIndex = 0; playerIndex < playersCount; playerIndex += 1) {
    columnGroup.append(document.createElement("col"));
  }

  return columnGroup;
}

function renderFormattedVotings(votingsTable) {
  const votingRows = Array.from(votingsTable.tBodies).flatMap((votingBody) =>
    Array.from(votingBody.rows),
  );
  const votings = getVotings(votingRows);
  const votingGroups = getVotingGroups(votings);
  const playersCount = Math.max(
    1,
    ...votings.map((voting) => voting.entries.length),
  );
  const formattedVotingsContainer = getFormattedVotingsContainer(votingsTable);
  const formattedVotingsTable = document.createElement("table");
  formattedVotingsTable.className = votingsTable.className;
  const formattedVotingsBody = document.createElement("tbody");

  votingGroups.forEach((votingGroup, index) => {
    formattedVotingsBody.append(
      createFormattedVotingGroup(
        votingGroup,
        index + 1,
        playersCount,
        votings,
      ),
    );
  });

  formattedVotingsTable.append(
    createFormattedVotingsColumnGroup(playersCount),
    formattedVotingsBody,
  );
  formattedVotingsContainer.replaceChildren(formattedVotingsTable);
}

// Keep the formatted view in sync without changing the table used by the site.
function formatVotings() {
  const votingsTable = document.getElementById(VOTINGS_TABLE_ID);
  const isVotingsTable = votingsTable instanceof HTMLTableElement;

  if (!isVotingsTable) {
    return;
  }

  renderFormattedVotings(votingsTable);

  const votingsObserver = new MutationObserver(() => {
    renderFormattedVotings(votingsTable);
  });
  votingsObserver.observe(votingsTable, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

formatVotings();
