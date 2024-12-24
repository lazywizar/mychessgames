class Node {
    constructor(move = null, ply = 0) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.move = move;  // The move in SAN notation
        this.ply = ply;    // Half-move number (0 for initial position)
        this.children = []; // Main line and variations
        this.comments = [];
        this.nags = [];    // Numeric Annotation Glyphs
        this.shapes = [];  // Arrow and circle drawings
    }

    addChild(move) {
        const child = new Node(move, this.ply + 1);
        this.children.push(child);
        return child;
    }

    addVariation(moves) {
        if (!moves.length) return null;
        const child = new Node(moves[0], this.ply + 1);
        this.children.push(child);

        let current = child;
        for (let i = 1; i < moves.length; i++) {
            current = current.addChild(moves[i]);
        }
        return child;
    }
}

class MoveTree {
    constructor() {
        this.root = new Node();
        this.currentNode = this.root;
    }

    addMove(move) {
        const newNode = this.currentNode.addChild(move);
        this.currentNode = newNode;
        return newNode;
    }

    addVariation(moves, startPly) {
        // Find the node where variation starts
        let node = this.findNodeByPly(startPly);
        if (!node) return null;

        return node.addVariation(moves);
    }

    findNodeByPly(ply) {
        const traverse = (node) => {
            if (node.ply === ply) return node;
            for (const child of node.children) {
                const found = traverse(child);
                if (found) return found;
            }
            return null;
        };
        return traverse(this.root);
    }

    // Get path from root to current node
    getMainLine() {
        const moves = [];
        let node = this.currentNode;
        while (node.move) {
            moves.unshift(node.move);
            node = this.findParent(node);
        }
        return moves;
    }

    findParent(targetNode) {
        const traverse = (node) => {
            for (const child of node.children) {
                if (child === targetNode) return node;
                const found = traverse(child);
                if (found) return found;
            }
            return null;
        };
        return traverse(this.root);
    }
}

module.exports = { Node, MoveTree };