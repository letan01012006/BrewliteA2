import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const directory = new URL('../../tests/postman/', import.meta.url);
const [collection, automation, environment, spec] = await Promise.all(
  ['BrewLiteA2.postman_collection.json', 'BrewLiteA2.auto.postman_collection.json', 'BrewLiteA2.postman_environment.json', 'BrewLiteA2.openapi.json']
    .map(async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'))),
);
const entries = Object.entries(spec.paths).flatMap(([path, methods]) => Object.entries(methods)
  .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
  .map(([method, operation]) => ({ method: method.toUpperCase(), path, group: operation.tags?.[0] || 'App' })));
const shape = value => (value.replace(/\{\{[^}]+\}\}|\{[^}]+\}/g, ':param').replace(/\/$/, '') || '/');
const requestKey = request => request.method + ' ' + shape('/api' + request.url.replace('{{base_url}}', '').split('?')[0]);
function requests(node) { return node.request ? [node] : (node.item || []).flatMap(requests); }
const manual = requests(collection);
assert.equal(manual.length, entries.length, 'Exactly one manual request per Swagger endpoint');
const actual = new Map(manual.map(item => [requestKey(item.request), item]));
for (const entry of entries) {
  assert.ok(actual.has(entry.method + ' ' + shape(entry.path)), `Missing ${entry.method} ${entry.path}`);
  const group = collection.item.find(folder => folder.name === entry.group);
  assert.ok(group?.item.some(item => requestKey(item.request) === entry.method + ' ' + shape(entry.path)), `Wrong group: ${entry.path}`);
}
const covered = new Set(requests(automation).map(item => requestKey(item.request)));
for (const entry of entries) assert.ok(covered.has(entry.method + ' ' + shape(entry.path)), `Not exercised: ${entry.method} ${entry.path}`);
let scripts = 0;
function verifyScripts(node) {
  for (const event of node.event || []) { new Script(event.script.exec.join('\n'), { filename: `${node.name || 'collection'}:${event.listen}` }); scripts++; }
  for (const child of node.item || []) verifyScripts(child);
}
verifyScripts(collection);
verifyScripts(automation);
const keys = new Set(environment.values.map(variable => variable.key));
for (const match of JSON.stringify([collection, automation]).matchAll(/{{([^{}]+)}}/g))
  if (!match[1].startsWith('$')) assert.ok(keys.has(match[1]), `Missing variable ${match[1]}`);
for (const variable of environment.values)
  if (variable.key.endsWith('_token')) assert.equal(variable.value, '', 'Do not export live JWTs');
assert.equal(environment.values.find(variable => variable.key === 'base_url').value, collection.variable.find(variable => variable.key === 'base_url').value);
console.log(`PASS: ${entries.length} Swagger endpoints, ${collection.item.length} groups, ${requests(automation).length} automated requests, ${scripts} valid scripts, ${keys.size} environment variables.`);
console.log(`Files: ${fileURLToPath(directory)}`);
