// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as vscode from 'vscode';
import { format, FormatOptionsWithLanguage } from 'sql-formatter';

// 默认的格式化配置
const defaultConfig: FormatOptionsWithLanguage = {
    language: 'sql',
    linesBetweenQueries: 2,
    indentStyle: 'standard'
};

// 自定义格式化规则
function applyCustomFormatting(text: string): string {
    // 处理 WITH 子句，确保 WITH 和表名在同一行
    text = text.replace(/WITH\s+([a-zA-Z0-9_]+)\s+AS\s*\(/gi, 'WITH $1 AS (');
    
    // 处理其他自定义规则
    // 例如：确保 SELECT 关键字后的字段在同一行
    text = text.replace(/SELECT\s+([^,\n]+)(,)/gi, 'SELECT $1$2');
    
    // 确保所有缩进都是4个空格
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
        // 计算当前行的缩进空格数
        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        // 将缩进转换为4的倍数
        const indentLevel = Math.ceil(leadingSpaces / 4);
        // 生成新的缩进
        const newIndent = '    '.repeat(indentLevel);
        // 替换原有缩进
        return newIndent + line.trimLeft();
    });
    
    return formattedLines.join('\n');
}

// 获取用户自定义配置
function getConfig(): FormatOptionsWithLanguage {
    const config = vscode.workspace.getConfiguration('sqlFormatter');
    return {
        ...defaultConfig,
        linesBetweenQueries: config.get('linesBetweenQueries') || defaultConfig.linesBetweenQueries,
        indentStyle: config.get('indentStyle') || defaultConfig.indentStyle
    };
}

// 格式化SQL代码
function formatSql(text: string, config: FormatOptionsWithLanguage): string {
    try {
        // 首先使用 sql-formatter 进行基本格式化
        let formattedText = format(text, config);
        
        // 然后应用自定义格式化规则
        formattedText = applyCustomFormatting(formattedText);
        
        return formattedText;
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