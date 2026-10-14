const SAVE_HISTORY_HEADING = "История сохранения";
const VOTINGS_HEADING = "Результаты голосований";

function getHeadingSection(headingText) {
  const headings = document.querySelectorAll("h5");
  const heading = Array.from(headings).find(
    (element) => element.textContent.trim() === headingText,
  );

  return heading?.parentElement ?? undefined;
}

// The save history block has no stable ID, so locate it by its heading.
function hideSaveHistory() {
  const saveHistorySection = getHeadingSection(SAVE_HISTORY_HEADING);
  const saveHistoryEntries = saveHistorySection?.nextElementSibling;
  const canHideSaveHistory = Boolean(
    saveHistorySection && saveHistoryEntries,
  );

  if (!canHideSaveHistory) {
    return;
  }

  saveHistorySection.style.setProperty("display", "none", "important");
  saveHistoryEntries.style.setProperty("display", "none", "important");
}

// The voting results heading has no stable ID, so locate it by its text.
function hideVotingsHeading() {
  const votingsHeadingSection = getHeadingSection(VOTINGS_HEADING);
  const canHideVotingsHeading = votingsHeadingSection !== undefined;

  if (!canHideVotingsHeading) {
    return;
  }

  votingsHeadingSection.style.setProperty("display", "none", "important");
}

hideSaveHistory();
hideVotingsHeading();
