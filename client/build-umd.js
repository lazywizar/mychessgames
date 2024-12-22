import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['chessground/src/chessground.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'Chessground',
  outfile: 'libs/chessground.umd.js',
  target: ['es2015'],
});
