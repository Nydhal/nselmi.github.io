const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const engine = require('./ca-world.js');

async function main() {
  const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogue/index.json')));
  const byKey = new Map(catalogue.entries.map(entry => [entry.key, entry]));
  const fixtures = [
    ['entry-034', 'Forked terrace', 91, 76, 8],
    ['entry-035', 'Crowned terrace', 91, 70, 8],
    ['entry-036', 'Twin recesses', 81, 63, 7],
    ['entry-037', 'Stepped arch', 74, 63, 7],
    ['entry-038', 'Branching beam', 71, 60, 5],
    ['entry-039', 'Split bridge', 75, 57, 7],
  ];
  for (const [key, name, ruleCount, triangles, termination] of fixtures) {
    const entry = byKey.get(key);
    assert.equal(entry.name, name);
    const world = await engine.verify(JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogue', entry.download))));
    assert.deepEqual(world, entry.world);
    assert.equal(world.dynamics.rules.length, ruleCount);
    assert.deepEqual(world.dynamics.states, ['W', 'R', 'G', 'B']);
    assert.deepEqual(world.dynamics.offsets, [-3, -2, -1, 0, 1, 2, 3]);
    assert.equal(world.dynamics.boundary, 'fixed-W');
    assert.equal(world.geometry.phase, 0);
    assert(world.metadata.geometricModel.voxels.length > 0);
    const rows = engine.run(world.dynamics, 128).rows;
    assert.deepEqual(rows.slice(0, entry.rows.length), entry.rows);
    assert.equal(rows.join('').replaceAll('W', '').length, triangles);
    assert.equal(rows.findIndex(row => /^W+$/.test(row)), termination);
    assert(rows.slice(termination).every(row => /^W+$/.test(row)));
    assert.equal(new Map(world.dynamics.rules).get('WWWWWWW'), 'W');
  }

  const compatiblePairs = [];
  for (let first = 0; first < fixtures.length; first++) {
    for (let second = first + 1; second < fixtures.length; second++) {
      const left = new Map(byKey.get(fixtures[first][0]).world.dynamics.rules);
      const right = new Map(byKey.get(fixtures[second][0]).world.dynamics.rules);
      const conflicts = [...left].filter(([input, output]) => right.has(input) && right.get(input) !== output);
      if (!conflicts.length) compatiblePairs.push([fixtures[first][0], fixtures[second][0]]);
    }
  }
  assert.deepEqual(compatiblePairs, [['entry-034', 'entry-039'], ['entry-037', 'entry-039']]);

  const families = [
    {together: 'entry-040', members: ['entry-034', 'entry-039'], variants: ['entry-041', 'entry-042'], offsets: [0, 36], count: 163},
    {together: 'entry-043', members: ['entry-037', 'entry-039'], variants: ['entry-044', 'entry-045'], offsets: [0, 34], count: 146},
  ];
  for (const family of families) {
    const members = family.members.map(key => byKey.get(key));
    const together = byKey.get(family.together);
    const union = [...new Map(members.flatMap(entry => entry.world.dynamics.rules))].sort(([first], [second]) => first.localeCompare(second));
    assert.equal(union.length, family.count);
    for (const key of [family.together, ...family.variants]) {
      const entry = byKey.get(key);
      await engine.verify(entry.world);
      assert.deepEqual(entry.world.dynamics.rules, union);
      assert.equal(entry.ruleFamilyId, together.ruleFamilyId);
      assert.deepEqual(entry.world.appearance.palette, members[0].world.appearance.palette);
      assert.equal(entry.world.geometry.phase, 0);
      assert.deepEqual(engine.run(entry.world.dynamics, entry.rows.length).rows, entry.rows);
    }
    family.variants.forEach((key, index) => {
      const variant = byKey.get(key);
      assert.equal(variant.world.dynamics.seed, members[index].world.dynamics.seed);
      assert.deepEqual(variant.rows, members[index].rows);
    });
    const height = Math.max(...members.map(entry => entry.rows.length));
    const width = together.world.dynamics.width;
    const target = Array.from({length: height}, () => Array(width).fill('W'));
    members.forEach((entry, index) => {
      assert.equal(family.offsets[index] % 2, 0);
      entry.rows.forEach((row, generation) => [...row].forEach((state, column) => {
        if (state !== 'W') {
          assert.equal(target[generation][column + family.offsets[index]], 'W');
          target[generation][column + family.offsets[index]] = state;
        }
      }));
    });
    assert.deepEqual(together.rows, target.map(row => row.join('')));
    const actual = engine.run(together.world.dynamics, 128).rows;
    assert.deepEqual(actual.slice(0, height), together.rows);
    assert(actual.slice(height).every(row => /^W+$/.test(row)));
  }
  console.log('Six sculptures and two shared families: all 15 pair relations, unchanged targets, exact unions, phase, palettes and permanent termination verified.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
