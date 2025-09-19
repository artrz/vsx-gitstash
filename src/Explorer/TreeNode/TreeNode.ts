/*
 * Copyright (c) Arturo Rodríguez V.
 * GPL-3.0-only. See LICENSE.md in the project root for license details.
 */

import DirectoryNode from './DirectoryNode'
import StashNode from '../../StashNode/StashNode'

export default interface TreeNode {
    branchParent: StashNode | DirectoryNode
}
