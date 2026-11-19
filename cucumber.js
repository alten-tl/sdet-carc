module.exports = {
  default: {
    paths: ['features'],
    requireModule: ['ts-node/register', 'tsconfig-paths/register'],
    require: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
    format: ['progress'],
    strict: true,
    timeout: 30_000,
  },
};
