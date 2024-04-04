# @langtrase/typescript-sdk

## 1.3.1

- Adds 'langtrace.sdk.name' to the trace attributes

### Patch Changes

- Update readme

## 1.3.0

### Minor Changes

- 735628e: Breaks export url which has changed. Also batching is mandated when sending to langtrace cloud

## 1.2.9

### Patch Changes

- Fix function import error causing sdk to not function properly

## 1.2.8

### Patch Changes

- fb8d162: Fix withLangTraceRootSpan bug

## 1.2.7

### Patch Changes

- Bump dependency version to fix security vulnerability

## 1.2.6

### Major Changes

- - Fix bugs causing failure if api key is missing despite `write_to_remote_url` being off
  - Rename environment variables to better clarify usage
  - README.md updates
  - Fix linting in project

### Minor Changes

- 78f0988: Add more detailed README.md

### Patch Changes

- 432534b: Fix packaging issue causing import issues

## 1.1.5

### Minor Changes

- 38eb5f3: Fix version sync issue in registry and local

### Patch Changes

- 7298ecf: Fix packaging issue causing import issues

## 1.0.0

### Major Changes

- 9caeca6: First stable release of the sdk
