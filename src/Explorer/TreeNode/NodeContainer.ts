/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import BaseFileNode from '../../StashNode/FileNode'
import BaseNodeContainer from '../../StashNode/NodeContainer'
import DirectoryNode from './DirectoryNode'
import FileNode from './FileNode'
import MessageNode from './MessageNode'
import Node from '../../StashNode/Node'
import NodeFactory from './NodeFactory'
import StashGit from '../../Git/StashGit'
import StashNode from '../../StashNode/StashNode'
import WorkspaceGit from '../../Git/WorkspaceGit'

/**
 * A repository implementation using another name to avoid confusion with git repos.
 */
export default class NodeContainer extends BaseNodeContainer {
    constructor(
        protected workspaceGit: WorkspaceGit,
        protected stashGit: StashGit,
        protected nodeFactory = new NodeFactory(),
    ) {
        super(workspaceGit, stashGit)
    }

    /**
    * Generates a directory tree structure and returns all the root branches.
    */
    public makeDirectoryNodes(
        parent: StashNode,
        files: BaseFileNode[],
    ): (DirectoryNode | FileNode)[] {
        return this.nodeFactory.createDirectoryNodes(parent, files)
    }

    public makeChildFileNodes(
        parent: StashNode,
        files: BaseFileNode[],
    ): FileNode[] {
        return files.map((baseFileNode) => this.nodeFactory
            .createFileNodeFromBase(parent, baseFileNode))
    }

    /**
     * Creates a message node.
     */
    public makeMessageNode(message: string, parent?: Node): MessageNode {
        return this.nodeFactory.createMessageNode(message, parent)
    }
}
