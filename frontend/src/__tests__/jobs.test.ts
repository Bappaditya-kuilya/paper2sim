import { jobStepIndex, isTerminal, JOB_STEPS } from '../lib/jobs';

test('maps statuses to the 5 PRD steps', () => {
  expect(JOB_STEPS).toHaveLength(5);
  expect(jobStepIndex('queued')).toBe(0);
  expect(jobStepIndex('ingesting')).toBe(0);
  expect(jobStepIndex('analyzing')).toBe(1);
  expect(jobStepIndex('generating')).toBe(2);
  expect(jobStepIndex('executing')).toBe(3);
  expect(jobStepIndex('repairing')).toBe(3);
  expect(jobStepIndex('summarizing')).toBe(4);
  expect(jobStepIndex('completed')).toBe(4);
});

test('terminal states', () => {
  expect(isTerminal('completed')).toBe(true);
  expect(isTerminal('failed')).toBe(true);
  expect(isTerminal('executing')).toBe(false);
});
