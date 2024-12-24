// Mock classes and dependencies
class Node {
    constructor(move = null, ply = 0) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.move = move;
        this.ply = ply;
        this.children = [];
        this.comments = [];
        this.nags = [];
        this.shapes = [];
        this.isWhite = ply % 2 === 1;
        this.moveNumber = Math.floor((ply + 1) / 2);
    }

    getMoveNotation() {
        if (!this.move) return '';
        return `${this.isWhite ? this.moveNumber + '.' : this.moveNumber + '...'}${this.move}`;
    }
}

class MoveTree {
    constructor() {
        this.root = new Node();
        this.currentNode = this.root;
    }
}

// Mock DOM environment
document.body.innerHTML = `
    <div id="moves"></div>
`;

// Mock global variables that game.js expects
global.moveTree = null;
global.currentNode = null;

// Import the displayMoves function
function displayMoves() {
    const movesDiv = document.getElementById('moves');
    if (!movesDiv || !moveTree) return;

    movesDiv.innerHTML = '';

    function renderNode(node, isVariation = false, parentNode = null, isFirstMove = false) {
        if (!node.move) return '';

        const ply = node.ply;
        const moveNumber = Math.floor((ply + 1) / 2);
        const isWhite = ply % 2 === 1;

        let html = '';

        // Start new line for main line moves
        if (!isVariation && isWhite) {
            html += '<div class="move-line">';
        }

        // Add move number for white moves or variations
        if (isWhite || isVariation) {
            html += `<span class="move-number">${moveNumber}${isWhite ? '.' : '...'}</span>`;
        }

        // Add the move
        html += `<span class="move ${node === currentNode ? 'current' : ''}"
                       data-node-id="${node.id}">${node.move}</span>`;

        html += ' ';

        if (node.children.length > 0) {
            const mainLineMove = node.children[0];

            if (!isVariation) {
                // For main line moves
                if (mainLineMove) {
                    // Show the next main line move
                    html += renderNode(mainLineMove, false, node, false);

                    // After showing a complete move pair (white + black), show variations
                    if (isWhite && node.children.length > 1) {
                        // Show variations for black's responses to white's move
                        html += '<div class="interrupt"><div class="lines">';
                        for (let i = 1; i < node.children.length; i++) {
                            html += '<div class="line">';
                            html += '<div class="branch"></div>';
                            html += renderNode(node.children[i], true, node, true);
                            html += '</div>';
                        }
                        html += '</div></div>';
                    }
                }
            } else {
                // For variations, just continue with the next move
                html += renderNode(mainLineMove, true, node, false);
            }
        }

        // Close variation
        if (isVariation && isFirstMove) {
            html = html.trim();
        }

        // Close main line move pair
        if (!isVariation && isWhite && !node.children.length) {
            html += '</div>';
        }

        return html;
    }

    // Start rendering from the first move
    if (moveTree.root.children.length > 0) {
        movesDiv.innerHTML = renderNode(moveTree.root.children[0]);
    }
}

describe('Move Display', () => {
    beforeEach(() => {
        // Reset the moves div
        document.body.innerHTML = '<div id="moves"></div>';
    });

    test('renders moves and variations correctly', () => {
        // Create a sample move tree
        moveTree = new MoveTree();

        // Add main line moves
        let node = moveTree.root;
        ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'Bb4', 'Bg2', 'Nc6', 'Nd5'].forEach(move => {
            const newNode = new Node(move, node.ply + 1);
            node.children.push(newNode);
            node = newNode;
        });

        // Add variations
        // At move 1 (after c4)
        let firstMove = moveTree.root.children[0];

        // First variation: 1...e6 2.Nc3
        let variation1 = new Node('e6', 2);
        let variation1Move2 = new Node('Nc3', 3);
        variation1.children.push(variation1Move2);
        firstMove.children.push(variation1);

        // Second variation: 1...c5 2.g3
        let variation2 = new Node('c5', 2);
        let variation2Move2 = new Node('g3', 3);
        variation2.children.push(variation2Move2);
        firstMove.children.push(variation2);

        // Render moves
        displayMoves();

        // Get the rendered HTML
        const movesHtml = document.getElementById('moves').innerHTML;

        // Clean up the actual HTML for comparison
        const cleanedHtml = movesHtml
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\(\s+/g, '(')
            .replace(/\s+\)/g, ')')
            .trim();

        // Expected format
        const expectedFormat = '1. c4 e5 (1... e6 2. Nc3) (1... c5 2. g3) 2. Nc3 Nf6 3. g3 Bb4 4. Bg2 Nc6 5. Nd5';

        expect(cleanedHtml).toBe(expectedFormat);
    });
});