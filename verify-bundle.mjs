// Portable verification when the native esbuild executable cannot enumerate Windows ancestors.
import {build} from 'esbuild-wasm';
import {gzipSync} from 'node:zlib';
const result=await build({entryPoints:['worker/index.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',conditions:['workerd','worker','browser'],outfile:'.wrangler/portable/index.mjs',metafile:true,write:false});
const bytes=result.outputFiles[0].contents;
console.log(`Worker bundle: ${bytes.length} bytes; gzip: ${gzipSync(bytes).length} bytes`);
if(gzipSync(bytes).length>3*1024*1024)throw Error('Worker exceeds the free-plan compressed bundle limit');
const fs=await import('node:fs');fs.mkdirSync('.wrangler/portable',{recursive:true});fs.writeFileSync('.wrangler/portable/index.mjs',bytes);
