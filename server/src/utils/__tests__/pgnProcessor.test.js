const { processGame, processPgnFile } = require('../pgnProcessor');
const logger = require('../logger');

// Mock the logger to avoid console output during tests
jest.mock('../logger', () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
}));

describe('PGN Processor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processGame', () => {
        test('should process a valid game', () => {
            const pgn = `[Event "Test Game"]
[Site "Chess.com"]
[Date "2023.12.23"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "1400"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0`;

            const result = processGame(pgn, 0);

            expect(result).toMatchObject({
                event: 'Test Game',
                site: 'Chess.com',
                white: 'Player1',
                black: 'Player2',
                result: '1-0',
                whiteElo: 1500,
                blackElo: 1400,
                moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0'
            });
            expect(result.date).toBeInstanceOf(Date);
        });

        test('should handle missing optional headers', () => {
            const pgn = `[Event "Basic Game"]
[White "Player1"]
[Black "Player2"]

1. e4 e5 2. Nf3 *`;

            const result = processGame(pgn, 0);

            expect(result).toMatchObject({
                event: 'Basic Game',
                site: 'Unknown',
                white: 'Player1',
                black: 'Player2',
                result: '*',
                whiteElo: null,
                blackElo: null
            });
        });

        test('should throw error for missing Event header', () => {
            const pgn = `[White "Player1"]
[Black "Player2"]

1. e4 e5`;

            expect(() => processGame(pgn, 0)).toThrow('Missing Event header');
        });

        test('should throw error for missing moves', () => {
            const pgn = `[Event "No Moves"]
[White "Player1"]
[Black "Player2"]`;

            expect(() => processGame(pgn, 0)).toThrow('No moves found');
        });

        test('should preserve annotations in moves', () => {
            const pgn = `[Event "Annotated Game"]
[Site "Chess.com"]
[Date "2023.12.23"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4! {Great opening move} 1...e5 2. Nf3 $1 {Strong development} 2...Nc6 3. Bb5 1-0`;

            const result = processGame(pgn, 0);

            expect(result.moves).toBe('1. e4! {Great opening move} 1...e5 2. Nf3 $1 {Strong development} 2...Nc6 3. Bb5 1-0');
            expect(result.pgn).toContain('{Great opening move}');
            expect(result.pgn).toContain('$1');
            expect(result.pgn).toContain('{Strong development}');
        });
    });

    describe('processPgnFile', () => {
        test('should process multiple games', () => {
            const pgnContent = `[Event "Game 1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0


[Event "Game 2"]
[White "Player3"]
[Black "Player4"]
[Result "0-1"]

1. d4 d5 0-1`;

            const result = processPgnFile(pgnContent);

            expect(result.processedGames).toHaveLength(2);
            expect(result.errors).toHaveLength(0);
            expect(result.summary).toEqual({
                totalGames: 2,
                successfulGames: 2,
                failedGames: 0
            });
        });

        test('should handle mixed valid and invalid games', () => {
            const pgnContent = `[Event "Valid Game"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0


[White "Player3"]
[Black "Player4"]
[Result "0-1"]

1. d4 d5`;  // Missing Event header

            const result = processPgnFile(pgnContent);

            expect(result.processedGames).toHaveLength(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toBe('Game 2: Invalid PGN format: Missing Event header');
            expect(result.processedGames[0].event).toBe('Valid Game');
        });

        test('should throw error for empty content', () => {
            expect(() => processPgnFile('')).toThrow('PGN file is empty');
        });
    });

    test('processes nested variations correctly', () => {
        const pgn = `
[Event "English Tree: sample nested line"]
[Site "https://lichess.org/study/zw3W5ddH/VYmMfmA6"]
[Result "*"]
[ECO "A20"]
[Opening "English Opening"]

1. c4 e5 (1... e6 2. Nc3) (1... c5 2. g3) 2. Nc3 Nf6 (2... Bb4 3. g3) (2... Bc5 3. e3) 3. g3 Bb4 4. Bg2 Nc6 (4... O-O 5. e4) 5. Nd5 *`;

        const result = processGame(pgn, 0);

        expect(result.annotations).toEqual([
            {
                moveNumber: 1,
                variation: 'e6 2. Nc3',
                move: 'e5',
                isBlackMove: true,
                nags: [],
                shapes: []
            },
            {
                moveNumber: 1,
                variation: 'c5 2. g3',
                move: 'e5',
                isBlackMove: true,
                nags: [],
                shapes: []
            },
            {
                moveNumber: 2,
                variation: 'Bb4 3. g3',
                move: 'Nf6',
                isBlackMove: true,
                nags: [],
                shapes: []
            },
            {
                moveNumber: 2,
                variation: 'Bc5 3. e3',
                move: 'Nf6',
                isBlackMove: true,
                nags: [],
                shapes: []
            },
            {
                moveNumber: 4,
                variation: 'O-O 5. e4',
                move: 'Nc6',
                isBlackMove: true,
                nags: [],
                shapes: []
            }
        ]);
    });

    test('handles simple game without variations', () => {
        const pgn = `
[Event "Rated Blitz game"]
[Site "https://lichess.org"]
[Result "1-0"]
[ECO "A00"]

1. c4 f5 2. Nc3 Nf6 3. d3 e6 4. g3 *`;

        const result = processGame(pgn, 0);

        // Verify main line moves
        expect(result.moves).toBe('1. c4 f5 2. Nc3 Nf6 3. d3 e6 4. g3 *');

        // Verify no variations
        expect(result.annotations.filter(a => a.variation)).toHaveLength(0);
    });

    test('handles variations starting with black moves', () => {
        const pgn = `
[Event "Test Game"]
[Site "https://lichess.org"]
[Result "*"]

1. e4 e5 (1...c5 2. Nf3 d6) 2. Nf3 *`;

        const result = processGame(pgn, 0);

        // Verify main line moves with variations
        expect(result.moves).toBe('1. e4 e5 (1...c5 2. Nf3 d6) 2. Nf3 *');

        // Verify variation is processed correctly
        expect(result.annotations).toEqual(
            expect.arrayContaining([
                {
                    moveNumber: 1,
                    variation: 'c5 2. Nf3 d6',
                    move: 'e5',
                    isBlackMove: true,
                    nags: [],
                    shapes: []
                }
            ])
        );
    });

    test('processes variations with isBlackMove property correctly', () => {
        const pgn = `
[Event "Test Game"]
[Site "https://lichess.org"]
[Result "*"]

1. e4 e5 (1...c5 2. Nf3 d6) 2. Nf3 *`;

        const result = processGame(pgn, 0);

        expect(result.annotations).toContainEqual({
            moveNumber: 1,
            variation: 'c5 2. Nf3 d6',
            move: 'e5',
            isBlackMove: true,
            nags: [],
            shapes: []
        });
    });
});
