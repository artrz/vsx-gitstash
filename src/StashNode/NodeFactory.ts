/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import { RenameStash, Stash } from '../Git/GitStash'
import { Uri, workspace } from 'vscode'
import FileNode from './FileNode'
import FileNodeType from './FileNodeType'
import RepositoryNode from './RepositoryNode'
import StashNode from './StashNode'
import { basename, dirname, relative, sep } from 'path'

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

        // Use the workspace folder name only for the folder root itself. Nested
        // repositories (submodules, or repos found via search depth) share the
        // same workspace folder, so labelling them with its name would make them
        // indistinguishable; fall back to their path relative to the folder.
        let label: string | undefined
        if (wsFolder) {
            label = wsFolder.uri.fsPath === Uri.file(path).fsPath
                ? wsFolder.name
                : relative(wsFolder.uri.fsPath, path).split(sep).join('/')
        }

        return new RepositoryNode(
            dirname(path),
            basename(path),
            label,
        )
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
            stash.index,
            parentNode,
            stash.subject,
            stash.date,
            stash.hash,
            stash.shortHash,
            stash.tree,
            stash.parents,
            message,
            branch,
            stash.note,
        )
    }

    /**
     * Generates an index-added file node.
     *
     * @param parentNode  the parent node
     * @param fileSubpath the file path relative to the repository
     */
    public createAddedFileNode(parentNode: StashNode, fileSubpath: string): FileNode {
        return this.createFileNode(parentNode, fileSubpath, FileNodeType.Added)
    }

    /**
     * Generates a deleted file node.
     *
     * @param parentNode  the parent node
     * @param fileSubpath the file path relative to the repository
     */
    public createDeletedFileNode(parentNode: StashNode, fileSubpath: string): FileNode {
        return this.createFileNode(parentNode, fileSubpath, FileNodeType.Deleted)
    }

    /**
     * Generates a modified file node.
     *
     * @param parentNode  the parent node
     * @param fileSubpath the file path relative to the repository
     */
    public createModifiedFileNode(parentNode: StashNode, fileSubpath: string): FileNode {
        return this.createFileNode(parentNode, fileSubpath, FileNodeType.Modified)
    }

    /**
     * Generates an untracked file node.
     *
     * @param parentNode  the parent node
     * @param fileSubpath the file path relative to the repository
     */
    public createUntrackedFileNode(parentNode: StashNode, fileSubpath: string): FileNode {
        return this.createFileNode(parentNode, fileSubpath, FileNodeType.Untracked)
    }

    /**
     * Generates a renamed file node.
     *
     * @param parentNode  the parent node
     * @param fileSubpath the new and old name on renamed file
     */
    public createRenamedFileNode(parentNode: StashNode, fileSubpath: RenameStash): FileNode {
        return new FileNode(
            FileNodeType.Renamed,
            parentNode,
            dirname(fileSubpath.new),
            basename(fileSubpath.new),
            dirname(fileSubpath.old),
            basename(fileSubpath.old),
        )
    }

    /**
     * Generates a file node.
     *
     * @param type        the fileNode type
     * @param parentNode  the parent node
     * @param fileSubpath the file path relative to the repository
     */
    private createFileNode(parentNode: StashNode, fileSubpath: string, type: FileNodeType): FileNode {
        return new FileNode(
            type,
            parentNode,
            dirname(fileSubpath),
            basename(fileSubpath),
        )
    }
}
