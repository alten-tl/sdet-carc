const path = require('node:path');

/**
 * Rspack configuration for the API Lambda.
 *
 * The Nest CLI defaults externalise every node_modules dependency, which forces
 * the deployment package to ship a full `node_modules` tree. On Lambda that
 * means a multi-hundred-megabyte zip, so this configuration bundles the whole
 * dependency graph into a single CommonJS file.
 *
 * The SWC loader keeps `decoratorMetadata` enabled, which is what makes Nest's
 * constructor injection work (esbuild cannot emit that metadata).
 */
module.exports = {
  context: __dirname,
  entry: './src/api-lambda.ts',
  target: 'node22',
  mode: 'none',
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist/api'),
    filename: 'api-lambda.js',
    library: { type: 'commonjs2' },
    clean: true,
  },
  externals: [],
  externalsPresets: { node: true },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  decorators: true,
                },
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                },
                target: 'es2022',
              },
            },
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    tsConfig: 'tsconfig.build.json',
    alias: {
      // Optional Fastify-only integrations of @nestjs/swagger: the API runs on
      // the Express adapter, so these branches are never reached.
      '@fastify/static': false,
      '@fastify/swagger': false,
    },
  },
  node: {
    __filename: false,
    __dirname: false,
  },
  optimization: {
    nodeEnv: false,
    splitChunks: false,
    runtimeChunk: false,
  },
};
