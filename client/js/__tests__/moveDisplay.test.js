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

    test('renders complex PGN with variations correctly', () => {
        // Create a sample move tree
        const tree = new MoveTree();
        setMoveTree(tree);

        // Add main line moves: 1.c4 e5 2.Nc3 Nf6 3.g3 Bb4 4.Bg2 Nc6 5.Nd5
        let node = tree.root;
        const mainLine = ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'Bb4', 'Bg2', 'Nc6', 'Nd5'];
        mainLine.forEach(move => {
            const newNode = new Node(move, node.ply + 1);
            node.children.push(newNode);
            node = newNode;
        });

        // Get reference to key positions
        const c4Node = tree.root.children[0];  // 1.c4
        const e5Node = c4Node.children[0];     // 1...e5
        const nc3Node = e5Node.children[0];    // 2.Nc3
        const nf6Node = nc3Node.children[0];   // 2...Nf6
        const g3Node = nf6Node.children[0];    // 3.g3
        const bb4Node = g3Node.children[0];    // 3...Bb4
        const bg2Node = bb4Node.children[0];   // 4.Bg2
        const nc6Node = bg2Node.children[0];   // 4...Nc6

        // Add variations after 1...e5
        // Variation 1: 1...e6 2.Nc3
        let variation1 = new Node('e6', 2);
        let variation1Move2 = new Node('Nc3', 3);
        variation1.children.push(variation1Move2);
        e5Node.children.push(variation1);

        // Variation 2: 1...c5 2.g3
        let variation2 = new Node('c5', 2);
        let variation2Move2 = new Node('g3', 3);
        variation2.children.push(variation2Move2);
        e5Node.children.push(variation2);

        // Add variations after 2...Nf6
        // Variation 3: 2...Bb4 3.g3
        let variation3 = new Node('Bb4', 4);
        let variation3Move2 = new Node('g3', 5);
        variation3.children.push(variation3Move2);
        nf6Node.children.push(variation3);

        // Variation 4: 2...Bc5 3.e3
        let variation4 = new Node('Bc5', 4);
        let variation4Move2 = new Node('e3', 5);
        variation4.children.push(variation4Move2);
        nf6Node.children.push(variation4);

        // Add variation after 3.g3
        // Variation 5: 3.d3
        let variation5 = new Node('d3', 5);
        g3Node.children.push(variation5);

        // Add variation after 4...Nc6
        // Variation 6: 4...O-O 5.e4
        let variation6 = new Node('O-O', 8);
        let variation6Move2 = new Node('e4', 9);
        variation6.children.push(variation6Move2);
        nc6Node.children.push(variation6);

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

        // Expected format: all variations should appear after their respective main line moves
        const expectedFormat = '1. c4 e5 (1... e6 2. Nc3) (1... c5 2. g3) 2. Nc3 Nf6 (2...Bb4 3. g3) (2...Bc5 3. e3) 3. g3 (3. d3) 3...Bb4 4. Bg2 Nc6 (4...O-O 5. e4) 5. Nd5';

        expect(cleanedHtml).toBe(expectedFormat);
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
        const expectedFormat = '1. c4 e5 (1... e6 2. Nc3) (1... c5 2. g3) 2. Nc3 Nf6 3. g3 Bb4 4. Bg2 Nc6 5. Nd5';

        expect(cleanedHtml).toBe(expectedFormat);
    });
});