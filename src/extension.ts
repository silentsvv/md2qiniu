import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import oss from './oss';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('md2qiniu.postImage', () => {
		Paster.paste();
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

class Paster {
	public static paste() {
		let editor = vscode.window.activeTextEditor;
        if (!editor) return;

        let fileUri = editor.document.uri;
        let fileFolder = vscode.Uri.joinPath(fileUri, '../').path;

		const instance = this;
		const imagePath = path.resolve(fileFolder, `./${new Date().getTime()}.png`);
		
		instance.saveAndPaste(editor, imagePath);
	}

	public static saveAndPaste(editor: vscode.TextEditor, imagePath: string) {
		this.saveClipboardImageToFileAndGetPath(imagePath, async (imagePath, imagePathFromScript) => {
            let markDownString:string;
            let isUseRelative: Boolean = false;
            let config = vscode.workspace.getConfiguration('md2qiniu');
            try {
                markDownString = await oss(config, imagePathFromScript);
            } catch (error) {
                console.log('error: ', error);
                throw error;
            }
            markDownString = this.imagePathToMarkdown(isUseRelative, markDownString ? markDownString:imagePathFromScript);
            editor.edit(edit => {
                let current = editor.selection;

                if (!isUseRelative) vscode.window.showInformationMessage('图片上传成功！');

                if (current.isEmpty) {
                    edit.insert(current.start, markDownString);
                } else {
                    edit.replace(current, imagePath);
                }
            })
		})
    }
    
    public static imagePathToMarkdown(isUseRelative: Boolean, imagePath: string):string {
        if (isUseRelative) {
            let fileArr = imagePath.split('/');
            let fileName = fileArr[fileArr.length - 1];
            return `![](${fileName})`;
        }

        return `![](${imagePath})`;
    }

	 /**
     * use applescript to save image from clipboard and get file path
     */
    private static saveClipboardImageToFileAndGetPath(imagePath: string, cb: (imagePath: string, imagePathFromScript: string) => void) {
        if (!imagePath) return;

        let platform = process.platform;
        if (platform === 'win32') {
            // Windows
            const scriptPath = path.join(__dirname, '../../res/pc.ps1');

            let command = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
            let powershellExisted = fs.existsSync(command)
            if (!powershellExisted) {
                command = "powershell"
            }

            const powershell = spawn(command, [
                '-noprofile',
                '-noninteractive',
                '-nologo',
                '-sta',
                '-executionpolicy', 'unrestricted',
                '-windowstyle', 'hidden',
                '-file', scriptPath,
                imagePath
            ]);
            powershell.on('error', function (e) {
                if (e.code == "ENOENT") {
                    console.log(`The powershell command is not in you PATH environment variables. Please add it and retry.`);
                } else {
                    console.log(e);
                }
            });
            powershell.on('exit', function (code, signal) {
                // console.log('exit', code, signal);
            });
            powershell.stdout.on('data', function (data: Buffer) {
                cb(imagePath, data.toString().trim());
            });
        }
        else if (platform === 'darwin') {
            // Mac
            let scriptPath = path.join(__dirname, '../../res/mac.applescript');

            let ascript = spawn('osascript', [scriptPath, imagePath]);
            ascript.on('error', function (e) {
                console.log(e);
            });
            ascript.on('exit', function (code, signal) {
                // console.log('exit',code,signal);
            });
            ascript.stdout.on('data', function (data: Buffer) {
                cb(imagePath, data.toString().trim());
            });
        } else {
            // Linux 
            let scriptPath = path.join(__dirname, '../res/linux.sh');

            let ascript = spawn('sh', [scriptPath, imagePath]);
            ascript.on('error', function (e) {
                console.log(e);
            });
            ascript.on('exit', function (code, signal) {
				console.log(code, 'code')
            });
            ascript.stdout.on('data', function (data: Buffer) {
				let result = data.toString().trim();
                if (result == "no xclip") {
                    console.log('You need to install xclip command first.');
                    return;
				}
                cb(imagePath, result);
            });
        }
    }
}


