import * as vscode from 'vscode';
import Search from './search';
import { QuickPickItem } from './types';

export default class FuzzySearch {
  private search = new Search();
  private quickPick = vscode.window.createQuickPick<QuickPickItem>();
  private timeout: any;

  constructor(context: vscode.ExtensionContext) {
    this.onDidChangeValue = this.onDidChangeValue.bind(this);
    this.onAccept = this.onAccept.bind(this);

    this.search.onData(searchItems => {
      try {
        const quickPickItems = [...new Set([...searchItems])]
          .slice(0, 30)
          .map((filePath) =>
            createQuickPickItem(filePath, true)
          );

        this.quickPick.items = quickPickItems;
      } finally {
        this.quickPick.busy = false;
      }
    });

    let line = getCurrentLineText();
    this.quickPick.value = getRelevantLinePart(line);
    this.quickPick.placeholder = "Fuzzy search";
    this.quickPick.matchOnDescription = true;
    (this.quickPick as any).sortByLabel = false;

    this.quickPick.onDidChangeValue(this.onDidChangeValue);
    this.quickPick.onDidAccept(this.onAccept);

    this.quickPick.show();

    this.find('');
  }

  private onDidChangeValue(value: string) {
    this.find(value);
  }

  private find(value: string) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.quickPick.busy = true;
      const searchTerm = value.toString();
      this.search.search(searchTerm);
    }, 200);
  }

  onAccept(e: any) {

    const selectedItem = this.quickPick.selectedItems[0].resultLine;
    if (selectedItem) {

      console.log("123");
      replaceEndInCurrentLine(selectedItem);
    }


    this.quickPick.hide();
  }
} // end off class


function createQuickPickItem(
  resultLine: string,
  isRecent: boolean
): QuickPickItem {

  return {
    label: resultLine,
    //description: "test description",
    alwaysShow: true,
    resultLine: resultLine,
  };
}


// from perplexityAI:
function getCurrentLineText(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return '';
  }

  const selection = editor.selection;
  const line = selection.active.line;
  const lineText = editor.document.lineAt(line).text;

  return lineText;
}


/**
 * assume to get a complete line,
 * return only the part which should be autocompleted
*/
function getRelevantLinePart(line: string): string {
  // regex-split at one of those chars: " ", ",", "=", ";"
  let parts = line.trim().split(/[\s,=;]+/);
  return parts[parts.length -1];

}


/**
 * take the result from the pick dialogue and insert it in the current line
 */
function replaceEndInCurrentLine(newEnd: string): void{
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showErrorMessage("Editor does not exist!");
    return;
  }

  const line = editor.document.lineAt(editor.selection.active.line);

  const lineText = getCurrentLineText();
  const oldEnd = getRelevantLinePart(lineText);
  const newLineText = lineText.replace(oldEnd, newEnd);


  editor.edit((editBuilder) => {
    editBuilder.replace(line.range, newLineText);
  });
  console.log("done:");
  console.log(newLineText);
}
