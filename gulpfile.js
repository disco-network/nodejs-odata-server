var gulp = require('gulp'),
  jasmine = require('gulp-jasmine'),
  tslint = require('gulp-tslint');
  tslint = require('gulp-tslint'),
  tsc = require('gulp-typescript'),
	sourcemaps = require('gulp-sourcemaps');

gulp.task('lint', function () {
  return gulp.src([
    'src/**/**.ts',
    'spec/**.ts',
    'typings/**.d.ts'
  ])
    .pipe(tslint({}))
    .pipe(tslint.report('verbose'));
});

var tsProject = tsc.createProject("tsconfig.json");
gulp.task('build', function () {
  return gulp.src([
    './**/**.ts',
    '!./node_modules/**'
  ])
    .pipe(sourcemaps.init())
    .pipe(tsc(tsProject))
    .js
    //.pipe(sourcemaps.write('../maps'))
    .pipe(sourcemaps.write('.', {debug: true, includeContent: false, sourceRoot: '../../'}))
    .pipe(gulp.dest('lib'));
})

//gulp.task('tests', ['build'], function () {
gulp.task('tests', function () {
  return gulp.src('./lib/spec/*.js')
    .pipe(jasmine({ includeStackTrace: true, verbose: true }));
});

//alternative name for the 'tests' task
gulp.task('specs', ['tests']);

gulp.task('server', function () {
  require('./lib/src/server');
});
