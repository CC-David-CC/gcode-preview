# Owned original reference tests

These5 original test files belong to gcode-preview because their imported source modules match this repository’s exact captured blobs. Current implementation files and assertions are unchanged. Import and proven fixture/resource URL locators are ported to this repository; no cross-repository private source imports or compatibility path shims are added.

Mechanical source-test baseline `9f501dc5afa074c42ba43b92942f451008a3180a`; merge `69b167f3ce62c2008804195a0b57a7e3c4e906c5`. Private phase44 preserves earlier paths, explicit copy boundaries and source-to-result commit/ref maps. The locator-normalized complete AST is unchanged, not just selected assertions.

Run `npm run test:reference`. This is Node unit/reference qualification of the retained domain modules, not browser/worker/kernel/renderer/storage/authentication/human-agent acceptance. Current app hosting/build and shared-operation integration gates remain separately open.

Captured baseline and current port: 7 pass, 0 fail, 0 cancelled, 0 skipped across 7 reported Node subtests. Top-level assertion-only files count as one reported Node subtest, not individual assertions.
