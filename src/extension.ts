/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { ConfigurationChangeEvent, ExtensionContext, Uri, WorkspaceFoldersChangeEvent, commands, window, workspace } from 'vscode'
import { Commands } from './Commands'
import BranchGit from './Git/BranchGit'
import Config from './Config'
import DiffDisplayer from './DiffDisplayer'
import DocumentContentProvider from './Document/DocumentContentProvider'
import FileNode from './StashNode/FileNode'
import FileSystemWatcherManager from './FileSystemWatcherManager'
import NodeContainer from './Explorer/TreeNode/NodeContainer'
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

    const wsGit = new WorkspaceGit(config)
    const wsGit2 = new WorkspaceGit(config)
    const stashGit = new StashGit()
    const stashGit2 = new StashGit()
    const stashGit3 = new StashGit()
    const branchGit = new BranchGit()
    const branchGit2 = new BranchGit()

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
        new StashCommands(config, wsGit, stashGit2, branchGit, window.createOutputChannel(channelName), stashLabels),
        new DiffDisplayer(uriGenerator, stashLabels),
        stashLabels,
        branchGit2,
    )

    const watcherManager = new FileSystemWatcherManager(
        wsGit2.getRepositories(),
        (projectDirectory: Uri) => {
            treeProvider.reload('update', projectDirectory)
        },
    )

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
                treeProvider.reload('settings')
            }
        }),

        watcherManager,
    )

    treeProvider.toggle()
}

/**
 * Checks if there is at least one git repository open and notifies it to vsc.
 */
function notifyHasRepository(workspaceGit: WorkspaceGit) {
    void workspaceGit
        .hasGitRepository()
        .then((has) => commands.executeCommand('setContext', 'hasGitRepository', has))
}
