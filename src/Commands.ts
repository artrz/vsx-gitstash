/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as fs from 'fs'
import * as vscode from 'vscode'
import BranchGit from './Git/BranchGit'
import DiffDisplayer, { DiffSide } from './DiffDisplayer'
import FileNode from './StashNode/FileNode'
import { FileStage } from './Git/StashGit'
import Node from './StashNode/Node'
import NodeContainer from './StashNode/NodeContainer'
import RepositoryNode from './StashNode/RepositoryNode'
import { StashCommands } from './StashCommands'
import StashLabels from './StashLabels'
import StashNode from './StashNode/StashNode'

interface QuickPickRepositoryNodeItem extends vscode.QuickPickItem {
    node: RepositoryNode
}
interface QuickPickStashNodeItem extends vscode.QuickPickItem {
    node: StashNode
}

export class Commands {
    // A temporal container when switching branches
    private previousBranch?: string = undefined

    constructor(
        private nodeContainer: NodeContainer,
        private stashCommands: StashCommands,
        private displayer: DiffDisplayer,
        private stashLabels: StashLabels,
        private branchGit: BranchGit,
    ) {
    }

    /**
     * Creates a stash with the given resources from the scm changes list.
     *
     * @param resourceStates the list of the resources to stash
     */
    public stashSelected = (...resourceStates: vscode.SourceControlResourceState[]): void => {
        const paths = resourceStates.map(
            (resourceState: vscode.SourceControlResourceState) => resourceState.resourceUri.fsPath,
        )

        void vscode.window
            .showInputBox({
                placeHolder: 'Stash message',
                prompt: 'Optionally provide a stash message',
            })
            .then((stashMessage) => {
                if (typeof stashMessage === 'string') {
                    void this.stashCommands.push(paths, stashMessage)
                }
            })
    }

    /**
     * Shows a stashed file diff document.
     *
     * @param fileNode the involved node
     */
    public show = (fileNode: FileNode): void => void this.displayer.showDiff(fileNode)

    /**
     * Shows a diff document comparing the modified stashed file (left side)
     * with the current version (right side).
     */
    public diffChangesCurrent = (fileNode: FileNode): void => void this.displayer
        .showDiffCurrent(fileNode, FileStage.Change, DiffSide.Left)

    /**
     * Shows a diff document comparing the current version (left side)
     * with the modified stashed file (right side).
     */
    public diffCurrentChanges = (fileNode: FileNode): void => void this.displayer
        .showDiffCurrent(fileNode, FileStage.Change, DiffSide.Right)

    /**
     * Shows a diff document comparing the modified stashed file's parent (left side)
     * with the current version (right side).
     */
    public diffSourceCurrent = (fileNode: FileNode): void => void this.displayer
        .showDiffCurrent(fileNode, FileStage.Parent, DiffSide.Left)

    /**
     * Shows a diff document comparing the current version (left side)
     * with the modified stashed file's parent (right side).
     */
    public diffCurrentSource = (fileNode: FileNode): void => void this.displayer
        .showDiffCurrent(fileNode, FileStage.Parent, DiffSide.Right)

    /**
     * Opens the file inside an editor.
     *
     * @param fileNode the node with the file to open
     */
    public openFile = (fileNode: FileNode): void => void vscode.commands
        .executeCommand('vscode.open', vscode.Uri.file(fileNode.path))

    /**
     * Opens the directory pointed by repository node.
     *
     * @param repositoryNode the node with the directory to open
     */
    public openDir = (repositoryNode: RepositoryNode): void => void vscode.env
        .openExternal(vscode.Uri.parse(repositoryNode.path))

    /**
     * Generate a stash on the active repository or selects a repository and continues.
     *
     * @param repositoryNode the involved node
     */
    public stash = async (repositoryNode?: RepositoryNode): Promise<void> => {
        repositoryNode ??= await this.pickRepository('Create Stash')
        if (!repositoryNode) { return }

        const repositoryLabel = this.stashLabels.getName(repositoryNode)
        const options = [
            {
                label: 'Stash only',
                description: 'Create a simple stash',
                type: StashCommands.StashType.Simple,
            },
            {
                label: 'Staged',
                description: 'Stash only the changes that are currently staged',
                type: StashCommands.StashType.Staged,
            },
            {
                label: 'Keep index',
                description: 'Stash but keep all changes added to the index intact',
                type: StashCommands.StashType.KeepIndex,
            },
            {
                label: 'Include untracked',
                description: 'Stash also untracked files',
                type: StashCommands.StashType.IncludeUntracked,
            },
            {
                label: 'Include untracked + keep index',
                description: '',
                type: StashCommands.StashType.IncludeUntrackedKeepIndex,
            },
            {
                label: 'All',
                description: 'Stash also untracked and ignored files',
                type: StashCommands.StashType.All,
            },
            {
                label: 'All + keep index',
                description: '',
                type: StashCommands.StashType.AllKeepIndex,
            },
        ]

        const selection = await vscode.window.showQuickPick(options, {
            title: 'Create Stash',
            placeHolder: `${repositoryLabel} › ...`,
        })

        if (selection) {
            const stashMessage = await vscode.window.showInputBox({
                title: 'Create Stash',
                placeHolder: `${repositoryLabel} › ${selection.label} › ...`,
                prompt: 'Optionally provide a stash message',
            })

            if (typeof stashMessage === 'string') {
                this.stashCommands.stash(repositoryNode, selection.type, stashMessage)
            }
        }
    }

