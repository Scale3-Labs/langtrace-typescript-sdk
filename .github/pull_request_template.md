# Description

Please include a summary of the changes and the related issue to help is review the PR better and faster.

# Checklist for adding new integration:

- [ ] Defined `APIS` in constants [folder](../src/constants/instrumentation/).
- [ ] Updated `SERVICE_PROVIDERS` in [common.ts](../src/constants/common.ts)
- [ ] Created a folder under [instrumentation](../src/instrumentation/) with the name of the integration with atleast `patch.ts` and `index.ts` files.
- [ ] Enabled instrumentation in [init.ts](../src/init/init.ts) & [types.ts](../src/init/types.ts) files.
- [ ] Added examples for the new integration in the [examples](../src/examples/) folder.
- [ ] Updated [package.json](../package.json) to install new dependencies for devDependencies.
- [ ] Updated the [README.md](../README.md) of [langtrace-typescript-sdk](https://github.com/Scale3-Labs/langtrace-typescript-sdk) to include the new integration in the supported integrations table.
- [ ] Updated the [README.md](https://github.com/Scale3-Labs/langtrace?tab=readme-ov-file#supported-integrations) of Langtrace's [repository](https://github.com/Scale3-Labs/langtrace) to include the new integration in the supported integrations table.
- [ ] Added new integration page to supported integrations in [Langtrace Docs](https://github.com/Scale3-Labs/langtrace-docs)
