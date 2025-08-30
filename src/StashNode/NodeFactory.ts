/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { RenameStash, Stash } from '../Git/StashGit'
import { Uri, workspace } from 'vscode'
import FileNode from './FileNode'
import FileNodeType from './FileNodeType'
import MessageNode from './MessageNode'
import RepositoryNode from './RepositoryNode'
import StashNode from './StashNode'
import { basename } from 'path'

export default class NodeFactory {
    /**
     * Generates a repository node.
     *
     * @param path the repository path
     */
    public createRepositoryNode(path: string): RepositoryNode {
        // May be undefined if the directory is not part of the workspace,
        // this happens on upper directories by negative search depth setting.
        const wsFolder = workspace.getWorkspaceFolder(Uri.file(path))

        return new RepositoryNode(wsFolder?.name ?? basename(path), path)
    }

    /**
     * Generates a stash node.
     *
     * @param stash the stash to use as base
     */
    public createStashNode(stash: Stash, parentNode: RepositoryNode): StashNode {
        const parts = /(^WIP\son|^On)\s([^:\s]+):\s(.*)/i.exec(stash.subject) ?? []

        const message = parts.at(-1) ?? stash.subject
        const branch = parts.at(-2)

        return new StashNode(
            stash.subject,
            stash.index,
            parentNode,
            stash.date,
            stash.hash,
            stash.shortHash,
            stash.parents,
            message,
            branch,
            stash.note,
        )
    }

    /**
     * Generates an index-added file node.
     *
     * @param path       the file path
     * @param file       the file name
     * @param parentNode the parent node
     */
    public createAddedFileNode(
        path: string,
        file: string,
        parentNode: StashNode,
    ): FileNode {
        return new FileNode(
            file,
            FileNodeType.Added,
            path,
            basename(file),
            parentNode,
        )
    }

    /**
     * Generates a deleted file node.
     *
     * @param path       the file path
     * @param file       the file name
     * @param parentNode the parent node
     */
    public createDeletedFileNode(
        path: string,
        file: string,
        parentNode: StashNode,
    ): FileNode {
        return new FileNode(
            file,
            FileNodeType.Deleted,
            path,
            basename(file),
            parentNode,
        )
    }

    /**
     * Generates a modified file node.
     *
     * @param path       the file path
     * @param file       the file name
     * @param parentNode the parent node
     */
    public createModifiedFileNode(
        path: string,
        file: string,
        parentNode: StashNode,
    ): FileNode {
        return new FileNode(
            file,
            FileNodeType.Modified,
            path,
            basename(file),
            parentNode,
        )
    }

    /**
     * Generates an untracked file node.
     *
     * @param path       the file path
     * @param file       the file name
     * @param parentNode the parent node
     */
    public createUntrackedFileNode(
        path: string,
        file: string,
        parentNode: StashNode,
    ): FileNode {
        return new FileNode(
            file,
            FileNodeType.Untracked,
            path,
            basename(file),
            parentNode,
        )
    }

    /**
     * Generates a renamed file node.
     *
     * @param path       the file path
     * @param file       the new and old name on renamed file
     * @param parentNode the parent node
     */
    public createRenamedFileNode(
        path: string,
        file: RenameStash,
        parentNode: StashNode,
    ): FileNode {
        return new FileNode(
            file.new,
            FileNodeType.Renamed,
            path,
            basename(file.new),
            parentNode,
            file.old,
        )
    }

    /**
     * Generates a message node.
     *
     * @param message    the message to display
     * @param parentNode the parent node
     */
    public createMessageNode(message: string, parentNode?: StashNode): MessageNode {
        return new MessageNode(
            message,
            parentNode,
        )
    }
}
