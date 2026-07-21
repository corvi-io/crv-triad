# Changelog

## [0.2.0](https://github.com/corvi-io/crv-triad/compare/v0.1.0...v0.2.0) (2026-07-21)


### Features

* **studio:** add component system and mock runtime ([e050f86](https://github.com/corvi-io/crv-triad/commit/e050f86f1202ab53f2428e5b217bc0211152cbda))
* **studio:** add component system and mock runtime ([bcfffb3](https://github.com/corvi-io/crv-triad/commit/bcfffb35dc060d16665dd36cc9c81ee75db4d87b))
* **studio:** add daily schedule prototype ([5af0992](https://github.com/corvi-io/crv-triad/commit/5af0992d549ce3c181ce10b1fe59b3fc3076842e))
* **studio:** add daily schedule visual prototype ([74f7c9a](https://github.com/corvi-io/crv-triad/commit/74f7c9ae0950f8ed06183bcac76379b7fb406d2b))
* **studio:** adopt navy and gold brand theme ([796de10](https://github.com/corvi-io/crv-triad/commit/796de1076fb61ecc5cf40307e84b2c30682f4d83))
* **studio:** adopt navy and gold brand theme ([39cc974](https://github.com/corvi-io/crv-triad/commit/39cc97456bccbb13b81a09c31128cb8210e6ae90))
* **studio:** establish authenticated frontend foundation ([f4dcfb3](https://github.com/corvi-io/crv-triad/commit/f4dcfb37ec340a1063d668b76b8b9b4c2ac3c441))
* **studio:** establish authenticated frontend foundation ([50b6c2d](https://github.com/corvi-io/crv-triad/commit/50b6c2d831d67ec1541c5c87f7f88a601ea5dc7b))


### Bug Fixes

* **ci:** bootstrap manual release preparation ([f02f6fe](https://github.com/corvi-io/crv-triad/commit/f02f6fee1815f542ede994e11e051373fffbd7a2))
* **ci:** bootstrap manual release preparation ([dbe8491](https://github.com/corvi-io/crv-triad/commit/dbe84917fb96f4d67b77c8617a5eb02fdc83648c))
* **ci:** make release readiness regex shell-safe ([006a701](https://github.com/corvi-io/crv-triad/commit/006a70169a8e0ecb220c837eef4c4054794ce847))
* **ci:** make release readiness regex shell-safe ([6f03dfa](https://github.com/corvi-io/crv-triad/commit/6f03dfa557e40771097066dfe5de76d298724680))
* **ci:** stabilize delivery workflows ([b6a62d7](https://github.com/corvi-io/crv-triad/commit/b6a62d715045be22d690d216811d2208d5b46eef))
* **ci:** stabilize delivery workflows ([3959187](https://github.com/corvi-io/crv-triad/commit/3959187e1aa98b945acf7a0276d2b5de2bcac0d9))
* **deps:** override vulnerable js-yaml version ([405b335](https://github.com/corvi-io/crv-triad/commit/405b335a13cb83ca58d258631f9999be1e5f1073))
* **studio:** address ENG-33 review findings ([7f548f6](https://github.com/corvi-io/crv-triad/commit/7f548f633015c4a8bc622910f63ae8170914aa88))
* **studio:** address final theme review findings ([15d2286](https://github.com/corvi-io/crv-triad/commit/15d22862af14aaf7f710197cc9bcadd8a859c4e6))
* **studio:** address schedule review findings ([753319c](https://github.com/corvi-io/crv-triad/commit/753319c3e8f0b06add52689471da9364bdf1eb48))
* **studio:** expand visual catalog guard ([e11dba1](https://github.com/corvi-io/crv-triad/commit/e11dba1f82cec8ee6865ee2af72e62a151c8637b))
* **studio:** resolve final schedule review findings ([d79882d](https://github.com/corvi-io/crv-triad/commit/d79882d10a95290daa5a81415bc9c18753bb9020))

## 0.1.0 (2026-07-18)

### Features

- establish the domain-neutral CRV Triad workspace across site, API, identity,
  and authenticated web applications;
- preserve the reusable authentication and application foundations while
  removing inherited CRM domains, routes, fixtures, and reference forms;
- categorize application, CI/CD, and infrastructure configuration through the
  deployment environment schema;
- harden protected-branch delivery pipelines for development, homologation,
  production promotion, release publication, and branch synchronization.

### Bug Fixes

- keep production promotion validation independent from the protected `prd`
  environment so pull-request checks can execute successfully.

### Documentation

- document release-only operation, first-release bootstrap, environment
  provisioning, and future agent guidance.