    /**
     * Clears all the stashes on the active repository or selects a repository and continues.
     *
     * @param repositoryNode the involved node
     */
    public clear = async (repositoryNode?: RepositoryNode): Promise<void> => {
        repositoryNode ??= await this.pickRepository('Create Stash')
        if (!repositoryNode) { return }

        const repositoryLabel = this.stashLabels.getName(repositoryNode)
        const selection = await vscode.window.showWarningMessage<vscode.MessageItem>(
            `Are you sure you want to drop ALL stashes on ${repositoryLabel}? They will be subject to pruning, and MAY BE IMPOSSIBLE TO RECOVER.`,
            { modal: true },
            { title: 'Yes' },
        )

        if (typeof selection !== 'undefined') {
            this.stashCommands.clear(repositoryNode)
        }
    }

    /**
     * Pops the selected stash or selects one and continue.
     *
     * @param stashNode the involved node
     */
    public pop = async (stashNode?: StashNode): Promise<void> => {
        stashNode ??= await this.pickStash(undefined, 'Pop Stash')
        if (!stashNode) { return }

        const stashLabel = this.stashLabels.getName(stashNode)
        const repositoryLabel = this.stashLabels.getName(stashNode.parent)
        const options = [
            {
                label: 'Pop only',
                description: 'Perform a simple pop',
                withIndex: false,
            },
            {
                label: 'Pop and reindex',
                description: 'Pop and reinstate the files added to index',
                withIndex: true,
            },
        ]

        const selection = await vscode.window.showQuickPick(options, {
            title: 'Pop Stash',
            placeHolder: `${repositoryLabel} › ${stashLabel} › ...`,
        })

        if (selection) {
            this.stashCommands.pop(stashNode, selection.withIndex)
        }
    }

    /**
     * Applies the selected stash or selects one and continue.
     *
     * @param stashNode the involved node
     */
    public apply = async (stashNode?: StashNode): Promise<void> => {
        stashNode ??= await this.pickStash(undefined, 'Apply Stash')
        if (!stashNode) { return }

        const stashLabel = this.stashLabels.getName(stashNode)
        const repositoryLabel = this.stashLabels.getName(stashNode.parent)
        const options = [
            {
                label: 'Apply only',
                description: 'Perform a simple apply',
                withIndex: false,
            },
            {
                label: 'Apply and reindex',
                description: 'Apply and reinstate the files added to index',
                withIndex: true,
            },
        ]

        const selection = await vscode.window.showQuickPick(options, {
            title: 'Apply Stash',
            placeHolder: `${repositoryLabel} › ${stashLabel} › ...`,
        })

        if (selection) {
            this.stashCommands.apply(stashNode, selection.withIndex)
        }
    }

    /**
     * Branches the selected stash or selects one and continue.
     *
     * @param stashNode the involved node
     */
    public branch = async (stashNode?: StashNode): Promise<void> => {
        stashNode ??= await this.pickStash(undefined, 'Branch Stash')
        if (!stashNode) { return }

        const stashLabel = this.stashLabels.getName(stashNode)
        const repositoryLabel = this.stashLabels.getName(stashNode.parent)

        const branchName = await vscode.window.showInputBox({
            title: 'Branch Stash',
            placeHolder: `${repositoryLabel} › ${stashLabel} › ...`,
            prompt: 'Set the branch name',
        })

        if (branchName?.trim().length) {
            this.stashCommands.branch(stashNode, branchName)
        }
    }

