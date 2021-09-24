module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(vert|frag|glsl|vs|fs)/,
        type: 'asset/source',
      },
    ],
  }
}
