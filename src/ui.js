/**
 * UI helpers for menus and onboarding dialogs.
 */

/**
 * Adds the GPT for Sheets menu on open/install events.
 */
function onOpen() {
  buildMenu();
}

/**
 * Ensures the menu exists after installation.
 */
function onInstall() {
  onOpen();
}

function buildMenu() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('GPT for Sheets')
    .addItem('Insert "=GPT(\\"Explain A1\\")"', 'insertExampleFormula')
    .addSeparator()
    .addItem('Configuration help', 'showSetupSidebar')
    .addToUi();
}

function insertExampleFormula() {
  var activeRange = SpreadsheetApp.getActiveRange();
  if (!activeRange) {
    SpreadsheetApp.getUi().alert('Select a cell before inserting an example.');
    return;
  }
  activeRange.setValue('=GPT("Explain A1")');
}

function showSetupSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('GPT for Sheets Setup');
  SpreadsheetApp.getUi().showSidebar(html);
}
