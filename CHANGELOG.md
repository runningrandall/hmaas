# [1.6.0](https://github.com/runningrandall/hmaas/compare/v1.5.0...v1.6.0) (2026-03-14)


### Features

* properties, categories, service enhancements, and OpenAPI spec ([#11](https://github.com/runningrandall/hmaas/issues/11)) ([b091ed6](https://github.com/runningrandall/hmaas/commit/b091ed6bd1dd2da0cdaf285a9a56ff413e7d108e))

<<<<<<< dev
=======
# [1.5.0](https://github.com/runningrandall/hmaas/compare/v1.4.1...v1.5.0) (2026-03-11)


### Features

* subcontractors, integrations, and handler refactor ([#10](https://github.com/runningrandall/hmaas/issues/10)) ([3e6c8e2](https://github.com/runningrandall/hmaas/commit/3e6c8e261fafae15f102a1172ea9d84511183c51))

>>>>>>> main
## [1.4.1](https://github.com/runningrandall/hmaas/compare/v1.4.0...v1.4.1) (2026-03-06)


### Bug Fixes

* explicitly set externalModules to bundle [@smithy](https://github.com/smithy) packages ([0bde631](https://github.com/runningrandall/hmaas/commit/0bde631a1357ae0d950cc99994048403342ecb03))
* restrict CORS to localhost:3000 and *.vproservices.com ([3d80275](https://github.com/runningrandall/hmaas/commit/3d802752c9e349c67dde095589564f13dddfa056))
* upgrade Pre Token Generation to V2 for access token claims ([72cbaad](https://github.com/runningrandall/hmaas/commit/72cbaadc2559b9b2c5d2c60517755d066f56f261))
* use wildcard region in authorizer IAM policy for Verified Permissions ([b3e422a](https://github.com/runningrandall/hmaas/commit/b3e422a20c6d8bc1d20ee54e4b0ff775bc467764))

# [1.4.0](https://github.com/runningrandall/hmaas/compare/v1.3.0...v1.4.0) (2026-03-06)


### Bug Fixes

* correct nested stack count to 8 in infra test ([fe48e10](https://github.com/runningrandall/hmaas/commit/fe48e101b8ced880c11e53364f4d5fb68ca3744c))
* preserve Stage logical ID to avoid CloudFormation conflict ([cb90ee2](https://github.com/runningrandall/hmaas/commit/cb90ee2804de54ca9e2ccf6ce9e623e4738394ec))
* revert route nested stacks, use allowTestInvoke:false to reduce resource count ([2e6abc0](https://github.com/runningrandall/hmaas/commit/2e6abc046fd5a94881e79c4040d17be2097ad150))
* split API routes into nested stacks to stay under 500 resource limit ([27ad57f](https://github.com/runningrandall/hmaas/commit/27ad57f7667dd0edcd7b9bd2e2eab92d69f72d91))
* split estimate lambdas into own nested stack ([1dee466](https://github.com/runningrandall/hmaas/commit/1dee466fc66eb1713a6ce61db0ed81ced89ff647))


### Features

* add estimates, measurement pricing, and customer UI ([ca3d4bb](https://github.com/runningrandall/hmaas/commit/ca3d4bb745904627c43d79f5edb3e65217e0f6ae))
* add royal blue light/dark theme with system preference support ([14e767d](https://github.com/runningrandall/hmaas/commit/14e767d2f6009ff7fdb2db4545240ff291d28c11))

# [1.3.0](https://github.com/runningrandall/hmaas/compare/v1.2.0...v1.3.0) (2026-03-04)


### Features

* enrich admin entities and add PlanServices UI ([e539733](https://github.com/runningrandall/hmaas/commit/e539733dd5aabad101002b7d544dbc94ebb1532b))

# [1.2.0](https://github.com/runningrandall/hmaas/compare/v1.1.0...v1.2.0) (2026-03-04)


### Features

* generalize categories to flexible entity tagging system ([#6](https://github.com/runningrandall/hmaas/issues/6)) ([eb2e70c](https://github.com/runningrandall/hmaas/commit/eb2e70c0f4129de99fd8c5c1a0204c2fa5c4c165))

# [1.1.0](https://github.com/runningrandall/hmaas/compare/v1.0.0...v1.1.0) (2026-02-27)


### Features

* implement multi-tenancy with Organization entity ([#4](https://github.com/runningrandall/hmaas/issues/4)) ([649f967](https://github.com/runningrandall/hmaas/commit/649f9670623f78526666d2027e096426ac41ebe2)), closes [#3](https://github.com/runningrandall/hmaas/issues/3)

# 1.0.0 (2026-02-25)


### Bug Fixes

* **all:** fix authorizer and apis ([21441c5](https://github.com/runningrandall/hmaas/commit/21441c5ca414342ff03f5376b1ddc7394d53f2db))
* **ci:** deploy prod from semantic-release tag for deterministic versioning ([63b3d03](https://github.com/runningrandall/hmaas/commit/63b3d03e5365891d7714c5e7c9c6559a1129fd69))
* **frontend, lint:** fix linting and build steps ([7489870](https://github.com/runningrandall/hmaas/commit/7489870e6be91220de1d4f9d74be95afbfa7a5a2))
* **frontend:** fix captcha and theme ([6f70055](https://github.com/runningrandall/hmaas/commit/6f70055869fb103ab490732fec787653627f0a3e))


### Features

* add Category entity for multi-entity single-table demo ([0975765](https://github.com/runningrandall/hmaas/commit/0975765fcf5fbd32bd3bff4679a3ca42d430dcd5))
* add tests ([5a4dd59](https://github.com/runningrandall/hmaas/commit/5a4dd59962ed98725993899ea2f89a40c68d8d20))
* **all:** fix tests, cloudfront distribution ([1013b2c](https://github.com/runningrandall/hmaas/commit/1013b2c38c927cd60b7195e9ac1f461e8e45594b))
* **backend:** fix backend stagee ([6fc708d](https://github.com/runningrandall/hmaas/commit/6fc708de3d9b975a5d489844e9f5e5ab753b61bf))
* **core:** add pagination, gsi, fix profile ([56ade2e](https://github.com/runningrandall/hmaas/commit/56ade2e9e647dadf502c1013012802282caab3d5))
* **frontend:** add form ([e08d306](https://github.com/runningrandall/hmaas/commit/e08d306b2a58e2ceec06076f1b3832dbeb3113bd))
* **frontend:** adds cloudfrount config ([c53d2bd](https://github.com/runningrandall/hmaas/commit/c53d2bd4741362aa0912064934c6637d84d9c76f))
* **frontend:** fix api route, collapse menu ([c6e4abb](https://github.com/runningrandall/hmaas/commit/c6e4abbbdf27189487cfb20fac2f6ac484a66498))
* **frontend:** fix date picker, ui enhancements ([412ac77](https://github.com/runningrandall/hmaas/commit/412ac77a6e5aa49924586cafc9c9f723dd6921b6))
* **frontend:** fix form submission ([ab4b5bf](https://github.com/runningrandall/hmaas/commit/ab4b5bf81d25811aa99d3b02cd92c11efccac63d))
* **frontend:** fix overlapping menu ([ad4f06c](https://github.com/runningrandall/hmaas/commit/ad4f06c624d70a9725233def6fb5ea06b9bd0df8))
* **frontend:** fix report notifications ([e6156a0](https://github.com/runningrandall/hmaas/commit/e6156a0ad8466dfb82af568cfb2abbb2ce561c97))
* implement Versa property management entity model ([b4c1642](https://github.com/runningrandall/hmaas/commit/b4c1642fdb670a6fb2d19c873b68f9f9ad8caa5c))

# [1.1.0](https://github.com/runningrandall/serverless-template/compare/v1.0.0...v1.1.0) (2026-02-15)


### Bug Fixes

* **all:** fix authorizer and apis ([21441c5](https://github.com/runningrandall/serverless-template/commit/21441c5ca414342ff03f5376b1ddc7394d53f2db))
* **frontend:** fix captcha and theme ([6f70055](https://github.com/runningrandall/serverless-template/commit/6f70055869fb103ab490732fec787653627f0a3e))


### Features

* add tests ([5a4dd59](https://github.com/runningrandall/serverless-template/commit/5a4dd59962ed98725993899ea2f89a40c68d8d20))
* **all:** fix tests, cloudfront distribution ([1013b2c](https://github.com/runningrandall/serverless-template/commit/1013b2c38c927cd60b7195e9ac1f461e8e45594b))
* **backend:** fix backend stagee ([6fc708d](https://github.com/runningrandall/serverless-template/commit/6fc708de3d9b975a5d489844e9f5e5ab753b61bf))
* **core:** add pagination, gsi, fix profile ([56ade2e](https://github.com/runningrandall/serverless-template/commit/56ade2e9e647dadf502c1013012802282caab3d5))
* **frontend:** add form ([e08d306](https://github.com/runningrandall/serverless-template/commit/e08d306b2a58e2ceec06076f1b3832dbeb3113bd))
* **frontend:** adds cloudfrount config ([c53d2bd](https://github.com/runningrandall/serverless-template/commit/c53d2bd4741362aa0912064934c6637d84d9c76f))
* **frontend:** fix api route, collapse menu ([c6e4abb](https://github.com/runningrandall/serverless-template/commit/c6e4abbbdf27189487cfb20fac2f6ac484a66498))
* **frontend:** fix date picker, ui enhancements ([412ac77](https://github.com/runningrandall/serverless-template/commit/412ac77a6e5aa49924586cafc9c9f723dd6921b6))
* **frontend:** fix form submission ([ab4b5bf](https://github.com/runningrandall/serverless-template/commit/ab4b5bf81d25811aa99d3b02cd92c11efccac63d))
* **frontend:** fix overlapping menu ([ad4f06c](https://github.com/runningrandall/serverless-template/commit/ad4f06c624d70a9725233def6fb5ea06b9bd0df8))
* **frontend:** fix report notifications ([e6156a0](https://github.com/runningrandall/serverless-template/commit/e6156a0ad8466dfb82af568cfb2abbb2ce561c97))

# 1.0.0 (2026-02-11)


### Bug Fixes

* **frontend, lint:** fix linting and build steps ([7489870](https://github.com/runningrandall/serverless-template/commit/7489870e6be91220de1d4f9d74be95afbfa7a5a2))


### Features

* add Category entity for multi-entity single-table demo ([0975765](https://github.com/runningrandall/serverless-template/commit/0975765fcf5fbd32bd3bff4679a3ca42d430dcd5))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 0.0.0 (2026-02-10)


### Features

* add Category entity for multi-entity single-table demo ([0975765](https://github.com/runningrandall/serverless-template/commit/0975765fcf5fbd32bd3bff4679a3ca42d430dcd5))
