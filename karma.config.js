// 由于https://github.com/ryanclark/karma-webpack/issues/498,
// 采取了hack手段让karma-webpack支持在测试时使用Webpack生成的Worker文件.
// hack手段来自于此评论, 其作用是将karma将webpack的生成文件视作是测试的一部分:
// https://github.com/ryanclark/karma-webpack/issues/498#issuecomment-790040818

const { createTempNameSync } = require('extra-filesystem')
const webpack = require('./webpack.config')

const webpackOutput = createTempNameSync()

module.exports = config => {
  config.set({
    plugins: [
      'karma-webpack'
    , 'karma-jasmine'
    , 'karma-chrome-launcher'
    ]
  , frameworks: ['jasmine']
  , files: [
      '__tests__/**/*.spec.ts'
    , {
        pattern: `${webpackOutput}/**/*`
      , watched: false
      , included: false // 防止karma运行webpack生成的文件
      }
    ]
  , preprocessors: {
      '__tests__/**/*.spec.ts': ['webpack']
    }
  , browsers: ['ChromeHeadless']
  , webpack: {
      ...webpack
    , output: {
        path: webpackOutput
      }
    }
  })
}
