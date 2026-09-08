# Cellular automaton world files

Use **Export world** in the explorer to download a complete JSON configuration, then **Import world** to restore it. Catalogue world downloads use the same format. **Export SVG** saves the drawing; the rule editor's **Export** saves only its rule table.

The `ca-world-v1` record includes:

- **Dynamics:** four symbolic states W/R/G/B, diagnostic K, ordered offsets -3 through +3, every supplied rule, literal seed and width, synchronous update, fixed-W or periodic boundaries, missing-rule behavior, and K propagation behavior.
- **Geometry:** triangles or squares, triangle phase 0/1, cell dimensions, and a planar view of the strip. Periodic symbolic evolution does not itself assert a seamless geometric cylinder for odd widths.
- **Appearance:** all five opaque sRGB palette colors, background, borders, border width, and whether W cells are omitted from the drawing.
- **Observation:** row count including the seed, full-domain viewport, renderer identifier, and grid checksum.
- **Identities:** SHA-256 hashes link dynamics, geometry, appearance, and observation. A palette change preserves the dynamics identity; a phase change preserves dynamics but changes geometry. Names and source descriptions are metadata.

The historical `legacy-K-as-W` mode converts K to W before looking up the next neighborhood. The default `output-K` mode leaves K in the neighborhood, which has no matching four-state rule and therefore produces K. They can give different later generations; neither is silently substituted during import.

Imports validate the schema, settings, identity links, and replay checksum before changing the editor. Unsupported geometries, transparent colors, duplicate rule inputs, malformed states, and inconsistent checksums are rejected. The editor supports 1–1000 seed cells, 1–512 rows, and at most 200,000 cells per observation. Source-specific image crops and rotations remain source evidence; the editable world shows its full computational domain.

Canonical hashing sorts object keys recursively and uses compact JSON with the field representations emitted by the exporter. Rule pairs are sorted by input in exported editor worlds. For portable files, retain those representations and use the exporter to recalculate IDs after edits. Border width may include finite decimal values; metadata is outside the identity layers.

Run `node test-ca-world.cjs` from this repository to check every catalogue world against its saved grid, editor export/import round trips, boundaries, K behavior, geometry, palette identity separation, and invalid-file rejection. The source archive and its Python recovery scripts are maintained outside this website repository.
