# Cannabis–Healthcare Conversation Questionnaire Sandbox

An unvalidated, browser-local demonstration of **pseudonymously linked pre/post questionnaire records**.

Six standalone indicators about talking to a clinician about cannabis. Each record is filed
under a participant-generated eight-character code plus a phase, so a later record can sit
beside an earlier one without the instrument ever learning who answered.

## What it demonstrates

A specific, reusable design — not a finding. `/design` sets out why participant-generated
linkage codes are used instead of anonymity (which cannot support a within-person comparison)
or identity (which makes a sensitive disclosure directly attributable), walks a worked example
of reading one pair, and names the rival explanations the design does not rule out:
response shift, testing effects, social desirability, regression to the mean, and attrition.

Nothing is summed, averaged, or scored. Responses are ordered labels, and the export declares
them ordinal so a downstream reader inherits the constraint.

## The browser-local guarantee

The site is served with `connect-src 'none'`. `fetch`, `XMLHttpRequest`, `WebSocket`,
`EventSource` and `sendBeacon` are refused by the browser regardless of what the script asks
for. Exports use `Blob` + object URL and imports use `FileReader` — file operations, not
requests. `npm test` fails the build if a network call, an off-site asset, or a weakened CSP
is introduced.

## Routes

`/` · `/methodology` · `/design` · `/privacy`

## Test

```sh
npm test
```
