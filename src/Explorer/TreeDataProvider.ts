/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import {
    EventEmitter,
    ProviderResult,
    TreeDataProvider,
    TreeItem,
    TreeView,
    Uri,
    commands,
    window,
} from 'vscode'
import Config from '../Config'
import DirectoryNode from './TreeNode/DirectoryNode'
import FileNode from './TreeNode/FileNode'
import Node from '../StashNode/Node'
import NodeContainer from '../Explorer/TreeNode/NodeContainer'
import RepositoryNode from '../StashNode/RepositoryNode'
import StashLabels from '../StashLabels'
import StashNode from '../StashNode/StashNode'
import TreeItemFactory from './TreeItemFactory'
import UriGenerator from '../UriGenerator'

export default class implements TreeDataProvider<Node> {
    private readonly onDidChangeTreeDataEmitter = new EventEmitter<void>()
    readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event

    public view: TreeView<Node>
    private config: Config
    private nodeContainer: NodeContainer
    private treeItemFactory: TreeItemFactory
    private rawStashes: Record<string, undefined | string> = {}
    private loadTimeout: NodeJS.Timeout | undefined
    private showExplorer: boolean | undefined

    constructor(
        config: Config,
        nodeContainer: NodeContainer,
        uriGenerator: UriGenerator,
        stashLabels: StashLabels,
    ) {
        this.config = config
        this.nodeContainer = nodeContainer
        this.treeItemFactory = new TreeItemFactory(config, uriGenerator, stashLabels)
        this.view = this.createTreeView()
    }

    /**
     * Creates a tree view.
     */
    public createTreeView(): TreeView<Node> {
        const treeView = window.createTreeView('gitstash.explorer', {
            treeDataProvider: this,
            showCollapseAll: true,
            canSelectMany: false,
        })

        return treeView
    }

    /**
     * Toggles the explorer tree.
     */
    public toggle = (): void => {
        this.showExplorer = this.showExplorer === undefined
            ? this.config.get('explorer.enabled')
            : !this.showExplorer

        void commands.executeCommand(
            'setContext',
            'gitstash.explorer.enabled',
            this.showExplorer,
        )
    }

    /**
     * Reloads the explorer tree.
     */
    public setSorting = (config: string): void => {
        this.config.set(this.config.key.expDisplayFileSorting, config)
    }

    /**
     * Reloads the explorer tree.
     */
    public refresh = (): void => {
        this.reload('force')
    }

    /**
     * Gets the tree children, which may be repositories, stashes or files.
     *
     * @param node the parent node for the requested children
     * @see TreeDataProvider.getChildren
     */
    public getChildren(node?: Node): Thenable<Node[]> | Node[] {
        if (!node) {
            const eagerLoad: boolean = this.config.get('explorer.eagerLoadStashes')
            return this.nodeContainer.getRepositories(eagerLoad)
                .then((repositories) => this.prepareChildren(undefined, repositories))
        }

        if (node instanceof RepositoryNode) {
            return node.children
                ? Promise.resolve(this.prepareChildren(node, node.children))
                : this.nodeContainer.getStashes(node)
                    .then((stashes) => this.prepareChildren(node, stashes))
        }

        if (node instanceof StashNode) {
            return node.children
                ? Promise.resolve(this.prepareChildren(node, node.children))
                : this.nodeContainer.getFiles(node)
                    .then((files) => {
                        const sort = this.config.get<string>(this.config.key.expDisplayFileSorting)
                        let children: (DirectoryNode | FileNode)[] = []

                        if (sort === 'name') {
                            children = this.nodeContainer.makeChildFileNodes(
                                node,
                                files.sort((fileA, fileB) => {
                                    return fileA.fileName.localeCompare(fileB.fileName)
                                }),
                            )
                        }
                        else if (sort === 'path') {
                            children = this.nodeContainer.makeChildFileNodes(
                                node,
                                files.sort((fileA, fileB) => {
                                    return fileA.relativePath.localeCompare(fileB.relativePath)
                                }),
                            )
                        }
                        else if (sort === 'tree') {
                            files = files.sort((fileA, fileB) => {
                                return fileA.relativePath.localeCompare(fileB.relativePath)
                            })
                            children = this.nodeContainer.makeDirectoryNodes(node, files)
                        }

                        return this.prepareChildren(node, children)
                    })
        }

        if (node instanceof DirectoryNode) {
            return node.children
        }

        console.error('TreeDataProvider.getChildren(): Unknown node type. See the console for details.')
        console.error(node)
        throw new Error('TreeDataProvider.getChildren(): Unknown node type. See the console for details.')
    }

    /**
     * Prepares the children to be displayed, adding default items according user settings.
     *
     * @param parent   the children's parent node
     * @param children the parent's children
     */
    private prepareChildren(parent: Node | undefined, children: Node[]): Node[] {
        const emptyRepoMode = this.config.get(this.config.key.expDisplayEmptyRepos)

        if (!parent) {
            if (emptyRepoMode === 'hide-empty' && this.config.get('explorer.eagerLoadStashes')) {
                children = children.filter(
                    (repositoryNode) => (repositoryNode as RepositoryNode).childrenCount,
                )
            }
        }

        if (children.length) {
            return children
        }

        if (emptyRepoMode === 'indicate-empty') {
            if (!parent) {
                return [this.nodeContainer.makeMessageNode('No repositories found.')]
            }
            if (parent instanceof RepositoryNode) {
                return [this.nodeContainer.makeMessageNode('No stashes found.', parent)]
            }
        }

        return []
    }

    /**
     * Generates a tree item for the specified node.
     *
     * @param node the node to be used as base
     */
    public getTreeItem(node: Node): TreeItem {
        return this.treeItemFactory.getTreeItem(node)
    }

    /**
    * Returns the parent of `element`, `null` or `undefined` if `element` is a child of root.
    * This method must be implemented in order to access {@link TreeView.reveal reveal} API.
     * @see TreeDataProvider.getParent()
     */
    public getParent(element: Node & { branchParent?: Node, parent?: Node }): ProviderResult<Node> {
        return element.branchParent ?? element.parent
    }

    /**
     * Reveals the given element in the tree view.
     * @see TreeView.reveal()
     */
    public focus(element: Node): void {
        this.view.reveal(element, { select: true, focus: true })
    }

    /**
     * Reloads the git stash tree view.
     *
     * @param type        the event type: settings, force, create, update, delete
     * @param projectPath the URI of the project with content changes
     */
    public reload(type: string, projectPath?: Uri): void {
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout)
        }

        this.loadTimeout = setTimeout((type: string, pathUri?: Uri) => {
            this.loadTimeout = undefined
            if (['settings', 'force'].includes(type)) {
                this.onDidChangeTreeDataEmitter.fire()
                return
            }

            if (pathUri) {
                const path = pathUri.fsPath

                return void this.nodeContainer.getStateHash(path).then((md5: string | undefined) => {
                    const cachedRawStash = this.rawStashes[path]

                    if (!cachedRawStash || cachedRawStash !== md5) {
                        this.rawStashes[path] = md5
                        this.onDidChangeTreeDataEmitter.fire()
                    }
                })
            }

            console.error(`TreeDataProvider.reload() with type '${type}' requires a defined pathUri argument`)
            throw new Error('TreeDataProvider.reload()')
        }, type === 'force' ? 250 : 750, type, projectPath)
    }
}