    /**
     * Drops the currently selected stash or selects one and continue.
     *
     * @param stashNode the involved node
     */
    public drop = async (stashNode?: StashNode): Promise<void> => {
        stashNode ??= await this.pickStash(undefined, 'Drop Stash')
        if (!stashNode) { return }

        const repositoryLabel = this.stashLabels.getName(stashNode.parent)
        const stashLabel = this.stashLabels.getName(stashNode)
        const msg = `Are you sure you want to drop the stash: ${stashLabel}?`

        const selection = await vscode.window.showWarningMessage<vscode.MessageItem>(
            `${repositoryLabel}\n\n${msg}`,
            { modal: true },
            { title: 'Yes' },
        )

        if (selection) {
            this.stashCommands.drop(stashNode)
        }
    }

    /**
     * Drops multiple Stashes.
     *
     * @param stashNode the involved node
     */
    public multiDrop = async (): Promise<void> => {
        const stashNodes = await this.pickStashes(undefined, 'Drop Multiple Stashes')
        if (!stashNodes?.length) {
            vscode.window.showInformationMessage('Nothing to drop.')
            return
        }

        const textList = stashNodes
            .map((node) => this.stashLabels.getName(node))
            .join('\n')

        const msg = `Are you sure you want to drop the stashes?\n${textList}`
        const selection = await vscode.window.showWarningMessage<vscode.MessageItem>(
            msg,
            { modal: true },
            { title: 'Yes' },
        )

        if (selection) {
            stashNodes
                // Higher index first.
                .sort((a, b) => a.index > b.index ? -1 : (a.index < b.index ? 1 : 0))
                .forEach((node) => {
                    console.log(`Multi-dropping ${node.atIndex}`)
                    this.stashCommands.drop(node)
                })
        }
    }

    /**
     * Applies the changes on the stashed file.
     *
     * @param fileNode the involved node
     */
    public applySingle = (fileNode: FileNode): void => {
        const parentLabel = this.stashLabels.getName(fileNode.parent)

        void vscode.window.showWarningMessage<vscode.MessageItem>(
            `${parentLabel}\n\nApply changes on ${fileNode.relativePath}?`,
            { modal: true },
            { title: 'Yes' },
        )
            .then((option) => {
                if (typeof option !== 'undefined') {
                    this.stashCommands.applySingle(fileNode)
                }
            })
    }

    /**
     * Applies the changes on the stashed file.
     *
     * @param fileNode the involved node
     */
    public createSingle = (fileNode: FileNode): void => {
        const parentLabel = this.stashLabels.getName(fileNode.parent)
        const exists = fs.existsSync(fileNode.path)

        void vscode.window.showWarningMessage<vscode.MessageItem>(
            `${parentLabel}\n\nCreate file ${fileNode.relativePath}?${exists ? '\n\nThis will overwrite the current file' : ''}`,
            { modal: true },
            { title: 'Yes' },
        )
            .then((option) => {
                if (typeof option !== 'undefined') {
                    this.stashCommands.createSingle(fileNode)
                }
            })
    }

    // -----------------------------------------------------------------------------------

    public quickSwitch = async (repositoryNode?: RepositoryNode) => {
        repositoryNode ??= await this.pickRepository('Quick switch')
        if (!repositoryNode) { return }
        const branch = await this.pickBranch(repositoryNode, 'Quick switch', true)
        if (!branch) { return }

        this.stashCommands.stash(
            repositoryNode,
            StashCommands.StashType.IncludeUntracked,
            `🤖 State before switching to '${branch}'`,
        )

        try {
            this.previousBranch = await this.branchGit.currentBranch(repositoryNode.path)
        }
        catch { /* empty */ }

        this.stashCommands.checkout(repositoryNode, branch)
    }

    public quickBack = async (repositoryNode?: RepositoryNode) => {
        repositoryNode ??= await this.pickRepository('Quick back')
        if (!repositoryNode) { return }
        const branch = this.previousBranch
            ?? await this.pickBranch(repositoryNode, 'Quick back', true)
        if (!branch) { return }

        this.stashCommands.checkout(repositoryNode, branch)
        this.previousBranch = undefined

        this.stashCommands.pop(repositoryNode, true)
    }

    // -----------------------------------------------------------------------------------

    /**
     * Copy the stash node text from a template to clipboard.
     *
     * @param node the involved node
     */
    public clipboardFromTemplate = (node: Node): void => {
        void vscode.env.clipboard.writeText(this.stashLabels.clipboardTemplate(node))
    }

    /**
     * Copy the stash node text to clipboard.
     *
     * @param node the involved node
     */
    public toClipboardFromObject = (node: Node): void => {
        void vscode.env.clipboard.writeText(this.stashLabels.clipboardNode(node))
    }

