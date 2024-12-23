const { processGame, processPgnFile } = require('../pgnProcessor');

describe('PGN Processor', () => {
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
                moves: 'e4 e5 Nf3 Nc6 Bb5'
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
            expect(result.errors[0]).toContain('Missing Event header');
            expect(result.processedGames[0].event).toBe('Valid Game');
        });

        test('should throw error for empty content', () => {
            expect(() => processPgnFile('')).toThrow('PGN file is empty');
        });
    });
});
