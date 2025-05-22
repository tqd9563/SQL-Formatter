// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import { format, FormatOptionsWithLanguage } from 'sql-formatter';

// 默认的格式化配置
const defaultConfig: FormatOptionsWithLanguage = {
    language: 'sql',
    // uppercase: true,
    linesBetweenQueries: 2,
    keywordCase: 'upper',
    indentStyle: 'standard'
};

// 获取用户自定义配置
function getConfig(): FormatOptionsWithLanguage {
    const config = vscode.workspace.getConfiguration('sqlFormatter');
    return {
        ...defaultConfig,
        // uppercase: config.get('uppercase') ?? defaultConfig.uppercase,
        linesBetweenQueries: config.get('linesBetweenQueries') || defaultConfig.linesBetweenQueries,
        keywordCase: config.get('keywordCase') || defaultConfig.keywordCase,
        indentStyle: config.get('indentStyle') || defaultConfig.indentStyle
    };
}

// 格式化SQL代码
function formatSql(text: string, config: FormatOptionsWithLanguage): string {
    try {
        return format(text, config);
    } catch (error) {
        vscode.window.showErrorMessage(`SQL格式化错误: ${error}`);
        return text;
    }
}

// 注册命令
export function activate(context: vscode.ExtensionContext) {
    // 注册格式化命令
    let disposable = vscode.commands.registerCommand('sqlformatter.format', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const selection = editor.selection;
        const config = getConfig();

        // 获取选中的文本或整个文档
        const text = selection.isEmpty
            ? document.getText()
            : document.getText(selection);

        // 格式化SQL
        const formattedText = formatSql(text, config);

        // 替换文本
        editor.edit((editBuilder: vscode.TextEditorEdit) => {
            if (selection.isEmpty) {
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                editBuilder.replace(fullRange, formattedText);
            } else {
                editBuilder.replace(selection, formattedText);
            }
        }).then(() => {
            vscode.window.showInformationMessage('SQL格式化完成');
        });
    });

    // 注册自动格式化
    let formatOnSave = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        const config = vscode.workspace.getConfiguration('sqlFormatter');
        if (config.get('formatOnSave') && document.languageId === 'sql') {
            vscode.commands.executeCommand('sqlformatter.format');
        }
    });

    context.subscriptions.push(disposable, formatOnSave);
}

export function deactivate() {} 