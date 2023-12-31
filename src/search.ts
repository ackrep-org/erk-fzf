import { QuickPickItem } from './types';
//const { spawn } = require('child_process');
import * as vscode from 'vscode';

import { exec } from 'child_process';
import fs = require('fs');

interface DataResultCallback {
  (filePaths: string[]): void;
}

function getOsPath(): String {
  const extensionPath = vscode.extensions.getExtension('tatosjb.fuzzy-search')?.extensionPath;

  switch (process.platform) {
    case 'darwin':
      return `${extensionPath}/binaries/darwin`;
    case 'win32':
      return `${extensionPath}/binaries/windows`;
    case 'linux':
      return `${extensionPath}/binaries/linux`;
    default:
      return `${extensionPath}/binaries/linux`;
  }
};


function getAutoCompleteCandidateFile() {
  const fname = ".ac_candidates.txt"
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {

    let msg = `erkfzf: no workspace defined -> could not load ${fname}`
    console.error(msg);
    vscode.window.showErrorMessage(msg);
    return; // No workspace folders
  }


  const firstWorkspaceFolder = workspaceFolders[0];

  let path = `${firstWorkspaceFolder.uri.path}/${fname}`;
  if (!fs.existsSync(path)) {
    let msg = `Error: ${fname} does not exist in the root dir of current workspace (${firstWorkspaceFolder})`
    console.error(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }

  return path;
}

function getFzfPath(): string {
  return process.platform === 'win32' ? `${getOsPath()}/fzf.exe` : `${getOsPath()}/fzf`;
};

function buildSearch(fzf: string, text: string): string {

  // TODO: evaluate if this is the optimal place for this call
  // should it really be called before every search?
  const autoCompleteCandidateFile = getAutoCompleteCandidateFile();

  // return text ? `${fd} -H --exclude '.git' --type f . '${path || ''}' | ${fzf} --tiebreak=end -m -f '${text}'\n` : '';
  // TODO: ship fzf binary with this extension
  return `cat ${autoCompleteCandidateFile} | fzf -m --filter '${text}'` ;
}

export default class Search {
  //private sh = spawn('sh', []);
  private fzfPath = getFzfPath();
  private onDataListeners: DataResultCallback[];
  private fileNames: string[];

  constructor(){
    this.onDataListeners = [];
    this.fileNames = [];

    this.onResultData = this.onResultData.bind(this);

    // this.sh.stdout.on('data', this.onResultData);
  }

  private async onResultData(data: string) {

    this.fileNames = this.fileNames
      .concat(
        data.toString()
          .split('\n')
          .filter(filePath => filePath.trim() !== '')
      ).slice(0, 30);

    this.onDataListeners.forEach(listener => listener(this.fileNames));
  }

  async search(text: string): Promise<void> {

    this.fileNames = [];
    if(text.length > 0){
      const command = buildSearch(this.fzfPath, text.replace(/::/g, '').toLowerCase());


      //this.sh.stdin.write(Buffer.from(command));
      const result = await executeCommand(command);
      this.onResultData(result);


    } else {
      this.onResultData('');
    }
  }

  onData(callback: DataResultCallback){
    this.onDataListeners.push(callback);
  }
}

function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
