'use strict';

import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import runSequence from 'run-sequence';
import fileinclude from 'gulp-file-include';
import browserSyncPachage from 'browser-sync';
import '@babel/register';
import 'gulp-autoprefixer';
import 'gulp-uglify';

const $ = gulpLoadPlugins();
const reload = browserSyncPachage.reload;
const browserSync = browserSyncPachage.create();

let dev = true;

const paths = {
  scripts: {
    input: 'app/scripts/**/*.js',
    tmp: '.tmp/scripts/',
    output: 'dist/scripts/'
  },
  styles: {
    input: 'app/styles/**/*.scss',
    tmp: '.tmp/styles/',
    output: 'dist/styles/'
  },
  html: {
    input: 'app/**/*.html',
    tmp: '.tmp/',
    output: 'dist/'
  },
  images: {
    input: 'app/images/**/*.{jpeg,jpg,png,svg,gif,ico}',
    tmp: '.tmp/images',
    output: 'dist/images/'
  },
  videos: {
    input: 'app/videos/**/*.{mp4,mov}',
    tmp: '.tmp/videos',
    output: 'dist/videos/'
  },
  favicons: {
    input: 'app/favicons/**/*.{jpeg,jpg,png,svg,gif,ico}',
    tmp: '.tmp/favicons',
    output: 'dist/favicons/'
  },
  fonts: {
    input: 'app/fonts/**/*.{ttf,woff,eof,svg}',
    tmp: '.tmp/fonts',
    output: 'dist/fonts/'
  },
  locales: {
    input: 'app/locales/**/*.{ftl}',
    tmp: '.tmp/locales',
    output: 'dist/locales/'
  },
  misc: {
    input: 'app/*.{ico,png,txt,xml,json}',
    tmp: '.tmp/',
    output: 'dist/'
  }
};

gulp.task('styles', () => {
  return gulp.src(paths.styles.input)
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer({ browsers: ['last 6 versions', 'Firefox ESR'] }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(paths.styles.tmp))
    .pipe(reload({ stream: true }));
});

gulp.task('scripts', () => {
  return gulp.src(paths.scripts.input)
    .pipe($.plumber())
    .pipe($.babel())
    .pipe($.sourcemaps.write('.'))
    // .pipe($.uglify())
    .pipe(gulp.dest(paths.scripts.tmp))
    .pipe(reload({ stream: true }));
});

gulp.task('fileinclude', () => {
  return gulp.src(paths.html.input)
    .pipe($.plumber())
    .pipe(fileinclude())
    .pipe(gulp.dest(paths.html.tmp))
    .pipe(browserSync.stream());
});

function lint(files) {
  return gulp.src(files)
    .pipe($.eslint({ fix: true }))
    .pipe(reload({ stream: true, once: true }))
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()));
}

gulp.task('lint', () => {
  return lint(paths.scripts.input)
    .pipe($.plumber())
    .pipe($.eslint({
      extends: "airbnb"
    }))
    .pipe($.eslint.format())
    .pipe(reload({ stream: true }));
});
gulp.task('lint:test', () => {
  return lint(paths.scripts.input)
    .pipe(gulp.dest('test/spec'));
});

gulp.task('html', ['styles', 'scripts'], () => {
  return gulp.src(paths.html.input)
    .pipe($.if('*.html', fileinclude()))
    .pipe($.useref({ searchPath: ['.tmp', 'app', '.'] }))
    .pipe($.if('*.css', $.cssnano({ safe: true, autoprefixer: false })))
    .pipe(gulp.dest(paths.html.output));
});

gulp.task('images', () => {
  return gulp.src(paths.images.input)
    .pipe(gulp.dest(paths.images.output));
});

gulp.task('fonts', () => {
  return gulp.src(paths.fonts.input)
    .pipe($.if(dev, gulp.dest(paths.fonts.tmp), gulp.dest(paths.fonts.output)));
});

gulp.task('favicons', () => {
  return gulp.src(require('main-bower-files')('**/*.{jpeg,jpg,png,svg,gif,ico}', function(err) {
  })
    .concat(paths.favicons.input))
    .pipe($.if(dev, gulp.dest(paths.favicons.tmp), gulp.dest(paths.favicons.output)));
});


gulp.task('extras', () => {
  return gulp.src([
    'app/*',
    '!app/**/*.html'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('serve', () => {
  runSequence(['clean'], ['fileinclude', 'styles', 'scripts', 'fonts', 'favicons'], function() {
    browserSync.init({
      notify: false,
      port: 9000,
      server: {
        baseDir: ['.tmp', 'app'],
        routes: {
          '/node_modules': 'node_modules'
        }
      }
    });

    gulp.watch(paths.html.input, ['fileinclude']);
    gulp.watch(paths.scripts.input, ['fileinclude', 'scripts']);

    gulp.watch([
      paths.html.input,
      paths.images.input,
      paths.fonts.input
    ]).on('change', reload);

    gulp.watch(paths.styles.input, ['styles']);
    gulp.watch(paths.fonts.input, ['fonts']);
  });
});

gulp.task('serve:dist', ['default'], () => {
  browserSync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist']
    }
  });
});

gulp.task('serve:test', ['scripts'], () => {
  browserSync.init({
    notify: false,
    port: 9000,
    ui: false,
    server: {
      baseDir: 'test',
      routes: {
        '/scripts': paths.scripts.tmp,
        '/node_modules': 'node_modules'
      }
    }
  });

  gulp.watch(paths.scripts.tmp, ['scripts']);
  gulp.watch(['test/spec/**/*.js', 'test/index.html']).on('change', reload);
  gulp.watch('test/spec/**/*.js', ['lint:test']);
});

gulp.task('build', ['lint', 'html', 'images', 'fonts', 'favicons', 'extras'], function() {
  return gulp.src('dist/**/*').pipe($.size({ title: 'build', gzip: true }));
});

gulp.task('default', ['fileinclude'], function() {
  return new Promise(function(resolve) {
    dev = false;
    runSequence(['clean'], 'build', resolve);
  });
});
