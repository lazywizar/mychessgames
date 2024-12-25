// Import the Node and MoveTree classes from game.js
const { Node, MoveTree, displayMoves, setMoveTree, setCurrentNode } = require('../game');

// Mock DOM environment
document.body.innerHTML = `
    <div id="moves"></div>
`;

describe('Move Display', () => {
    beforeEach(() => {
        // Reset the moves div
        document.body.innerHTML = '<div id="moves"></div>';
    });

    test('renders moves and variations correctly', () => {
        // Create a sample move tree
        const tree = new MoveTree();
        setMoveTree(tree);

        // Add main line moves
        let node = tree.root;
        ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'Bb4', 'Bg2', 'Nc6', 'Nd5'].forEach(move => {
            const newNode = new Node(move, node.ply + 1);
            node.children.push(newNode);
            node = newNode;
        });

        // Add variations after black's first move (e5)
        let firstMove = tree.root.children[0]; // c4
        let blackResponse = firstMove.children[0]; // e5

        // First variation: 1...e6 2.Nc3
        let variation1 = new Node('e6', 2);
        variation1.isBlackMove = true;  // Explicitly set isBlackMove
        let variation1Move2 = new Node('Nc3', 3);
        variation1.children.push(variation1Move2);
        blackResponse.children.push(variation1);

        // Second variation: 1...c5 2.g3
        let variation2 = new Node('c5', 2);
        variation2.isBlackMove = true;  // Explicitly set isBlackMove
        let variation2Move2 = new Node('g3', 3);
        variation2.children.push(variation2Move2);
        blackResponse.children.push(variation2);

        // Set current node to null for initial display
        setCurrentNode(null);

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

        // Expected format: variations should appear after black's move
        const expectedFormat = '1. c4 e5 (1...e6 2. Nc3) (1...c5 2. g3) 2. Nc3 Nf6 3. g3 Bb4 4. Bg2 Nc6 5. Nd5';

        expect(cleanedHtml).toBe(expectedFormat);
    });
});