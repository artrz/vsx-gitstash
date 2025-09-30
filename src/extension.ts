/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import './_global'
import { ConfigurationChangeEvent, ExtensionContext, Uri, WorkspaceFoldersChangeEvent, commands, window, workspace } from 'vscode'
import { Commands } from './Commands'
import BranchGit from './Git/BranchGit'
import Config from './Config'
import DiffDisplayer from './DiffDisplayer'
import DocumentContentProvider from './Document/DocumentContentProvider'
import FileNode from './StashNode/FileNode'
import FileSystemWatcherManager from './FileSystemWatcherManager'
import NodeContainer from './Explorer/TreeNode/NodeContainer'
import { Execution } from './Foundation/Executor'
import { LogChannel } from './LogChannel'
import { StashCommands } from './StashCommands'
import StashGit from './Git/StashGit'
import StashLabels from './StashLabels'
import TreeDataProvider from './Explorer/TreeDataProvider'
import TreeDecorationProvider from './Explorer/TreeDecorationProvider'
import UriGenerator from './UriGenerator'
import WorkspaceGit from './Git/WorkspaceGit'

export function activate(context: ExtensionContext): void {
    const packJson = context.extension.packageJSON as { name: string, displayName: string }

    const configPrefix = packJson.name
    const channelName = packJson.displayName

    const config = new Config(configPrefix)
    global.setDebug(config.get<boolean>(config.key.advancedDebugEnabled))

    const logChannel = new LogChannel(channelName)
    const gitCallback = (exec: Execution) => {
        // Attach the logger to the git command callback.
        exec.promise = exec.promise
            .then((exeResult) => {
                if (config.get<boolean>(config.key.logAutoclear)) {
                    logChannel.clear()
                }
                logChannel.logExeResult(exec.args, exeResult)
                return exeResult
            })
            .catch((error: unknown) => {
                logChannel.logExeError(exec.args, error)
                throw error
            })
    }

    const wsGit = new WorkspaceGit(config, gitCallback)
    const wsGit2 = new WorkspaceGit(config, gitCallback)
    const stashGit = new StashGit(gitCallback)
    const stashGit2 = new StashGit(gitCallback)
    const stashGit3 = new StashGit(gitCallback)
    const branchGit = new BranchGit(gitCallback)
    const branchGit2 = new BranchGit(gitCallback)

    notifyHasRepository(wsGit2)

    const nodeContainer = new NodeContainer(wsGit, stashGit)
    const uriGenerator = new UriGenerator(nodeContainer)
    const stashLabels = new StashLabels(config)

    const treeProvider = new TreeDataProvider(
        config,
        nodeContainer,
        uriGenerator,
        stashLabels,
    )

    const stashCommands = new Commands(
        nodeContainer,
        new StashCommands(config, wsGit, stashGit2, branchGit, logChannel),
        new DiffDisplayer(uriGenerator, stashLabels),
        stashLabels,
        branchGit2,
    )

    // Attach and error handler to notify the user if unable to get the repositories.
    const repos = wsGit2.getRepositories().catch((value: unknown) => {
        const msg = value instanceof Error ? value.message : JSON.stringify(value)
        window.showErrorMessage(msg)
        throw value
    })

    const watcherManager = new FileSystemWatcherManager(
        repos,
        (projectDirectory: Uri) => {
            global.dbg(`[Watch] Reloading explorer (${projectDirectory.fsPath})...`)
            treeProvider.reload('update', projectDirectory)
        },
    )
    global.dbg('[boot] FS Watcher created')

    context.subscriptions.push(
        new TreeDecorationProvider(config),
        treeProvider.view,

        workspace.registerTextDocumentContentProvider(UriGenerator.fileScheme, new DocumentContentProvider(stashGit3)),

        commands.registerCommand('gitstash.settings.open', () => commands.executeCommand(
            'workbench.action.openSettings', `@ext:${context.extension.id}`)),

        commands.registerCommand('gitstash.explorer.toggle', treeProvider.toggle),
        commands.registerCommand('gitstash.explorer.sortName', () => { treeProvider.setSorting('name') }),
        commands.registerCommand('gitstash.explorer.sortPath', () => { treeProvider.setSorting('path') }),
        commands.registerCommand('gitstash.explorer.sortTree', () => { treeProvider.setSorting('tree') }),
        commands.registerCommand('gitstash.explorer.refresh', treeProvider.refresh),

        commands.registerCommand('gitstash.stash', stashCommands.stash),
        commands.registerCommand('gitstash.clear', stashCommands.clear),
        commands.registerCommand('gitstash.openDir', stashCommands.openDir),

        commands.registerCommand('gitstash.show', stashCommands.show),
        commands.registerCommand('gitstash.diffChangesCurrent', (node: FileNode) => { treeProvider.focus(node); stashCommands.diffChangesCurrent(node) }),
        commands.registerCommand('gitstash.diffCurrentChanges', (node: FileNode) => { treeProvider.focus(node); stashCommands.diffCurrentChanges(node) }),
        commands.registerCommand('gitstash.diffSourceCurrent', (node: FileNode) => { treeProvider.focus(node); stashCommands.diffSourceCurrent(node) }),
        commands.registerCommand('gitstash.diffCurrentSource', (node: FileNode) => { treeProvider.focus(node); stashCommands.diffCurrentSource(node) }),

        commands.registerCommand('gitstash.pop', stashCommands.pop),
        commands.registerCommand('gitstash.apply', stashCommands.apply),
        commands.registerCommand('gitstash.branch', stashCommands.branch),
        commands.registerCommand('gitstash.drop', stashCommands.drop),
        commands.registerCommand('gitstash.multiDrop', stashCommands.multiDrop),

        commands.registerCommand('gitstash.applySingle', stashCommands.applySingle),
        commands.registerCommand('gitstash.createSingle', stashCommands.createSingle),
        commands.registerCommand('gitstash.openCurrent', stashCommands.openFile),

        commands.registerCommand('gitstash.stashSelected', stashCommands.stashSelected),

        commands.registerCommand('gitstash.quickSwitch', stashCommands.quickSwitch),
        commands.registerCommand('gitstash.quickBack', stashCommands.quickBack),

        commands.registerCommand('gitstash.clipboardRepositoryPath', stashCommands.toClipboardFromObject),
        commands.registerCommand('gitstash.clipboardStashMessage', stashCommands.toClipboardFromObject),
        commands.registerCommand('gitstash.clipboardStashHash', stashCommands.clipboardStashHash),
        commands.registerCommand('gitstash.clipboardStashHashShort', stashCommands.clipboardStashHashShort),
        commands.registerCommand('gitstash.clipboardFilePath', stashCommands.toClipboardFromObject),
        commands.registerCommand('gitstash.clipboardInfo', stashCommands.clipboardFromTemplate),

        workspace.onDidChangeWorkspaceFolders((e: WorkspaceFoldersChangeEvent) => {
            notifyHasRepository(wsGit2)
            watcherManager.configure(e)
            treeProvider.reload('settings')
        }),

        workspace.onDidChangeConfiguration((e: ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('gitstash')) {
                config.reload()
                global.setDebug(config.get<boolean>(config.key.advancedDebugEnabled))
                treeProvider.reload('settings')
            }
        }),

        watcherManager,
    )

    treeProvider.toggle()

    global.dbg(`[boot] 🚀 ${channelName} started`)
}

/**
 * Checks if there is at least one git repository open and notifies it to vsc.
 */
function notifyHasRepository(workspaceGit: WorkspaceGit) {
    void workspaceGit
        .hasGitRepository()
        .then((has) => {
            commands.executeCommand('setContext', 'hasGitRepository', has)
            global.dbg(`[state] setContext('hasGitRepository', ${has})`)
        })
}
