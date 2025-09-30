/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import GitStash, { FileStage, RenameStash, Stash } from '../Git/GitStash'
import { createHash } from 'node:crypto'
import FileNode from './FileNode'
import GitWorkspace from '../Git/GitWorkspace'
import NodeFactory from './NodeFactory'
import RepositoryNode from './RepositoryNode'
import StashNode from './StashNode'

/**
 * A repository implementation using another name to avoid confusion with git repos.
 */
export default class NodeContainer {
    constructor(
        protected gitWorkspace: GitWorkspace,
        protected gitStash: GitStash,
        protected nodeFactory = new NodeFactory(),
    ) { }

    /**
     * Gets a hash string representing the current available stashes.
     */
    public async getStateHash(cwd: string): Promise<string | undefined> {
        const rawStash = await this.gitStash.getRawStashes(cwd)
        return rawStash
            ? createHash('md5').update(rawStash).digest('hex')
            : undefined
    }

    /**
     * Gets the repositories list.
     *
     * @param eagerLoadStashes indicates if children should be preloaded
     */
    public async getRepositories(eagerLoadStashes: boolean): Promise<RepositoryNode[]> {
        const paths = await this.gitWorkspace.getRepositories(false)

        const repositoryNodes: RepositoryNode[] = []
        for (const repositoryPath of paths) {
            const repositoryNode = this.nodeFactory.createRepositoryNode(repositoryPath)
            repositoryNodes.push(repositoryNode)

            if (eagerLoadStashes) {
                repositoryNode.setChildren(await this.getStashes(repositoryNode))
            }
        }

        return repositoryNodes
    }

    /**
     * Gets the stashes list.
     */
    public async getStashes(repositoryNode: RepositoryNode): Promise<StashNode[]> {
        const stashes = (await this.gitStash.getStashes(repositoryNode.path))
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
        const stashedFiles = await this.gitStash.getStashedFiles(
            stashNode.path,
            stashNode.index,
            stashNode.parentHashes.length > 2,
        )

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

        stashNode.setChildren(fileNodes)

        return fileNodes
    }

    /**
     * Gets the file contents of the untracked file.
     *
     * @param fileNode the stashed file node
     * @param stage    the file stash stage
     */
    public getFileContents(fileNode: FileNode, stage?: FileStage): Promise<string> {
        if (fileNode.isAdded) {
            return this.gitStash.getStashContents(
                fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
            ).then((r) => r.out)
        }
        if (fileNode.isDeleted) {
            return this.gitStash.getParentContents(
                fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
            ).then((r) => r.out)
        }
        if (fileNode.isModified) {
            return stage === FileStage.Parent
                ? this.gitStash.getParentContents(
                    fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
                ).then((r) => r.out)
                : this.gitStash.getStashContents(
                    fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
                ).then((r) => r.out)
        }
        if (fileNode.isRenamed) {
            return stage === FileStage.Parent
                ? this.gitStash.getParentContents(
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    fileNode.parent.path, fileNode.parent.index, fileNode.oldRelativePath!,
                ).then((r) => r.out)
                : this.gitStash.getStashContents(
                    fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
                ).then((r) => r.out)
        }
        if (fileNode.isUntracked) {
            return this.gitStash.getThirdParentContents(
                fileNode.parent.path, fileNode.parent.index, fileNode.relativePath,
            ).then((r) => r.out)
        }

        throw new Error(`Unsupported fileNode type: ${fileNode.type}`)
    }
}