    /**
     * Copy the stash hash to clipboard.
     *
     * @param node the involved node
     */
    public clipboardStashHash = (node: StashNode): void => {
        void vscode.env.clipboard.writeText(node.hash)
    }

    /**
     * Copy the stash abbreviated hash to clipboard.
     *
     * @param node the involved node
     */
    public clipboardStashHashShort = (node: StashNode): void => {
        void vscode.env.clipboard.writeText(node.shortHash)
    }

    // -----------------------------------------------------------------------------------

    /**
     * Picks a Repository using the following order:
     * 1. If there's only one, return it.
     * 2. If there's a file open, return the repository that owns it.
     * 3. Show a picker so user selects one.
     */
    private pickRepository = async (
        pickerPlaceholder: string,
    ): Promise<RepositoryNode | undefined> => {
        const nodes = await this.nodeContainer.getRepositories(false)

        if (nodes.length === 0) {
            return void vscode.window.showInformationMessage('There are no git repositories.')
        }

        if (nodes.length === 1) {
            return nodes[0]
        }

        const activeFilePath = vscode.window.activeTextEditor?.document.uri.fsPath

        const repositoryNode = activeFilePath
            ? nodes.sort().reverse().find((node) => activeFilePath.includes(node.path))
            : undefined

        if (repositoryNode) {
            return repositoryNode
        }

        const items = nodes.map((repositoryNode) => ({
            label: this.stashLabels.getName(repositoryNode),
            node: repositoryNode,
        } as QuickPickRepositoryNodeItem))

        const selection = await vscode.window.showQuickPick<QuickPickRepositoryNodeItem>(
            items,
            {
                title: pickerPlaceholder,
                placeHolder: '› Select Repository',
                canPickMany: false,
            },
        )

        return selection ? selection.node : undefined
    }

    /**
     * Picks a Stash.
     */
    private pickStash = async (
        repositoryNode: RepositoryNode | undefined,
        pickerTitle: string,
    ): Promise<StashNode | undefined> => {
        const repos = await this.pickStashes(repositoryNode, pickerTitle, false)
        return repos ? repos[0] : undefined
    }

    /**
     * Picks multiple Stashes.
     */
    private pickStashes = async (
        repositoryNode: RepositoryNode | undefined,
        pickerTitle: string,
        canPickMany = true,
    ): Promise<StashNode[] | undefined> => {
        repositoryNode ??= await this.pickRepository(pickerTitle)
        if (!repositoryNode) { return }

        const repositoryLabel = this.stashLabels.getName(repositoryNode)
        const list = await this.nodeContainer.getStashes(repositoryNode)

        if (!list.length) {
            return void vscode.window.showInformationMessage(`There are no stashes in the repository ${repositoryLabel}.`)
        }

        const options = {
            title: pickerTitle,
            placeHolder: `${repositoryLabel} › ...`,
            canPickMany,
        }

        const items: QuickPickStashNodeItem[] = list
            .map((stashNode) => ({
                node: stashNode,
                label: this.stashLabels.getName(stashNode),
                description: this.stashLabels.getDescription(stashNode),
            }))

        const selection: QuickPickStashNodeItem | QuickPickStashNodeItem[] | undefined = await vscode.window.showQuickPick(items, options)
        if (!selection) { return }

        return Array.isArray(selection)
            ? selection.map((item: QuickPickStashNodeItem) => item.node)
            : [selection.node]
    }

    /**
     * Picks a branch.
     */
    private pickBranch = async (
        repositoryNode: RepositoryNode | undefined,
        pickerTitle: string,
        filterCurrent: boolean,
    ): Promise<string | undefined> => {
        repositoryNode ??= await this.pickRepository(pickerTitle)
        if (!repositoryNode) { return }

        const repositoryLabel = this.stashLabels.getName(repositoryNode)
        let list = await this.branchGit.getBranches(repositoryNode.path)

        if (filterCurrent) {
            const current = await this.branchGit.currentBranch(repositoryNode.path)
            list = list.filter((branch) => branch !== current)
        }

        if (!list.length) {
            return void vscode.window.showInformationMessage(`No branches found in the repository ${repositoryLabel}.`)
        }

        const options: vscode.QuickPickOptions = {
            title: pickerTitle,
            placeHolder: `${repositoryLabel} › Select Branch...`,
            canPickMany: false,
        }

        const items: (vscode.QuickPickItem & { branch: string })[] = list.map((branch) => ({
            branch,
            label: branch,
        }))

        const selection: vscode.QuickPickItem & { branch: string } | undefined
            = await vscode.window.showQuickPick(items, options)
        if (!selection) { return }

        return selection.branch
    }
}
