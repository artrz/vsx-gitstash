/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import * as path from 'path'
import BaseFileNode from '../../StashNode/FileNode'
import BaseNodeFactory from '../../StashNode/NodeFactory'
import DirectoryNode from './DirectoryNode'
import FileNode from './FileNode'
import MessageNode from './MessageNode'
import Node from '../../StashNode/Node'
import StashNode from '../../StashNode/StashNode'

export default class NodeFactory extends BaseNodeFactory {
    /**
    * Generates a directory tree structure and returns all the root branches.
    * BaseFileNodes are replaced with FileNodes.
    */
    public createDirectoryNodes(parent: StashNode, files: BaseFileNode[]): (DirectoryNode | FileNode)[] {
        // This base node is broken in the sense of how paths are expected to work
        // nevertheless it works in the algorithm as base node to store resources (dir
        // or file node) inside the root directory.
        const baseDirNode: DirectoryNode = this.newDirectory(parent, parent, '', '')
        let branchParent: StashNode | DirectoryNode = parent

        files.forEach((baseFileNode) => {
            let dirNode = baseDirNode

            const segments = baseFileNode.subPath !== '.'
                ? baseFileNode.subPath.split(path.sep)
                : []

            if (segments.length < 1) {
                // If there aren't subpath segments, push this file to the parent's child
                // files container and go to the next file iteration.
                const fileNode = this.createFileNodeFromBase(branchParent, baseFileNode)
                dirNode.files.push(fileNode)
                return
            }

            for (let i = 0; i < segments.length; i += 1) {
                const dirName = segments[i]

                // Search for a DirectoryNode matching the current directory.
                let subDirNode = dirNode.directories
                    .find((subDir) => subDir.dirName === dirName)

                if (!subDirNode) {
                    // Incremental relative subPath, using '.' to represent the root dir
                    // When i = 0, or appending a subdirectory segments on iterations.
                    // e.g. ...repo/sub/path/file.ext, i=0: '.', i=1: sub, i=2: sub/path
                    const subPath = segments.slice(0, i).join(path.sep) || '.'

                    // If the subdirectory node doesn't exist, create it and add it to the
                    // parent's sub-directories container.
                    subDirNode = this.newDirectory(branchParent, parent, subPath, dirName)

                    dirNode.directories.push(subDirNode)
                }

                // Finally, set the dirNode as the current subdirectory so in next
                // iteration this will be used as the parent.
                dirNode = branchParent = subDirNode
            }

            const fileNode = this.createFileNodeFromBase(branchParent, baseFileNode)
            dirNode.files.push(fileNode)
        })

        return baseDirNode.children
    }

    /**
     * Generates an directory node.
     */
    private newDirectory(
        branchParent: StashNode | DirectoryNode,
        parent: StashNode,
        subPath: string,
        dirName: string,
    ): DirectoryNode {
        return new DirectoryNode(
            branchParent,
            parent,
            branchParent instanceof DirectoryNode
                ? branchParent.basePath
                : branchParent.path,
            subPath,
            dirName,
            [],
            [],
        )
    }

    /**
     * Generates a file node.
     *
     * @param type        the fileNode type
     * @param parentNode  the parent node
     * @param fileSubpath the file path relative to the repository
     */
    public createFileNodeFromBase(
        branchParent: StashNode | DirectoryNode,
        baseFileNode: BaseFileNode,
    ): FileNode {
        return new FileNode(
            branchParent,
            baseFileNode.type,
            baseFileNode.parent,
            baseFileNode.subPath,
            baseFileNode.fileName,
            baseFileNode.oldSubPath,
            baseFileNode.oldFileName,
        )
    }

    /**
     * Creates a message node.
     */
    public createMessageNode(message: string, parent?: Node): MessageNode {
        return new MessageNode(
            message,
            parent,
        )
    }
}
