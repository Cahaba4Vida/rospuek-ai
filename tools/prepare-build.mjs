import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dest=path.join(root,'dist');
fs.rmSync(dest,{recursive:true,force:true});
fs.mkdirSync(dest,{recursive:true});
const files=['index.html','styles.css','app.js','robots.txt','manifest.webmanifest'];
for(const name of files)fs.copyFileSync(path.join(root,name),path.join(dest,name));
for(const name of ['about','admin'])fs.cpSync(path.join(root,name),path.join(dest,name),{recursive:true});
fs.mkdirSync(path.join(dest,'assets','galaxies'),{recursive:true});
for(const name of ['nebula.webp','rospuek-mark.svg'])fs.copyFileSync(path.join(root,'assets',name),path.join(dest,'assets',name));
for(const file of fs.readdirSync(path.join(root,'assets','galaxies'))){if(file.endsWith('.webp'))fs.copyFileSync(path.join(root,'assets','galaxies',file),path.join(dest,'assets','galaxies',file));}
fs.mkdirSync(path.join(dest,'data'),{recursive:true});
fs.copyFileSync(path.join(root,'data','demo.json'),path.join(dest,'data','demo.json'));
// Empty archive used only if the private API isn't running in a local preview.
fs.writeFileSync(path.join(dest,'data','entries.json'),JSON.stringify({archiveName:"Zach's Dream Journal",entries:[]})+'\n');
console.log('Static site prepared; no private content or admin source tokens copied.');