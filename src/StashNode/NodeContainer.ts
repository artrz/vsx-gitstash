/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import StashGit, { FileStage, RenameStash, Stash, StashedFiles } from '../Git/StashGit'
import FileNode from './FileNode'
import MessageNode from './MessageNode'
import NodeFactory from './NodeFactory'
import RepositoryNode from './RepositoryNode'
import StashNode from './StashNode'
import WorkspaceGit from '../Git/WorkspaceGit'

/**
 * A repository implementation using another name to avoid confusion with git repos.
 */
export default class NodeContainer {
    private stashGit: StashGit
    private workspaceGit: WorkspaceGit
    private nodeFactory: NodeFactory

    constructor(workspaceGit: WorkspaceGit) {
        this.workspaceGit = workspaceGit
        this.stashGit = new StashGit()
        this.nodeFactory = new NodeFactory()
    }

    /**
     * Gets the raw git stashes list.
     */
    public async getRawStashesList(cwd: string): Promise<null | string> {
        return this.stashGit.getRawStash(cwd)
    }

    /**
     * Gets the repositories list.
     *
     * @param eagerLoadStashes indicates if children should be preloaded
     */
    public async getRepositories(eagerLoadStashes: boolean): Promise<RepositoryNode[]> {
        return this.workspaceGit.getRepositories().then(async (paths: string[]) => {
            const repositoryNodes: RepositoryNode[] = []

            for (const repositoryPath of paths) {
                const repositoryNode = this.nodeFactory.createRepositoryNode(repositoryPath)
                repositoryNodes.push(repositoryNode)

                if (eagerLoadStashes) {
                    repositoryNode.setChildren(await this.getStashes(repositoryNode))
                }
            }

            return repositoryNodes
        })
    }

    /**
     * Gets the stashes list.
     */
    public async getStashes(repositoryNode: RepositoryNode): Promise<StashNode[]> {
        const stashes = (await this.stashGit.getStashes(repositoryNode.path))
            .map((stash: Stash) => this.nodeFactory.createStashNode(stash, repositoryNode))

        repositoryNode.setChildren(stashes)

        return stashes
    }

    /**
     * Gets the stash files.
     *
     * @param stashNode the parent stash
     */
    public async getFiles(stashNode: StashNode): Promise<FileNode[]> {
        const files = await this.stashGit.getStashedFiles(
            stashNode.path,
            stashNode.index,
            stashNode.parentHashes.length > 2,
        ).then((stashedFiles: StashedFiles) => {
            const fileNodes: FileNode[] = []

            stashedFiles.added.forEach((fileSubpath: string) => {
                fileNodes.push(
                    this.nodeFactory.createAddedFileNode(stashNode, fileSubpath),
                )
            })

            stashedFiles.modified.forEach((fileSubpath: string) => {
                fileNodes.push(
                    this.nodeFactory.createModifiedFileNode(stashNode, fileSubpath),
                )
            })

            stashedFiles.renamed.forEach((fileSubpath: RenameStash) => {
                fileNodes.push(
                    this.nodeFactory.createRenamedFileNode(stashNode, fileSubpath),
                )
            })

            stashedFiles.untracked.forEach((fileSubpath: string) => {
                fileNodes.push(
                    this.nodeFactory.createUntrackedFileNode(stashNode, fileSubpath),
                )
            })

            stashedFiles.deleted.forEach((fileSubpath: string) => {
                fileNodes.push(
                    this.nodeFactory.createDeletedFileNode(stashNode, fileSubpath),
                )
            })

            return fileNodes
        })

        stashNode.setChildren(files)

        return files
    }

    /**
     * Gets the file contents of the untracked file.
     *
     * @param fileNode the stashed file node
     * @param stage    the file stash stage
     */
    public getFileContents(fileNode: FileNode, stage?: FileStage): Promise<string> {
        if (fileNode.isAdded) {
            return this.stashGit.getStashContents(
                fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
            )
        }
        if (fileNode.isDeleted) {
            return this.stashGit.getParentContents(
                fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
            )
        }
        if (fileNode.isModified) {
            return stage === FileStage.Parent
                ? this.stashGit.getParentContents(
                    fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
                )
                : this.stashGit.getStashContents(
                    fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
                )
        }
        if (fileNode.isRenamed) {
            return stage === FileStage.Parent
                ? this.stashGit.getParentContents(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    fileNode.parent.path, fileNode.parent.index, fileNode.oldRelativePath!,
                )
                : this.stashGit.getStashContents(
                    fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
                )
        }
        if (fileNode.isUntracked) {
            return this.stashGit.getThirdParentContents(
                fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
            )
        }

        throw new Error(`Unsupported fileNode type: ${fileNode.type}`)
    }

    /**
     * Creates a message node.
     */
    public getMessageNode(message: string): MessageNode {
        return this.nodeFactory.createMessageNode(message)
    }
}
