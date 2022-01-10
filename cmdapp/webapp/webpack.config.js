let path = require('path')

module.exports = {
    entry: "./src/index.js",
    output: {
        path: path.join(__dirname, "../public"),
        filename: "bundle.js",
    },
    devtool: "source-map",
    performance: {
        hints: false,
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
    module: {
        rules: [
            {
                test: /\.worker\.js$/,
                use: { loader: 'worker-loader' }
            },
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader'
            },
            {
                test: /\.css$/,
                use: ['style-loader','css-loader', {
                    loader: 'postcss-loader',
                    options: {
                    plugins: () => [require('autoprefixer')]
                    }}]
            }
        ]
    },
    mode: 'development'   // Not uglify.
    //mode: 'production'      // Uglify.
}
 