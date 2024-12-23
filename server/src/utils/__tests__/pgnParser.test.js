const { parsePGN } = require('../pgnParser');

describe('PGN Parser', () => {
    test('should parse a single game with headers and moves', () => {
        const pgnContent = `[Event "Casual Game"]
[Site "Chess.com"]
[Date "2023.12.23"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0`;

        const result = parsePGN(pgnContent);
        
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            event: 'Casual Game',
            site: 'Chess.com',
            date: '2023.12.23',
            white: 'Player1',
            black: 'Player2',
            result: '1-0',
            moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0'
        });
        // Verify PGN reconstruction preserves original case
        expect(result[0].pgn).toBe(pgnContent);
    });

    test('should parse multiple games', () => {
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

        const result = parsePGN(pgnContent);
        
        expect(result).toHaveLength(2);
        expect(result[0].event).toBe('Game 1');
        expect(result[1].event).toBe('Game 2');
        expect(result[0].moves).toBe('1. e4 e5 1-0');
        expect(result[1].moves).toBe('1. d4 d5 0-1');
    });

    test('should handle empty input', () => {
        const result = parsePGN('');
        expect(result).toHaveLength(0);
    });

    test('should handle malformed PGN', () => {
        const malformedPGN = `[Event "Malformed Game"]
[White "Player1"]
Invalid line
1. e4 e5`;

        const result = parsePGN(malformedPGN);
        expect(result).toHaveLength(1);
        expect(result[0].event).toBe('Malformed Game');
        expect(result[0].white).toBe('Player1');
        expect(result[0].moves).toBe('Invalid line 1. e4 e5');
    });

    test('should handle PGN with only headers', () => {
        const headerOnlyPGN = `[Event "Header Only"]
[White "Player1"]
[Black "Player2"]
[Result "*"]`;

        const result = parsePGN(headerOnlyPGN);
        expect(result).toHaveLength(1);
        expect(result[0].event).toBe('Header Only');
        expect(result[0].moves).toBe('');
    });

    test('should handle multi-line moves', () => {
        const pgnWithMultiLineMoves = `[Event "Multi-line Game"]
[White "Player1"]
[Black "Player2"]

1. e4 e5
2. Nf3 Nc6
3. Bb5 a6`;

        const result = parsePGN(pgnWithMultiLineMoves);
        expect(result).toHaveLength(1);
        expect(result[0].moves).toBe('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6');
    });
});
